from venv import logger
from rest_framework import viewsets, generics
from rest_framework.request import Request
from datetime import datetime
from django.utils import timezone
import json
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from .models import Organization, Client, TaskCategory, Task, TimeEntry, Expense, ClientProfitability, Profile, AutoTimeTracking, WorkflowStep
from .serializers import (ClientSerializer, TaskCategorySerializer, TaskSerializer,
                         TimeEntrySerializer, ExpenseSerializer, ClientProfitabilitySerializer,
                         ProfileSerializer, AutoTimeTrackingSerializer, OrganizationSerializer)
from .models import NLPProcessor, WorkflowDefinition, TaskApproval
from django.contrib.auth.models import User
from .serializers import UserSerializer, NLPProcessorSerializer, WorkflowDefinitionSerializer, WorkflowStepSerializer, TaskApprovalSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .utils import update_profitability_for_period, update_current_month_profitability
from django.db.models import Q
from django.conf import settings
import requests
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum, Count, Avg
import logging
from .constants.prompts import GEMINI_TIME_EXTRACTION_PROMPT
from .services.gemini_service import GeminiService
from django.db.models import Q
from .services.data_service import DataService

logger = logging.getLogger(__name__)

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user) 

class AutoTimeTrackingViewSet(viewsets.ModelViewSet):
    serializer_class = AutoTimeTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AutoTimeTracking.objects.filter(user=self.request.user).order_by('-start_time')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
   
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            # Apply filters if provided
            queryset = Client.objects.all()
            is_active = self.request.query_params.get('is_active')
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active == 'true')
            
            # Organization check
            if not profile.organization:
                return Client.objects.none()
                
            # Aplicando permissões granulares
            if profile.is_org_admin:
                # Administradores veem todos os clientes da organização
                return queryset.filter(organization=profile.organization)
            elif profile.can_view_all_clients:
                # Usuários com permissão para ver todos os clientes
                return queryset.filter(organization=profile.organization)
            else:
                # Outros usuários só veem clientes explicitamente concedidos
                return profile.visible_clients.all().filter(id__in=queryset)
                
        except Profile.DoesNotExist:
            return Client.objects.none()
    
    def perform_create(self, serializer):
        # Verificar se o usuário tem permissão para criar clientes
        try:
            profile = Profile.objects.get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_clients):
                raise PermissionDenied("Você não tem permissão para criar clientes")
                
            # Set the organization based on the user's profile
            if profile.organization:
                serializer.save(organization=profile.organization)
            else:
                raise PermissionDenied("Usuário não pertence a nenhuma organização")
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")

    def update(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para editar clientes
        try:
            profile = Profile.objects.get(user=request.user)
            client = self.get_object()
            
            if not (profile.is_org_admin or profile.can_edit_clients):
                raise PermissionDenied("Você não tem permissão para editar clientes")
                
            # Verificar se o cliente pertence à mesma organização
            if client.organization != profile.organization:
                raise PermissionDenied("Este cliente não pertence à sua organização")
                
            # Para usuários que não podem ver todos os clientes, verificar se têm acesso a este cliente
            if not (profile.is_org_admin or profile.can_view_all_clients):
                if not profile.visible_clients.filter(id=client.id).exists():
                    raise PermissionDenied("Você não tem acesso a este cliente")
            
            return super().update(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")

    def destroy(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para excluir clientes
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_delete_clients):
                raise PermissionDenied("Você não tem permissão para excluir clientes")
                
            return super().destroy(request, *args, **kwargs)
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        """
        Alterna o status de ativo/inativo de um cliente
        """
        client = self.get_object()
        
        # Verificar se o usuário tem permissão para alterar o status do cliente
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_change_client_status):
                raise PermissionDenied("Você não tem permissão para alterar o status do cliente")
                
            # Alternar o status
            client.is_active = not client.is_active
            client.save()
            
            serializer = self.get_serializer(client)
            return Response(serializer.data)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
        
class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            # Base queryset
            base_queryset = Task.objects.all()
            
            # Apply filters if provided
            status_param = self.request.query_params.get('status')
            if status_param:
                status_values = status_param.split(',')
                base_queryset = base_queryset.filter(status__in=status_values)
                
            # Filter by client if provided
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
            
            # Filter overdue tasks if requested
            overdue_param = self.request.query_params.get('overdue')
            if overdue_param and overdue_param.lower() == 'true':
                today = timezone.now()
                base_queryset = base_queryset.filter(deadline__lt=today.date())
                
            # Filter by deadline
            due_param = self.request.query_params.get('due')
            if due_param:
                today = timezone.now().date()
                if due_param == 'today':
                    base_queryset = base_queryset.filter(deadline__date=today)
                elif due_param == 'this-week':
                    # Calculate first and last day of current week
                    week_start = today - timezone.timedelta(days=today.weekday())
                    week_end = week_start + timezone.timedelta(days=6)
                    base_queryset = base_queryset.filter(deadline__date__range=[week_start, week_end])
            
            # Verificar organização
            if not profile.organization:
                return Task.objects.none()
                
            # Apply permission-based filtering
            if profile.is_org_admin:
                # Admins see all tasks in their organization
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return Task.objects.none()
            elif profile.can_view_all_tasks:
                # Users with permission to view all tasks
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return Task.objects.none()
            else:
                # Regular users only see tasks for their visible clients or assigned to them
                visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                return base_queryset.filter(
                    Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            return Task.objects.none()
    
    def perform_create(self, serializer):
        # Verificar se o usuário tem permissão para criar tarefas
        try:
            profile = Profile.objects.get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_tasks):
                raise PermissionDenied("Você não tem permissão para criar tarefas")
                
            # Verificar se o cliente selecionado está acessível para o usuário
            client_id = self.request.data.get('client')
            if client_id:
                client = Client.objects.get(id=client_id)
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso a este cliente")
            
            # Criar a tarefa
            serializer.save(created_by=self.request.user)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
        except Client.DoesNotExist:
            raise PermissionDenied("Cliente não encontrado")
            
    def update(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para editar esta tarefa
        try:
            profile = Profile.objects.get(user=request.user)
            task = self.get_object()
            
            can_edit = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or 
                (profile.can_edit_assigned_tasks and task.assigned_to == request.user)
            )
            
            if not can_edit:
                raise PermissionDenied("Você não tem permissão para editar esta tarefa")
                
            # Verificar se o novo cliente (se fornecido) está acessível para o usuário
            client_id = request.data.get('client')
            if client_id and str(task.client.id) != client_id:
                client = Client.objects.get(id=client_id)
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso ao cliente selecionado")
            
            return super().update(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
            
    def destroy(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para excluir tarefas
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_delete_tasks):
                raise PermissionDenied("Você não tem permissão para excluir tarefas")
                
            return super().destroy(request, *args, **kwargs)
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
            
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        Atualiza o status de uma tarefa
        """
        task = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {"error": "Status é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar permissões
        try:
            profile = Profile.objects.get(user=request.user)
            
            # Verificar se o usuário pode editar esta tarefa
            can_edit = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or 
                (profile.can_edit_assigned_tasks and task.assigned_to == request.user)
            )
            
            if not can_edit:
                raise PermissionDenied("Você não tem permissão para atualizar o status desta tarefa")
            
            # Atualizar o status
            task.status = new_status
            
            # Se o status é "completed", registrar a data de conclusão
            if new_status == 'completed':
                task.completed_at = timezone.now()
            elif task.status == 'completed':
                task.completed_at = None
                
            task.save()
            
            serializer = self.get_serializer(task)
            return Response(serializer.data)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
             
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            # Base queryset
            base_queryset = TimeEntry.objects.all()
            
            # Filter by date range if provided
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date and end_date:
                base_queryset = base_queryset.filter(date__range=[start_date, end_date])
                
            # Filter by client if provided
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
                
            # Filter by user if provided
            user_id = self.request.query_params.get('user')
            if user_id:
                base_queryset = base_queryset.filter(user_id=user_id)
            
            # Apply permission-based filtering
            if profile.is_org_admin:
                # Admins can see all time entries in the organization
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return TimeEntry.objects.none()
            elif profile.can_view_team_time:
                # Users with permission to view team time
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return TimeEntry.objects.none()
            else:
                # Regular users only see time entries for their visible clients or their own entries
                visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                return base_queryset.filter(
                    Q(client_id__in=visible_client_ids) | Q(user=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            # If no profile, only show the user's own entries
            return TimeEntry.objects.filter(user=user)
    
    def perform_create(self, serializer):
        # Verificar se o usuário tem permissão para registrar tempo
        try:
            profile = Profile.objects.get(user=self.request.user)
            
            if not profile.can_log_time:
                raise PermissionDenied("Você não tem permissão para registrar tempo")
                
            # Verificar se o cliente está acessível para o usuário
            client_id = self.request.data.get('client')
            if client_id:
                client = Client.objects.get(id=client_id)
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso a este cliente")
            
            # Salvar o time entry
            time_entry = serializer.save(user=self.request.user)
            
            # Atualizar status da tarefa se especificado
            self._update_task_status_if_needed(time_entry)
            
        except Profile.DoesNotExist:
            # Se não houver perfil, permitir apenas para o próprio usuário
            time_entry = serializer.save(user=self.request.user)
            self._update_task_status_if_needed(time_entry)
        except Client.DoesNotExist:
            raise PermissionDenied("Cliente não encontrado")

    def _update_task_status_if_needed(self, time_entry):
        """Atualiza o status da tarefa baseado na configuração do time entry"""
        if time_entry.task and time_entry.task_status_after != 'no_change':
            old_status = time_entry.task.status
            time_entry.task.status = time_entry.task_status_after
            
            # Se mudou para completed, definir completed_at
            if time_entry.task_status_after == 'completed':
                time_entry.task.completed_at = timezone.now()
            elif old_status == 'completed' and time_entry.task_status_after != 'completed':
                time_entry.task.completed_at = None
                
            time_entry.task.save()
            
            logger.info(f"Status da tarefa {time_entry.task.title} alterado de {old_status} para {time_entry.task_status_after}")
    
    def update(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para editar este registro de tempo
        try:
            profile = Profile.objects.get(user=request.user)
            time_entry = self.get_object()
            
            # Verificar permissões específicas
            can_edit = (
                profile.is_org_admin or 
                profile.can_edit_all_time or 
                (profile.can_edit_own_time and time_entry.user == request.user)
            )
            
            if not can_edit:
                raise PermissionDenied("Você não tem permissão para editar este registro de tempo")
                
            # Verificar se o novo cliente (se fornecido) está acessível para o usuário
            client_id = request.data.get('client')
            if client_id and str(time_entry.client.id) != client_id:
                client = Client.objects.get(id=client_id)
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso ao cliente selecionado")
                    
            return super().update(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            # Se não houver perfil, permitir editar apenas registros próprios
            time_entry = self.get_object()
            if time_entry.user != request.user:
                raise PermissionDenied("Você só pode editar seus próprios registros de tempo")
                
            return super().update(request, *args, **kwargs)
            
    def destroy(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para excluir este registro de tempo
        try:
            profile = Profile.objects.get(user=request.user)
            time_entry = self.get_object()
            
            # Verificar permissões específicas
            can_delete = (
                profile.is_org_admin or 
                profile.can_edit_all_time or 
                (profile.can_edit_own_time and time_entry.user == request.user)
            )
            
            if not can_delete:
                raise PermissionDenied("Você não tem permissão para excluir este registro de tempo")
                
            return super().destroy(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            # Se não houver perfil, permitir excluir apenas registros próprios
            time_entry = self.get_object()
            if time_entry.user != request.user:
                raise PermissionDenied("Você só pode excluir seus próprios registros de tempo")
                
            return super().destroy(request, *args, **kwargs)
            
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Cria múltiplos registros de tempo de uma vez
        """
        entries_data = request.data.get('entries', [])
        
        if not entries_data:
            return Response(
                {"error": "Nenhum registro de tempo fornecido"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verificar se o usuário tem permissão para registrar tempo
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not profile.can_log_time:
                raise PermissionDenied("Você não tem permissão para registrar tempo")
                
            # Processar os registros
            created_entries = []
            
            for entry_data in entries_data:
                # Definir o usuário atual para o registro
                entry_data['user'] = request.user.id
                
                # Verificar acesso ao cliente
                client_id = entry_data.get('client')
                if client_id:
                    client = Client.objects.get(id=client_id)
                    if not profile.can_access_client(client):
                        return Response(
                            {"error": f"Sem acesso ao cliente com ID {client_id}"}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
                
                # Criar o registro
                serializer = self.get_serializer(data=entry_data)
                serializer.is_valid(raise_exception=True)
                serializer.save(user=request.user)
                created_entries.append(serializer.data)
                
            return Response(
                created_entries, 
                status=status.HTTP_201_CREATED
            )
            
        except Profile.DoesNotExist:
            # Se não houver perfil, criar da mesma forma
            created_entries = []
            
            for entry_data in entries_data:
                entry_data['user'] = request.user.id
                serializer = self.get_serializer(data=entry_data)
                serializer.is_valid(raise_exception=True)
                serializer.save(user=request.user)
                created_entries.append(serializer.data)
                
            return Response(
                created_entries, 
                status=status.HTTP_201_CREATED
            )
        except Client.DoesNotExist:
            return Response(
                {"error": "Cliente não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
               
class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Expense.objects.all()
        # Filter by date range if provided
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        # Filter by client if provided
        client_id = self.request.GET.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ClientProfitabilityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientProfitabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            # Check permission to view profitability data
            if not (profile.is_org_admin or profile.can_view_profitability):
                return ClientProfitability.objects.none()
            
            base_queryset = ClientProfitability.objects.all()
            
            # Filter by year/month if provided
            year = self.request.query_params.get('year')
            month = self.request.query_params.get('month')
            if year and month:
                base_queryset = base_queryset.filter(year=year, month=month)
            
            # Filter by client if provided
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
                
            # Filter by profitability if specified
            is_profitable = self.request.query_params.get('is_profitable')
            if is_profitable is not None:
                is_profitable_bool = is_profitable.lower() == 'true'
                base_queryset = base_queryset.filter(is_profitable=is_profitable_bool)
            
            # Apply client visibility filtering
            if profile.organization:
                if profile.is_org_admin or profile.can_view_all_clients:
                    # Admins see all profitability data in the organization
                    return base_queryset.filter(client__organization=profile.organization)
                else:
                    # Regular users only see profitability data for visible clients
                    visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                    return base_queryset.filter(client_id__in=visible_client_ids)
            
            return ClientProfitability.objects.none()
                
        except Profile.DoesNotExist:
            return ClientProfitability.objects.none()
            
class NLPProcessorViewSet(viewsets.ModelViewSet):
    queryset = NLPProcessor.objects.all()
    serializer_class = NLPProcessorSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def process_text(self, request):
        """
        Process natural language text and return extracted information
        """
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        results = NLPProcessor.process_text(text, request.user)
        
        # Format the response
        response_data = {
            'clients': [],
            'categories': [],
            'tasks': [],
            'times': results['times'],
            'activities': results['activities'],
            'confidence': results['confidence']
        }
        
        # Add client information
        for client in results.get('clients', []):
            response_data['clients'].append({
                'id': client.id,
                'name': client.name
            })
            
        # Add category information
        for category in results.get('categories', []):
            response_data['categories'].append({
                'id': category.id,
                'name': category.name
            })

        # Add task information
        for task in results.get('tasks', []):
            response_data['tasks'].append({
                'id': task.id,
                'title': task.title,  # Usando 'title' em vez de 'name' para corresponder ao modelo Task
                'client_id': str(task.client.id) if task.client else None,
                'client_name': task.client.name if task.client else None
            })
            
        return Response(response_data)
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        """
        Create time entries from natural language text
        """
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        task_id = request.data.get('task_id')  # Adicionado para permitir especificar uma tarefa
        date_str = request.data.get('date')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()
            
        try:
            entries = NLPProcessor.create_time_entries_from_text(
                text, request.user, client_id, date, task_id
            )
            
            # Serialize and return the created entries
            serializer = TimeEntrySerializer(entries, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class GeminiNLPViewSet(viewsets.ViewSet):
    """
    ViewSet para processamento de linguagem natural usando o Gemini 2.0.
    Identifica clientes, tarefas e tempo em texto escrito em linguagem natural.
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.gemini_service = GeminiService()

    @action(detail=False, methods=['post'])
    def process_text(self, request):
        """
        Processa texto em linguagem natural para extrair informações de cliente, tarefa e tempo.
        
        Parâmetros:
            - text: O texto em linguagem natural
            - client_id (opcional): ID do cliente padrão caso não seja detectado no texto
            
        Retorna:
            Informações extraídas incluindo clientes, tarefas e tempos identificados.
        """
        text = request.data.get('text', '')
        default_client_id = request.data.get('client_id')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Obter todos os clientes e tarefas do banco de dados
            # Observação: estes já estão serializados como dicionários
            # Obter clientes e tarefas baseado nas permissões do usuário
            # Obter clientes e tarefas com cache
            clients_data = DataService.get_user_clients(request.user)
            tasks_data = DataService.get_user_tasks(request.user)

            if not clients_data and not tasks_data:
                return Response(
                    {'error': 'Nenhum cliente ou tarefa acessível encontrado'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verificar permissões para alterar status de tarefas
            task_status_after = request.data.get('task_status_after', 'no_change')
            if task_status_after != 'no_change':
                try:
                    profile = Profile.objects.get(user=request.user)
                    
                    if not (profile.is_org_admin or profile.can_edit_assigned_tasks or profile.can_edit_all_tasks):
                        return Response(
                            {'error': 'Você não tem permissão para alterar status de tarefas'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Profile.DoesNotExist:
                    return Response(
                        {'error': 'Perfil de usuário não encontrado'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
            # Adicionar cliente padrão se fornecido
            default_client_data = None
            if default_client_id:
                try:
                    default_client = Client.objects.get(id=default_client_id)
                    default_client_data = ClientSerializer(default_client).data
                except Client.DoesNotExist:
                    pass
            
            # Chamar a API do Gemini
            extracted_info = self.gemini_service.process_text(
                text=text,
                clients=clients_data,
                tasks=tasks_data,
                default_client=default_client_data
            )
            
            if not extracted_info.get('success', False):
                return Response(
                    {'error': extracted_info.get('error', 'Failed to process text')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Processar os resultados
            response_data = {
                'clients': [],
                'tasks': [],
                'times': [],
                'activities': [],
                'categories': [],
                'confidence': 0.0
            }
            
            # Processar clientes
            for client_info in extracted_info.get('clients', []):
                client_id = client_info.get('id')
                client_name = client_info.get('name')
                if client_id and client_name:
                    response_data['clients'].append({
                        'id': client_id,
                        'name': client_name
                    })
            
            # Processar tarefas
            for task_info in extracted_info.get('tasks', []):
                task_id = task_info.get('id')
                task_title = task_info.get('title')
                client_id = task_info.get('client_id')
                if task_id and task_title:
                    response_data['tasks'].append({
                        'id': task_id,
                        'title': task_title,
                        'client_id': client_id,
                        'client_name': self._get_client_name_by_id(client_id, extracted_info.get('clients', []))
                    })
            
            # Processar tempos
            for time_info in extracted_info.get('times', []):
                minutes = time_info.get('minutes')
                if minutes and isinstance(minutes, (int, float)):
                    response_data['times'].append(int(minutes))
            
            # Processar atividades
            for activity_info in extracted_info.get('activities', []):
                description = activity_info.get('description')
                if description:
                    response_data['activities'].append(description)
            
            # Calcular confiança geral
            confidences = []
            for item_type in ['clients', 'tasks', 'times', 'activities']:
                for item in extracted_info.get(item_type, []):
                    if 'confidence' in item:
                        confidences.append(item['confidence'])
            
            if confidences:
                response_data['confidence'] = sum(confidences) / len(confidences)
            
            return Response(response_data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_name_by_id(self, client_id, clients_list):
        """Função auxiliar para obter o nome do cliente pelo ID"""
        if not client_id:
            return None
        
        for client in clients_list:
            if client.get('id') == client_id:
                return client.get('name')
        
        return None
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        """
        Cria entradas de tempo baseadas no texto em linguagem natural.
        
        Parâmetros:
            - text: O texto em linguagem natural
            - client_id (opcional): ID do cliente padrão caso não seja detectado no texto
            - date (opcional): Data para as entradas, formato YYYY-MM-DD
            - task_id (opcional): ID da tarefa padrão
            
        Retorna:
            Entradas de tempo criadas.
        """
        from datetime import datetime
        from django.utils import timezone
        
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        task_id = request.data.get('task_id')
        date_str = request.data.get('date')
        task_status_after = request.data.get('task_status_after', 'no_change')  # ADICIONAR ESTA LINHA

        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar formato da data
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()
        
        # Processar o texto primeiro para extrair informações
        process_response = self.process_text(request)
        
        if process_response.status_code != 200:
            return process_response
        
        extracted_data = process_response.data
        
        # Criar entradas de tempo
        created_entries = []
        
        # Priorizar tarefa fornecida na requisição
        selected_task = None
        if task_id:
            try:
                selected_task = Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                pass
        
        # Selecionar cliente
        selected_client = None
        if extracted_data.get('clients'):
            # Usar o primeiro cliente encontrado no texto
            client_info = extracted_data['clients'][0]
            try:
                selected_client = Client.objects.get(id=client_info['id'])
            except Client.DoesNotExist:
                pass
        elif client_id:
            # Usar cliente fornecido como fallback
            try:
                selected_client = Client.objects.get(id=client_id)
            except Client.DoesNotExist:
                pass
        # Verificar se o usuário tem permissão para registrar tempo
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not profile.can_log_time:
                return Response(
                    {'error': 'Você não tem permissão para registrar tempo'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Perfil de usuário não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar se o usuário tem acesso ao cliente selecionado
        if selected_client:
            if not (profile.is_org_admin or profile.can_view_all_clients):
                if not profile.visible_clients.filter(id=selected_client.id).exists():
                    return Response(
                        {'error': 'Você não tem acesso a este cliente'},
                        status=status.HTTP_403_FORBIDDEN
                    )
       
        # Selecionar tempo
        minutes_spent = 60  # Default: 1 hora
        if extracted_data.get('times'):
            minutes_spent = extracted_data['times'][0]
        
        # Selecionar descrição
        description = text
        if extracted_data.get('activities'):
            description = extracted_data['activities'][0]
        
        # Se não temos uma tarefa selecionada mas temos tarefas identificadas
        if not selected_task and extracted_data.get('tasks'):
            task_info = extracted_data['tasks'][0]
            try:
                selected_task = Task.objects.get(id=task_info['id'])
            except Task.DoesNotExist:
                pass
        
        # Buscar categoria se disponível
        category = None
        if selected_task and selected_task.category:
            category = selected_task.category
        
        # Criar a entrada de tempo
        entry = TimeEntry.objects.create(
            user=request.user,
            client=selected_client,
            task=selected_task,
            category=category,
            minutes_spent=minutes_spent,
            description=description,
            date=date,
            original_text=text,
            task_status_after=task_status_after  # ADICIONAR ESTA LINHA
        )

        created_entries.append(entry)
        # Log da criação para auditoria
        logger.info(f"Time entry created via NLP: User {request.user.username}, "
                f"Client {selected_client.name}, Minutes {minutes_spent}, Date {date}")
        # Atualizar status da tarefa se necessário
        if selected_task and task_status_after != 'no_change':
            old_status = selected_task.status
            selected_task.status = task_status_after
            
            if task_status_after == 'completed':
                selected_task.completed_at = timezone.now()
            elif old_status == 'completed' and task_status_after != 'completed':
                selected_task.completed_at = None
                
            selected_task.save()
            
            logger.info(f"Status da tarefa {selected_task.title} alterado de {old_status} para {task_status_after} via NLP")

        # Serializar e retornar as entradas criadas
        serializer = TimeEntrySerializer(created_entries, many=True)
        # Invalidar cache após criar entrada de tempo
        DataService.invalidate_user_cache(request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
              
class WorkflowDefinitionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowDefinition.objects.all()
    serializer_class = WorkflowDefinitionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Aplicar filtragem com base no status, se fornecido
        queryset = WorkflowDefinition.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active == 'true')
        return queryset
    
    def perform_create(self, serializer):
        # Verificar se o usuário tem permissão para criar workflows
        try:
            profile = Profile.objects.get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_workflows):
                raise PermissionDenied("Você não tem permissão para criar workflows")
                
            serializer.save(created_by=self.request.user)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
    
    def update(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para editar workflows
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_edit_workflows):
                raise PermissionDenied("Você não tem permissão para editar workflows")
                
            return super().update(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
    
    def destroy(self, request, *args, **kwargs):
        # Verificar se o usuário tem permissão para excluir workflows
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_edit_workflows):
                raise PermissionDenied("Você não tem permissão para excluir workflows")
                
            return super().destroy(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
    
    @action(detail=True, methods=['post'])
    def assign_to_task(self, request, pk=None):
        """
        Atribui este workflow a uma tarefa específica
        """
        workflow = self.get_object()
        task_id = request.data.get('task_id')
        
        if not task_id:
            return Response(
                {"error": "ID da tarefa é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verificar permissões
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_assign_workflows):
                raise PermissionDenied("Você não tem permissão para atribuir workflows")
                
            # Buscar a tarefa e o primeiro passo do workflow
            try:
                task = Task.objects.get(id=task_id)
                
                # Verificar se o usuário tem acesso a esta tarefa
                if not profile.can_access_client(task.client):
                    raise PermissionDenied("Você não tem acesso ao cliente desta tarefa")
                    
                # Buscar o primeiro passo do workflow (menor ordem)
                first_step = WorkflowStep.objects.filter(workflow=workflow).order_by('order').first()
                
                if not first_step:
                    return Response(
                        {"error": "Este workflow não possui passos definidos"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # Atribuir workflow e passo inicial à tarefa
                task.workflow = workflow
                task.current_workflow_step = first_step
                task.save()
                
                return Response(
                    {"success": True, "message": "Workflow atribuído com sucesso"}, 
                    status=status.HTTP_200_OK
                )
                
            except Task.DoesNotExist:
                return Response(
                    {"error": "Tarefa não encontrada"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")


class WorkflowStepViewSet(viewsets.ModelViewSet):
    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = WorkflowStep.objects.all()
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            queryset = queryset.filter(workflow=workflow_id)
        return queryset.order_by('workflow', 'order')


class TaskApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = TaskApprovalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TaskApproval.objects.all()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task=task_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)
        
# Adicionar ao views.py existente
class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para visualizar e editar organizações.
    Apenas admins podem criar/atualizar organizações.
    Usuários normais só podem ver sua própria organização.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Se for um superusuário/admin, pode ver todas as organizações
        if user.is_superuser:
            return Organization.objects.all()
            
        # Tentar obter o perfil do usuário
        try:
            profile = Profile.objects.get(user=user)
            
            # Se tiver uma organização associada, retorna essa organização
            if profile.organization:
                return Organization.objects.filter(id=profile.organization.id)
            
            # Caso não tenha organização
            return Organization.objects.none()
                
        except Profile.DoesNotExist:
            return Organization.objects.none()
        
    def apply_role_preset(profile, role_preset):
        """
        Aplica um conjunto predefinido de permissões com base no papel (role) selecionado.
        
        Args:
            profile: Objeto Profile a ser atualizado
            role_preset: String identificando o papel predefinido
        """
        # Resetar todas as permissões especiais para o estado padrão
        # Mantém apenas permissões básicas
        profile.is_org_admin = False
        profile.can_log_time = True
        profile.can_edit_own_time = True
        profile.can_edit_assigned_tasks = True
        
        # Aplicar permissões específicas com base no papel
        if role_preset == "administrador":
            # Administrador: acesso total ao sistema
            profile.is_org_admin = True
            profile.can_manage_clients = True
            profile.can_view_all_clients = True
            profile.can_create_clients = True
            profile.can_edit_clients = True
            profile.can_delete_clients = True
            profile.can_change_client_status = True
            
            profile.can_assign_tasks = True
            profile.can_create_tasks = True
            profile.can_edit_all_tasks = True
            profile.can_delete_tasks = True
            profile.can_view_all_tasks = True
            profile.can_approve_tasks = True
            
            profile.can_edit_all_time = True
            profile.can_view_team_time = True
            
            profile.can_view_client_fees = True
            profile.can_edit_client_fees = True
            profile.can_manage_expenses = True
            profile.can_view_profitability = True
            profile.can_view_team_profitability = True
            profile.can_view_organization_profitability = True
            
            profile.can_view_analytics = True
            profile.can_export_reports = True
            profile.can_create_custom_reports = True
            profile.can_schedule_reports = True
            
            profile.can_create_workflows = True
            profile.can_edit_workflows = True
            profile.can_assign_workflows = True
            profile.can_manage_workflows = True
            
        elif role_preset == "gerente_contabilidade":
            # Gerente de Contabilidade: supervisão de equipe e acesso a métricas
            profile.can_manage_clients = True
            profile.can_view_all_clients = True
            profile.can_create_clients = True
            profile.can_edit_clients = True
            profile.can_change_client_status = True
            
            profile.can_assign_tasks = True
            profile.can_create_tasks = True
            profile.can_edit_all_tasks = True
            profile.can_view_all_tasks = True
            profile.can_approve_tasks = True
            
            profile.can_edit_all_time = True
            profile.can_view_team_time = True
            
            profile.can_view_client_fees = True
            profile.can_edit_client_fees = True
            profile.can_manage_expenses = True
            profile.can_view_profitability = True
            profile.can_view_team_profitability = True
            
            profile.can_view_analytics = True
            profile.can_export_reports = True
            profile.can_schedule_reports = True
            profile.can_manage_workflows = True

            profile.can_assign_workflows = True
            
        elif role_preset == "contador_senior":
            # Contador Senior: gerencia clientes importantes e pode aprovar trabalhos
            profile.can_manage_clients = True
            profile.can_view_all_clients = True
            profile.can_create_clients = True
            profile.can_edit_clients = True
            
            profile.can_assign_tasks = True
            profile.can_create_tasks = True
            profile.can_edit_all_tasks = True
            profile.can_view_all_tasks = True
            profile.can_approve_tasks = True
            
            profile.can_edit_own_time = True
            profile.can_view_team_time = True
            
            profile.can_view_client_fees = True
            profile.can_view_profitability = True
            
            profile.can_view_analytics = True
            profile.can_export_reports = True
            
            profile.can_assign_workflows = True
            profile.can_manage_workflows = True

            
        elif role_preset == "contador":
            # Contador: trabalho contábil regular
            profile.can_view_all_clients = False  # Vê apenas clientes atribuídos
            profile.can_edit_clients = True  # Pode editar informações dos clientes atribuídos
            
            profile.can_create_tasks = True
            profile.can_edit_assigned_tasks = True
            profile.can_view_all_tasks = False  # Vê apenas tarefas relacionadas a seus clientes
            
            profile.can_view_client_fees = True  # Pode ver taxas dos clientes atribuídos
            
            profile.can_view_analytics = False
            profile.can_export_reports = True  # Pode exportar relatórios básicos
            
        elif role_preset == "assistente_contabil":
            # Assistente Contábil: tarefas básicas e entrada de dados
            profile.can_view_all_clients = False  # Vê apenas clientes atribuídos
            
            profile.can_create_tasks = False
            profile.can_edit_assigned_tasks = True
            profile.can_view_all_tasks = False
            
            profile.can_view_client_fees = False
            
            profile.can_view_analytics = False
            profile.can_export_reports = False
            
        elif role_preset == "recursos_humanos":
            # RH: acesso a dados de funcionários e produtividade
            profile.can_view_all_clients = False
            
            profile.can_create_tasks = True
            profile.can_assign_tasks = True
            profile.can_edit_all_tasks = False
            
            profile.can_view_team_time = True
            
            profile.can_view_analytics = True
            profile.can_export_reports = True
            
        elif role_preset == "financeiro":
            # Financeiro: acesso a faturamento e rentabilidade
            profile.can_view_all_clients = True
            
            profile.can_view_client_fees = True
            profile.can_edit_client_fees = True
            profile.can_manage_expenses = True
            profile.can_view_profitability = True
            profile.can_view_team_profitability = True
            profile.can_view_organization_profitability = True
            
            profile.can_view_analytics = True
            profile.can_export_reports = True
            profile.can_create_custom_reports = True
            
        elif role_preset == "administrativo":
            # Recepcionista/Administrativo: acesso básico a clientes e agendamentos
            profile.can_view_all_clients = True  # Pode ver todos os clientes
            profile.can_create_clients = True  # Pode criar novos clientes
            
            profile.can_create_tasks = True  # Pode criar tarefas
            profile.can_assign_tasks = False  # Não pode atribuir tarefas
            
            profile.can_view_analytics = False
        
        # Se nenhum papel predefinido corresponder, não faz alterações além dos padrões
    

    @action(detail=True, methods=['post'])
    def add_member_by_code(self, request, pk=None):
        """
        Adiciona um membro à organização usando o código de convite
        """
        organization = self.get_object()
        
        # Verificar se o utilizador atual é admin desta organização
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para adicionar membros a esta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obter o código de convite
        invitation_code = request.data.get('invitation_code')
        
        if not invitation_code:
            return Response(
                {"error": "Código de convite é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Encontrar o perfil pelo código de convite
        profile = Profile.find_by_invitation_code(invitation_code)
        
        if not profile:
            return Response(
                {"error": "Código de convite inválido ou não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Verificar se já pertence a uma organização
        if profile.organization:
            return Response(
                {"error": "Este utilizador já pertence a uma organização"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Obter dados básicos do perfil
        role = request.data.get('role', 'Membro')
        hourly_rate = request.data.get('hourly_rate', profile.hourly_rate)
        
        # Definir a organização e valores básicos
        profile.organization = organization
        profile.role = role
        profile.hourly_rate = hourly_rate
        
        # Permissões de administração
        profile.is_org_admin = request.data.get('is_admin', False)
        
        # Permissões para gestão de clientes
        profile.can_manage_clients = request.data.get('can_manage_clients', False)
        profile.can_view_all_clients = request.data.get('can_view_all_clients', False)
        profile.can_create_clients = request.data.get('can_create_clients', False)
        profile.can_edit_clients = request.data.get('can_edit_clients', False)
        profile.can_delete_clients = request.data.get('can_delete_clients', False)
        profile.can_change_client_status = request.data.get('can_change_client_status', False)
        
        # Permissões para gestão de tarefas
        profile.can_assign_tasks = request.data.get('can_assign_tasks', False)
        profile.can_create_tasks = request.data.get('can_create_tasks', False)
        profile.can_edit_all_tasks = request.data.get('can_edit_all_tasks', False)
        profile.can_edit_assigned_tasks = request.data.get('can_edit_assigned_tasks', True)  # Por padrão, pode editar suas próprias tarefas
        profile.can_delete_tasks = request.data.get('can_delete_tasks', False)
        profile.can_view_all_tasks = request.data.get('can_view_all_tasks', False)
        profile.can_approve_tasks = request.data.get('can_approve_tasks', False)
        
        # Permissões para gestão de tempo
        profile.can_log_time = request.data.get('can_log_time', True)  # Por padrão, pode registrar seu tempo
        profile.can_edit_own_time = request.data.get('can_edit_own_time', True)  # Por padrão, pode editar seu próprio tempo
        profile.can_edit_all_time = request.data.get('can_edit_all_time', False)
        profile.can_view_team_time = request.data.get('can_view_team_time', False)
        
        # Permissões financeiras
        profile.can_view_client_fees = request.data.get('can_view_client_fees', False)
        profile.can_edit_client_fees = request.data.get('can_edit_client_fees', False)
        profile.can_manage_expenses = request.data.get('can_manage_expenses', False)
        profile.can_view_profitability = request.data.get('can_view_profitability', False)
        profile.can_view_team_profitability = request.data.get('can_view_team_profitability', False)
        profile.can_view_organization_profitability = request.data.get('can_view_organization_profitability', False)
        
        # Permissões de relatórios e análises
        profile.can_view_analytics = request.data.get('can_view_analytics', False)
        profile.can_export_reports = request.data.get('can_export_reports', False)
        profile.can_create_custom_reports = request.data.get('can_create_custom_reports', False)
        profile.can_schedule_reports = request.data.get('can_schedule_reports', False)
        
        # Permissões de workflow
        profile.can_create_workflows = request.data.get('can_create_workflows', False)
        profile.can_edit_workflows = request.data.get('can_edit_workflows', False)
        profile.can_assign_workflows = request.data.get('can_assign_workflows', False)
        profile.can_manage_workflows = request.data.get('can_manage_workflows', False)
        
        # Aplicar papel predefinido (role-based permissions) se fornecido
        role_preset = request.data.get('role_preset')
        if role_preset:
            apply_role_preset(profile, role_preset)
        
        profile.save()
        
        # Adicionar clientes visíveis se especificados
        visible_clients = request.data.get('visible_clients', [])
        if visible_clients and not profile.can_view_all_clients:
            for client_id in visible_clients:
                try:
                    client = Client.objects.get(id=client_id, organization=organization)
                    profile.visible_clients.add(client)
                except Client.DoesNotExist:
                    pass  # Ignorar IDs de cliente inválidos
        
        # Responder com o perfil atualizado
        serializer = ProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Obter todos os membros de uma organização."""
        organization = self.get_object()
        members = Profile.objects.filter(organization=organization)
        serializer = ProfileSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None):
        """Obter todos os clientes de uma organização."""
        organization = self.get_object()
        
        # Get user profile
        profile = Profile.objects.get(user=request.user)
        
        # If admin or can see all clients, return all organization clients
        if profile.is_org_admin or profile.can_view_all_clients:
            clients = Client.objects.filter(organization=organization)
        else:
            # Otherwise only return visible clients
            clients = profile.visible_clients.filter(organization=organization)
            
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remover um membro da organização."""
        organization = self.get_object()
        
        # Verificar se o usuário atual é administrador desta organização
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para remover membros desta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obter o ID do usuário do membro a ser removido
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {"error": "ID do usuário é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar o perfil pelo ID do usuário
        try:
            profile = Profile.objects.get(user_id=user_id, organization=organization)
            
            # Não permitir remover-se a si mesmo se for o único admin
            if profile.user == request.user and profile.is_org_admin:
                admin_count = Profile.objects.filter(
                    organization=organization, 
                    is_org_admin=True
                ).count()
                
                if admin_count <= 1:
                    return Response(
                        {"error": "Não é possível remover o único administrador da organização"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            # Desvincula o perfil da organização, mas não o exclui
            profile.organization = None
            profile.is_org_admin = False
            profile.can_assign_tasks = False
            profile.can_manage_clients = False
            profile.can_view_all_clients = False
            profile.can_view_analytics = False
            profile.can_view_profitability = False
            profile.visible_clients.clear()
            profile.save()
            
            return Response(
                {"success": "Membro removido da organização com sucesso"}, 
                status=status.HTTP_200_OK
            )
            
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Obter todos os membros de uma organização."""
        organization = self.get_object()
        members = Profile.objects.filter(organization=organization)
        serializer = ProfileSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None):
        """Obter todos os clientes de uma organização."""
        organization = self.get_object()
        clients = Client.objects.filter(organization=organization)
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['post'])
    def update_member(self, request, pk=None):
        """Update an existing organization member's permissions."""
        organization = self.get_object()
        
        # Check if requester is admin
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para atualizar membros desta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get user ID from request
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {"error": "ID do usuário é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the member profile by user_id
        try:
            profile = Profile.objects.get(user_id=user_id, organization=organization)
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Campos básicos do perfil
        profile.role = request.data.get('role', profile.role)
        if 'access_level' in request.data:
            profile.access_level = request.data.get('access_level')
        if 'hourly_rate' in request.data:
            profile.hourly_rate = request.data.get('hourly_rate')
        if 'phone' in request.data:
            profile.phone = request.data.get('phone')
        
        # Permissões de administração
        profile.is_org_admin = request.data.get('is_admin', profile.is_org_admin)
        
        # Permissões para gestão de clientes
        profile.can_manage_clients = request.data.get('can_manage_clients', profile.can_manage_clients)
        profile.can_view_all_clients = request.data.get('can_view_all_clients', profile.can_view_all_clients)
        profile.can_create_clients = request.data.get('can_create_clients', profile.can_create_clients)
        profile.can_edit_clients = request.data.get('can_edit_clients', profile.can_edit_clients)
        profile.can_delete_clients = request.data.get('can_delete_clients', profile.can_delete_clients)
        profile.can_change_client_status = request.data.get('can_change_client_status', profile.can_change_client_status)
        
        # Permissões para gestão de tarefas
        profile.can_assign_tasks = request.data.get('can_assign_tasks', profile.can_assign_tasks)
        profile.can_create_tasks = request.data.get('can_create_tasks', profile.can_create_tasks)
        profile.can_edit_all_tasks = request.data.get('can_edit_all_tasks', profile.can_edit_all_tasks)
        profile.can_edit_assigned_tasks = request.data.get('can_edit_assigned_tasks', profile.can_edit_assigned_tasks)
        profile.can_delete_tasks = request.data.get('can_delete_tasks', profile.can_delete_tasks)
        profile.can_view_all_tasks = request.data.get('can_view_all_tasks', profile.can_view_all_tasks)
        profile.can_approve_tasks = request.data.get('can_approve_tasks', profile.can_approve_tasks)
        
        # Permissões para gestão de tempo
        profile.can_log_time = request.data.get('can_log_time', profile.can_log_time)
        profile.can_edit_own_time = request.data.get('can_edit_own_time', profile.can_edit_own_time)
        profile.can_edit_all_time = request.data.get('can_edit_all_time', profile.can_edit_all_time)
        profile.can_view_team_time = request.data.get('can_view_team_time', profile.can_view_team_time)
        
        # Permissões financeiras
        profile.can_view_client_fees = request.data.get('can_view_client_fees', profile.can_view_client_fees)
        profile.can_edit_client_fees = request.data.get('can_edit_client_fees', profile.can_edit_client_fees)
        profile.can_manage_expenses = request.data.get('can_manage_expenses', profile.can_manage_expenses)
        profile.can_view_profitability = request.data.get('can_view_profitability', profile.can_view_profitability)
        profile.can_view_team_profitability = request.data.get('can_view_team_profitability', profile.can_view_team_profitability)
        profile.can_view_organization_profitability = request.data.get('can_view_organization_profitability', profile.can_view_organization_profitability)
        
        # Permissões de relatórios e análises
        profile.can_view_analytics = request.data.get('can_view_analytics', profile.can_view_analytics)
        profile.can_export_reports = request.data.get('can_export_reports', profile.can_export_reports)
        profile.can_create_custom_reports = request.data.get('can_create_custom_reports', profile.can_create_custom_reports)
        profile.can_schedule_reports = request.data.get('can_schedule_reports', profile.can_schedule_reports)
        
        # Permissões de workflow
        profile.can_create_workflows = request.data.get('can_create_workflows', profile.can_create_workflows)
        profile.can_edit_workflows = request.data.get('can_edit_workflows', profile.can_edit_workflows)
        profile.can_assign_workflows = request.data.get('can_assign_workflows', profile.can_assign_workflows)
        profile.can_manage_workflows = request.data.get('can_manage_workflows', profile.can_manage_workflows)
        
        # Gerenciamento de clientes visíveis
        if 'visible_clients' in request.data and not profile.can_view_all_clients:
            profile.visible_clients.clear()  # Clear existing visible clients
            profile.visible_clients.add(*request.data.get('visible_clients', []))
        
        profile.save()
        
        return Response(
            ProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def manage_visible_clients(self, request, pk=None):
        """Add or remove visible clients for a user."""
        organization = self.get_object()
        
        # Check if requester is admin
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para gerenciar clientes visíveis"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get form data
        user_id = request.data.get('user_id')
        client_ids = request.data.get('client_ids', [])
        action = request.data.get('action', 'add')  # Options: 'add', 'remove', 'set'
        
        if not user_id:
            return Response(
                {"error": "ID do perfil é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the member profile
        try:
            profile = Profile.objects.get(user_id=user_id, organization=organization)
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get the clients
        clients = Client.objects.filter(
            organization=organization, 
            id__in=client_ids
        )
        
        if len(clients) != len(client_ids) and client_ids:
            return Response(
                {"error": "Um ou mais clientes não encontrados nesta organização"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update visible clients
        if action == 'add':
            profile.visible_clients.add(*clients)
        elif action == 'remove':
            profile.visible_clients.remove(*clients)
        elif action == 'set':
            profile.visible_clients.set(clients)
        else:
            return Response(
                {"error": "Ação inválida. Use 'add', 'remove' ou 'set'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return Response(
            ProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    Returns summary data for dashboard, filtered according to user permissions.
    """
    user = request.user
    
    try:
        # Get user profile
        profile = Profile.objects.get(user=user)
        
        # Base response dictionary with permissions information
        response_data = {
            # Permissões de administração
            'has_full_access': profile.is_org_admin,
            
            # Permissões para visualização de clientes
            'can_view_all_clients': profile.can_view_all_clients,
            'can_create_clients': profile.can_create_clients,
            'can_edit_clients': profile.can_edit_clients,
            'can_delete_clients': profile.can_delete_clients,
            'can_change_client_status': profile.can_change_client_status,
            
            # Permissões para gestão de tarefas
            'can_assign_tasks': profile.can_assign_tasks,
            'can_create_tasks': profile.can_create_tasks,
            'can_edit_all_tasks': profile.can_edit_all_tasks,
            'can_delete_tasks': profile.can_delete_tasks,
            'can_view_all_tasks': profile.can_view_all_tasks,
            'can_approve_tasks': profile.can_approve_tasks,
            
            # Permissões para gestão de tempo
            'can_log_time': profile.can_log_time,
            'can_edit_own_time': profile.can_edit_own_time,
            'can_edit_all_time': profile.can_edit_all_time,
            'can_view_team_time': profile.can_view_team_time,
            
            # Permissões financeiras
            'can_view_client_fees': profile.can_view_client_fees,
            'can_edit_client_fees': profile.can_edit_client_fees,
            'can_manage_expenses': profile.can_manage_expenses,
            'can_view_profitability': profile.can_view_profitability,
            'can_view_team_profitability': profile.can_view_team_profitability,
            'can_view_organization_profitability': profile.can_view_organization_profitability,
            
            # Permissões de relatórios e análises
            'can_view_analytics': profile.can_view_analytics,
            'can_export_reports': profile.can_export_reports,
            'can_create_custom_reports': profile.can_create_custom_reports,
            'can_schedule_reports': profile.can_schedule_reports,
            
            # Permissões de workflow
            'can_create_workflows': profile.can_create_workflows,
            'can_edit_workflows': profile.can_edit_workflows,
            'can_assign_workflows': profile.can_assign_workflows,
            'can_manage_workflows': profile.can_manage_workflows,
        }
        
        # Calculate today and recent dates
        today = timezone.now().date()
        seven_days_ago = today - timezone.timedelta(days=7)
        
        # Get organization ID if user belongs to one
        org_id = profile.organization.id if profile.organization else None
        
        # Clients data - filtered by permissions
        if profile.is_org_admin or profile.can_view_all_clients:
            # User can see all clients in their organization
            clients_queryset = Client.objects.filter(organization=org_id)
        else:
            # User can only see assigned clients
            clients_queryset = profile.visible_clients.all()
            
        response_data['active_clients'] = clients_queryset.filter(is_active=True).count()
        
        # Tasks data - filtered by permissions
        if profile.is_org_admin or profile.can_view_all_tasks:
            # User can see all tasks in the organization
            tasks_queryset = Task.objects.filter(client__organization=org_id)
        else:
            # User can only see tasks for visible clients or assigned to them
            visible_client_ids = clients_queryset.values_list('id', flat=True)
            tasks_queryset = Task.objects.filter(
                Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
            ).distinct()
        
        response_data['active_tasks'] = tasks_queryset.exclude(status='completed').count()
        response_data['overdue_tasks'] = tasks_queryset.filter(
            status='pending',
            deadline__lt=today
        ).count()
        response_data['today_tasks'] = tasks_queryset.filter(
            deadline__date=today
        ).count()
        response_data['completed_tasks_week'] = tasks_queryset.filter(
            status='completed',
            completed_at__gte=seven_days_ago
        ).count()
        
        # Time entries data - filtered by permissions
        if profile.is_org_admin or profile.can_view_team_time:
            # User can see all time entries in the organization
            time_entries = TimeEntry.objects.filter(client__organization=org_id)
        else:
            # User can only see time entries for visible clients or their own entries
            visible_client_ids = clients_queryset.values_list('id', flat=True)
            time_entries = TimeEntry.objects.filter(
                Q(client_id__in=visible_client_ids) | Q(user=user)
            ).distinct()
        
        response_data['time_tracked_today'] = time_entries.filter(
            date=today
        ).aggregate(total=Sum('minutes_spent'))['total'] or 0
        
        response_data['time_tracked_week'] = time_entries.filter(
            date__gte=seven_days_ago,
            date__lte=today
        ).aggregate(total=Sum('minutes_spent'))['total'] or 0
        
        # Incluir dados de rentabilidade se o usuário tiver permissão
        if profile.can_view_profitability or profile.can_view_team_profitability or profile.can_view_organization_profitability:
            # Determinar a visibilidade de clientes para rentabilidade
            if profile.is_org_admin or profile.can_view_organization_profitability:
                # Ver rentabilidade de toda a organização
                profitability_clients = Client.objects.filter(organization=org_id)
            elif profile.can_view_team_profitability:
                # Ver rentabilidade de equipe (clientes associados a usuários de mesma função)
                team_user_ids = Profile.objects.filter(
                    organization=profile.organization,
                    role=profile.role
                ).values_list('user', flat=True)
                profitability_clients = Client.objects.filter(
                    Q(organization=org_id),
                    Q(account_manager__in=team_user_ids)
                )
            else:
                # Ver rentabilidade apenas dos próprios clientes
                visible_client_ids = clients_queryset.values_list('id', flat=True)
                profitability_clients = Client.objects.filter(id__in=visible_client_ids)
            
            # Buscar dados de rentabilidade
            profitability_data = ClientProfitability.objects.filter(
                client_id__in=profitability_clients.values_list('id', flat=True)
            )
            
            # Contagem de clientes não rentáveis
            response_data['unprofitable_clients'] = profitability_data.filter(
                is_profitable=False
            ).count()
            
            # Dados agregados de rentabilidade
            profit_stats = profitability_data.aggregate(
                total_revenue=Sum('monthly_fee'),
                total_cost=Sum('time_cost') + Sum('total_expenses'),
                total_profit=Sum('profit')
            )
            
            if profit_stats['total_revenue']:
                response_data['total_revenue'] = profit_stats['total_revenue']
                response_data['total_cost'] = profit_stats['total_cost']
                response_data['total_profit'] = profit_stats['total_profit']
                
                # Calcular margem de lucro média
                avg_margin = profitability_data.exclude(profit_margin=None).aggregate(
                    avg=Avg('profit_margin')
                )['avg']
                response_data['average_profit_margin'] = avg_margin or 0
        
        # Dados de workflows se o usuário tiver permissão relacionada
        if profile.can_create_workflows or profile.can_edit_workflows or profile.can_assign_workflows:
            response_data['active_workflows'] = WorkflowDefinition.objects.filter(
                is_active=True
            ).count()
            
            # Tarefas com workflows ativos
            response_data['tasks_with_workflows'] = tasks_queryset.exclude(
                workflow=None
            ).count()
            
            # Tarefas aguardando aprovação se o usuário pode aprovar
            if profile.can_approve_tasks:
                tasks_needing_approval = tasks_queryset.filter(
                    Q(current_workflow_step__requires_approval=True)
                ).exclude(
                    id__in=TaskApproval.objects.filter(
                        task__in=tasks_queryset,
                        approved=True
                    ).values_list('task', flat=True)
                )
                
                response_data['tasks_needing_approval'] = tasks_needing_approval.count()
        
        return Response(response_data)
        
    except Profile.DoesNotExist:
        # Resposta básica para usuários sem perfil
        return Response({
            'error': 'User profile not found',
            'has_full_access': False,
            'can_view_analytics': False,
            'can_view_profitability': False,
        })