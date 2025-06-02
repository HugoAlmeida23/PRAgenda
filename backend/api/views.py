import logging
logger = logging.getLogger(__name__)
from rest_framework import viewsets, generics
from rest_framework.request import Request
from datetime import datetime
from django.utils import timezone
import json
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from .models import (Organization, Client, TaskCategory, Task, TimeEntry, Expense, 
                    ClientProfitability, Profile, AutoTimeTracking, WorkflowStep,
                    NLPProcessor, WorkflowDefinition, TaskApproval, WorkflowNotification, 
                    WorkflowHistory)
from .serializers import (ClientSerializer, TaskCategorySerializer, TaskSerializer,
                         TimeEntrySerializer, ExpenseSerializer, ClientProfitabilitySerializer,
                         ProfileSerializer, AutoTimeTrackingSerializer, OrganizationSerializer,
                         UserSerializer, NLPProcessorSerializer, WorkflowDefinitionSerializer, 
                         WorkflowStepSerializer, TaskApprovalSerializer, WorkflowNotificationSerializer,
                         WorkflowHistorySerializer)
from django.contrib.auth.models import User
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .utils import update_profitability_for_period, update_current_month_profitability
from django.db.models import Q, Prefetch
from django.conf import settings
import requests
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum, Count, Avg
import logging
from .constants.prompts import GEMINI_TIME_EXTRACTION_PROMPT
from .services.gemini_service import GeminiService
from django.db.models import Q, Prefetch, Sum, Count, Avg  # FIXED: Added Sum, Count, Avg importfrom .services.data_service import DataService
from django.db import models

logger = logging.getLogger(__name__)

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Profile.objects.select_related(
            'user',
            'organization'
        ).prefetch_related(
            'visible_clients__organization',
            'visible_clients__account_manager'
        ).filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AutoTimeTrackingViewSet(viewsets.ModelViewSet):
    serializer_class = AutoTimeTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AutoTimeTracking.objects.select_related(
            'user'
        ).filter(user=self.request.user).order_by('-start_time')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
   
    def get_queryset(self):
        user = self.request.user
        
        try:
            # ✅ OTIMIZADO: Uma única query para o profile com organização
            profile = Profile.objects.select_related(
                'organization'
            ).prefetch_related(
                'visible_clients__organization',
                'visible_clients__account_manager'
            ).get(user=user)
            
            # Apply filters if provided
            # ✅ OTIMIZADO: Base queryset com todas as relações necessárias
            queryset = Client.objects.select_related(
                'organization',
                'account_manager'
            ).prefetch_related(
                # Prefetch tarefas relacionadas para evitar N+1 em relatórios
                Prefetch(
                    'tasks',
                    queryset=Task.objects.select_related(
                        'category',
                        'assigned_to'
                    ).filter(status__in=['pending', 'in_progress'])
                ),
                # Prefetch registros de tempo recentes
                Prefetch(
                    'time_entries',
                    queryset=TimeEntry.objects.select_related(
                        'user',
                        'task',
                        'category'
                    ).order_by('-date')
                ),
                # Prefetch dados de rentabilidade
                'profitability_records'
            )
            
            is_active = self.request.query_params.get('is_active')
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active == 'true')
            
            # Organization check
            if not profile.organization:
                return Client.objects.none()
                
            # Aplicando permissões granulares
            if profile.is_org_admin:
                return queryset.filter(organization=profile.organization)
            elif profile.can_view_all_clients:
                return queryset.filter(organization=profile.organization)
            else:
                # ✅ OTIMIZADO: Usar prefetch já carregado
                visible_client_ids = [c.id for c in profile.visible_clients.all()]
                return queryset.filter(id__in=visible_client_ids)
                
        except Profile.DoesNotExist:
            return Client.objects.none()
    
    def perform_create(self, serializer):
        try:
            # ✅ OTIMIZADO: select_related para organização
            profile = Profile.objects.select_related('organization').get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_clients):
                raise PermissionDenied("Você não tem permissão para criar clientes")
                
            if profile.organization:
                serializer.save(organization=profile.organization)
            else:
                raise PermissionDenied("Usuário não pertence a nenhuma organização")
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")

    def update(self, request, *args, **kwargs):
        try:
            # ✅ OTIMIZADO: select_related para organização
            profile = Profile.objects.select_related('organization').get(user=request.user)
            client = self.get_object()
            
            if not (profile.is_org_admin or profile.can_edit_clients):
                raise PermissionDenied("Você não tem permissão para editar clientes")
                
            if client.organization != profile.organization:
                raise PermissionDenied("Este cliente não pertence à sua organização")
                
            # Para usuários que não podem ver todos os clientes
            if not (profile.is_org_admin or profile.can_view_all_clients):
                # ✅ OTIMIZADO: Usar exists() em vez de filter().exists()
                if not profile.visible_clients.filter(id=client.id).exists():
                    raise PermissionDenied("Você não tem acesso a este cliente")
            
            return super().update(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")

    def destroy(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_delete_clients):
                raise PermissionDenied("Você não tem permissão para excluir clientes")
                
            return super().destroy(request, *args, **kwargs)
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        client = self.get_object()
        
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_change_client_status):
                raise PermissionDenied("Você não tem permissão para alterar o status do cliente")
                
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
            # ✅ OTIMIZADO: Uma query para profile com organização
            profile = Profile.objects.select_related('organization').get(user=user)
            
            # ✅ OTIMIZADO: Base queryset com todas as relações
            base_queryset = Task.objects.select_related(
                'client__organization',
                'client__account_manager',
                'category',
                'assigned_to',
                'created_by',
                'workflow',
                'current_workflow_step'
            ).prefetch_related(
                # Prefetch time entries para cálculos de tempo gasto
                Prefetch(
                    'time_entries',
                    queryset=TimeEntry.objects.select_related('user')
                ),
                # Prefetch aprovações de workflow
                Prefetch(
                    'approvals',
                    queryset=TaskApproval.objects.select_related(
                        'workflow_step',
                        'approved_by'
                    )
                )
            )
            
            # Apply filters if provided
            status_param = self.request.query_params.get('status')
            if status_param:
                status_values = status_param.split(',')
                base_queryset = base_queryset.filter(status__in=status_values)
                
            user_param = self.request.query_params.get('user')
            if user_param:
                base_queryset = base_queryset.filter(assigned_to__id=user_param)
                
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
            
            overdue_param = self.request.query_params.get('overdue')
            if overdue_param and overdue_param.lower() == 'true':
                today = timezone.now()
                base_queryset = base_queryset.filter(deadline__lt=today.date())
                
            due_param = self.request.query_params.get('due')
            if due_param:
                today = timezone.now().date()
                if due_param == 'today':
                    base_queryset = base_queryset.filter(deadline__date=today)
                elif due_param == 'this-week':
                    week_start = today - timezone.timedelta(days=today.weekday())
                    week_end = week_start + timezone.timedelta(days=6)
                    base_queryset = base_queryset.filter(deadline__date__range=[week_start, week_end])
            
            if not profile.organization:
                return Task.objects.none()
                
            # Apply permission-based filtering
            if profile.is_org_admin:
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return Task.objects.none()
            elif profile.can_view_all_tasks:
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return Task.objects.none()
            else:
                # ✅ OTIMIZADO: Usar values_list para IDs e uma query
                visible_client_ids = list(
                    profile.visible_clients.values_list('id', flat=True)
                )
                return base_queryset.filter(
                    Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            return Task.objects.none()
        
    def perform_create(self, serializer):
        try:
            profile = Profile.objects.select_related('organization').get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_tasks):
                raise PermissionDenied("Você não tem permissão para criar tarefas")
                
            client_id = self.request.data.get('client')
            if client_id:
                # ✅ OTIMIZADO: select_related para organização do cliente
                client = Client.objects.select_related('organization').get(id=client_id)
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso a este cliente")
            
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

    @action(detail=True, methods=['post'])
    def advance_workflow(self, request, pk=None):
        """Avança manualmente o workflow para o próximo passo"""
        task = self.get_object()
        
        if not task.workflow or not task.current_workflow_step:
            return Response(
                {"error": "Esta tarefa não possui workflow ativo"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        next_step_id = request.data.get('next_step_id')
        comment = request.data.get('comment', '')
        
        if not next_step_id:
            return Response(
                {"error": "ID do próximo passo é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            profile = Profile.objects.get(user=request.user)
            
            # Verificar permissões
            can_advance = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or 
                (profile.can_edit_assigned_tasks and task.assigned_to == request.user) or
                (task.current_workflow_step.assign_to == request.user)
            )
            
            if not can_advance:
                raise PermissionDenied("Você não tem permissão para avançar este workflow")
            
            # FIXED: Verificar se o próximo passo é válido
            current_step = task.current_workflow_step
            try:
                next_step_ids = current_step.next_steps
                if isinstance(next_step_ids, str):
                    next_step_ids = json.loads(next_step_ids) if next_step_ids else []
                elif not isinstance(next_step_ids, list):
                    next_step_ids = []
            except (json.JSONDecodeError, TypeError):
                next_step_ids = []
            
            if str(next_step_id) not in [str(id) for id in next_step_ids]:
                return Response(
                    {"error": "Passo inválido para esta transição"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            next_step = WorkflowStep.objects.get(id=next_step_id)
            
            # FIXED: Verificar se o passo atual requer aprovação
            if current_step.requires_approval:
                # Verificar se já foi aprovado
                approval_exists = TaskApproval.objects.filter(
                    task=task,
                    workflow_step=current_step,
                    approved=True
                ).exists()
                
                if not approval_exists:
                    return Response(
                        {"error": "Este passo requer aprovação antes de avançar"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # FIXED: Mark current step as completed if not already
            step_completed = WorkflowHistory.objects.filter(
                task=task,
                from_step=current_step,
                action='step_completed'
            ).exists()
            
            if not step_completed:
                WorkflowHistory.objects.create(
                    task=task,
                    from_step=current_step,
                    to_step=None,
                    changed_by=request.user,
                    action='step_completed',
                    comment=comment or f"Passo '{current_step.name}' concluído manualmente"
                )
            
            # Avançar o workflow
            task.current_workflow_step = next_step
            task.workflow_comment = comment
            task.save()
            
            # FIXED: Registrar no histórico a transição correta
            WorkflowHistory.objects.create(
                task=task,
                from_step=current_step,
                to_step=next_step,
                changed_by=request.user,
                action='step_advanced',
                comment=comment or f"Workflow avançado de '{current_step.name}' para '{next_step.name}'"
            )
            
            # Criar notificação para o responsável pelo próximo passo
            if next_step.assign_to:
                WorkflowNotification.objects.create(
                    user=next_step.assign_to,
                    task=task,
                    workflow_step=next_step,
                    notification_type='step_ready',
                    title=f"Novo passo pronto: {next_step.name}",
                    message=f"A tarefa '{task.title}' chegou ao passo '{next_step.name}' e está pronta para ser trabalhada."
                )
            
            return Response(
                {"success": True, "message": "Workflow avançado com sucesso"}, 
                status=status.HTTP_200_OK
            )
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
        except WorkflowStep.DoesNotExist:
            return Response(
                {"error": "Passo do workflow não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    # views.py - Correção da action workflow_status

    @action(detail=True, methods=['get'])
    def workflow_status(self, request, pk=None):
        task = self.get_object()
        
        if not task.workflow:
            return Response({"workflow": None})
        
        workflow_definition = task.workflow
        all_steps_qs = WorkflowStep.objects.filter(workflow=workflow_definition).order_by('order')
        
        history_qs = WorkflowHistory.objects.filter(task=task).select_related(
            'from_step', 'to_step', 'changed_by'
        ).order_by('-created_at')
        
        approvals_qs = TaskApproval.objects.filter(task=task).select_related(
            'workflow_step', 'approved_by'
        )
        
        # Calcular tempo por passo - CORRIGIDO
        time_by_step = {}
        for step_obj in all_steps_qs:
            step_time_entries = TimeEntry.objects.filter(
                task=task, 
                workflow_step=step_obj
            )
            
            # Se não há entradas específicas para o passo, incluir entradas gerais durante o período do passo
            if not step_time_entries.exists():
                step_started = history_qs.filter(
                    to_step=step_obj,
                    action__in=['step_advanced', 'workflow_assigned']
                ).first()
                
                step_ended = history_qs.filter(
                    from_step=step_obj,
                    action__in=['step_completed', 'step_advanced']
                ).first()
                
                if step_started or (task.current_workflow_step == step_obj):
                    general_time_entries = TimeEntry.objects.filter(
                        task=task,
                        workflow_step__isnull=True
                    )
                    
                    if step_started and step_ended:
                        general_time_entries = general_time_entries.filter(
                            created_at__gte=step_started.created_at,
                            created_at__lte=step_ended.created_at
                        )
                    elif step_started:
                        general_time_entries = general_time_entries.filter(
                            created_at__gte=step_started.created_at
                        )
                    
                    step_time_entries = general_time_entries
            
            total_minutes = step_time_entries.aggregate(total=models.Sum('minutes_spent'))['total'] or 0
            time_by_step[str(step_obj.id)] = total_minutes

        # NOVA LÓGICA: Determinar passos concluídos de forma mais precisa
        completed_step_ids = set()
        workflow_is_completed = history_qs.filter(action='workflow_completed').exists()

        if workflow_is_completed and task.current_workflow_step is None:
            # Workflow completamente finalizado - todos os passos estão concluídos
            for step_obj in all_steps_qs:
                completed_step_ids.add(str(step_obj.id))
        else:
            # Analisar histórico para passos explicitamente concluídos
            for history_entry in history_qs:
                if history_entry.action in ['step_completed', 'step_advanced'] and history_entry.from_step_id:
                    completed_step_ids.add(str(history_entry.from_step_id))
            
            # CORREÇÃO PRINCIPAL: Marcar passos anteriores ao atual como concluídos
            if task.current_workflow_step:
                current_order = task.current_workflow_step.order
                for step_obj in all_steps_qs:
                    if step_obj.order < current_order:
                        completed_step_ids.add(str(step_obj.id))

        # Construir resposta com progresso corrigido
        completed_count = len(completed_step_ids)
        total_steps = all_steps_qs.count()
        
        # Calcular passo atual para exibição
        if workflow_is_completed:
            current_step_display = total_steps
            percentage = 100.0
        elif task.current_workflow_step:
            # O passo atual é o número de passos concluídos + 1
            current_step_display = completed_count + 1
            percentage = (completed_count / total_steps) * 100 if total_steps > 0 else 0
        else:
            current_step_display = 0
            percentage = 0.0

        response_data = {
            'task': {
                'id': task.id,
                'title': task.title,
                'status': task.status,
                'assigned_to': task.assigned_to.id if task.assigned_to else None,
            },
            'workflow': {
                'id': workflow_definition.id,
                'name': workflow_definition.name,
                'is_completed': workflow_is_completed,
                'steps': [],
                'time_by_step': time_by_step,
                'progress': {
                    'current_step': current_step_display,
                    'completed_steps': completed_count,
                    'total_steps': total_steps,
                    'percentage': round(percentage, 1)
                }
            },
            'current_step': None,
            'history': [],
            'approvals': [],
        }

        # Passo atual
        if task.current_workflow_step:
            current_step_obj = task.current_workflow_step
            response_data['current_step'] = {
                'id': current_step_obj.id,
                'name': current_step_obj.name,
                'order': current_step_obj.order,
                'assign_to': current_step_obj.assign_to.username if current_step_obj.assign_to else None,
                'requires_approval': current_step_obj.requires_approval,
                'approver_role': current_step_obj.approver_role,
            }

        # Processar passos
        for step_obj in all_steps_qs:
            step_id_str = str(step_obj.id)
            is_current = task.current_workflow_step_id == step_obj.id
            is_completed = step_id_str in completed_step_ids
            
            # Parse next_steps e previous_steps
            try:
                next_steps_data = json.loads(step_obj.next_steps) if isinstance(step_obj.next_steps, str) and step_obj.next_steps else (step_obj.next_steps if isinstance(step_obj.next_steps, list) else [])
            except (json.JSONDecodeError, TypeError):
                next_steps_data = []
            
            try:
                previous_steps_data = json.loads(step_obj.previous_steps) if isinstance(step_obj.previous_steps, str) and step_obj.previous_steps else (step_obj.previous_steps if isinstance(step_obj.previous_steps, list) else [])
            except (json.JSONDecodeError, TypeError):
                previous_steps_data = []

            response_data['workflow']['steps'].append({
                'id': step_obj.id,
                'name': step_obj.name,
                'description': step_obj.description,
                'order': step_obj.order,
                'assign_to': step_obj.assign_to.id if step_obj.assign_to else None,
                'assign_to_name': step_obj.assign_to.username if step_obj.assign_to else None,
                'requires_approval': step_obj.requires_approval,
                'approver_role': step_obj.approver_role,
                'next_steps': next_steps_data,
                'previous_steps': previous_steps_data,
                'is_current': is_current,
                'is_completed': is_completed,
                'time_spent': time_by_step.get(step_id_str, 0),
            })
        
        # Histórico
        for history_entry in history_qs[:50]:
            response_data['history'].append({
                'id': history_entry.id,
                'from_step': history_entry.from_step.name if history_entry.from_step else None,
                'from_step_name': history_entry.from_step.name if history_entry.from_step else None,
                'from_step_id': history_entry.from_step_id,
                'to_step': history_entry.to_step.name if history_entry.to_step else None,
                'to_step_name': history_entry.to_step.name if history_entry.to_step else None,
                'to_step_id': history_entry.to_step_id,
                'changed_by': history_entry.changed_by.username if history_entry.changed_by else None,
                'changed_by_username': history_entry.changed_by.username if history_entry.changed_by else None,
                'action': history_entry.action,
                'comment': history_entry.comment,
                'time_spent_minutes': history_entry.time_spent_minutes or 0,
                'created_at': history_entry.created_at
            })

        # Aprovações
        for approval_entry in approvals_qs:
            response_data['approvals'].append({
                'id': approval_entry.id,
                'workflow_step': approval_entry.workflow_step.name,
                'workflow_step_id': approval_entry.workflow_step_id,
                'approved_by': approval_entry.approved_by.username if approval_entry.approved_by else None,
                'approved': approval_entry.approved,
                'comment': approval_entry.comment,
                'approved_at': approval_entry.approved_at
            })
            
        return Response(response_data)

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
                # ✅ OTIMIZADO: Profile com organização
                profile = Profile.objects.select_related('organization').get(user=user)
                
                # ✅ OTIMIZADO: Base queryset com todas as relações necessárias
                base_queryset = TimeEntry.objects.select_related(
                    'user',
                    'client__organization',
                    'client__account_manager',
                    'task__category',
                    'task__assigned_to',
                    'category'
                ).prefetch_related(
                    # Prefetch apenas se necessário para relatórios
                    # 'task__time_entries'  # Remover se não usado
                )
                
                # Apply filters
                start_date = self.request.query_params.get('start_date')
                end_date = self.request.query_params.get('end_date')
                if start_date and end_date:
                    base_queryset = base_queryset.filter(date__range=[start_date, end_date])
                    
                client_id = self.request.query_params.get('client')
                if client_id:
                    base_queryset = base_queryset.filter(client_id=client_id)
                    
                user_id = self.request.query_params.get('user')
                if user_id:
                    base_queryset = base_queryset.filter(user_id=user_id)
                
                # Apply permission-based filtering
                if profile.is_org_admin:
                    if profile.organization:
                        return base_queryset.filter(client__organization=profile.organization)
                    return TimeEntry.objects.none()
                elif profile.can_view_team_time:
                    if profile.organization:
                        return base_queryset.filter(client__organization=profile.organization)
                    return TimeEntry.objects.none()
                else:
                    # ✅ OTIMIZADO: Usar values_list para evitar query extra
                    visible_client_ids = list(
                        profile.visible_clients.values_list('id', flat=True)
                    )
                    return base_queryset.filter(
                        Q(client_id__in=visible_client_ids) | Q(user=user)
                    ).distinct()
                    
            except Profile.DoesNotExist:
                return TimeEntry.objects.filter(user=user).select_related(
                    'user',
                    'client',
                    'task',
                    'category'
                )

    
    def perform_create(self, serializer):
        try:
            profile = Profile.objects.get(user=self.request.user)
            
            if not profile.can_log_time:
                raise PermissionDenied("Você não tem permissão para registrar tempo")
            
            client_id = self.request.data.get('client')
            if client_id:
                client = Client.objects.get(id=client_id)
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso a este cliente")
            
            # Salvar o time entry
            time_entry = serializer.save(user=self.request.user)
            
            # Processar workflow se necessário
            self._process_workflow_step(time_entry)
            
            # Atualizar status da tarefa se especificado
            self._update_task_status_if_needed(time_entry)
            
        except Profile.DoesNotExist:
            time_entry = serializer.save(user=self.request.user)
            self._process_workflow_step(time_entry)
            self._update_task_status_if_needed(time_entry)
        except Client.DoesNotExist:
            raise PermissionDenied("Cliente não encontrado")

    def _process_workflow_step(self, time_entry):
        """Processa avanços no workflow baseado no time entry"""
        if not time_entry.task or not time_entry.task.workflow:
            return
            
        task = time_entry.task
        
        # Determinar o passo sendo trabalhado
        step_being_worked_on = time_entry.workflow_step
        
        # Se não foi especificado um passo, usar o passo atual da tarefa
        if not step_being_worked_on and task.current_workflow_step:
            step_being_worked_on = task.current_workflow_step
            time_entry.workflow_step = step_being_worked_on
            time_entry.save()
        
        if not step_being_worked_on:
            logger.warning(f"Nenhum passo de workflow determinado para time entry {time_entry.id} da tarefa {task.id}")
            return

        # 1. SEMPRE registrar que trabalho foi feito neste passo
        WorkflowHistory.objects.create(
            task=task,
            from_step=step_being_worked_on, 
            to_step=None, 
            changed_by=time_entry.user,
            action='step_work_logged',
            comment=f"Tempo registrado: {time_entry.minutes_spent} minutos no passo '{step_being_worked_on.name}'. Descrição: {time_entry.description}",
            time_spent_minutes=time_entry.minutes_spent
        )
        
        logger.info(f"Trabalho registrado no passo {step_being_worked_on.name} da tarefa {task.id}: {time_entry.minutes_spent} minutos")
        
        # 2. Se o passo foi marcado como concluído
        if time_entry.workflow_step_completed:
            # Verificar se o passo já não foi marcado como concluído para evitar duplicados
            already_completed = WorkflowHistory.objects.filter(
                task=task,
                from_step=step_being_worked_on,
                action='step_completed'
            ).exists()

            if not already_completed:
                WorkflowHistory.objects.create(
                    task=task,
                    from_step=step_being_worked_on,
                    to_step=None, 
                    changed_by=time_entry.user,
                    action='step_completed',
                    comment=f"Passo '{step_being_worked_on.name}' marcado como concluído via registro de tempo."
                )
                
                logger.info(f"Passo {step_being_worked_on.name} da tarefa {task.id} marcado como concluído")
            
            # 3. Se também foi marcado para avançar o workflow
            if time_entry.advance_workflow:
                # Só avançar se o passo trabalhado é o passo atual da tarefa
                if task.current_workflow_step == step_being_worked_on:
                    self._advance_workflow_step(task, step_being_worked_on, time_entry.user, time_entry.description)
                else:
                    logger.warning(f"Tentativa de avançar workflow para tarefa {task.id} a partir do passo {step_being_worked_on.name}, mas o passo atual da tarefa é {task.current_workflow_step.name if task.current_workflow_step else 'Nenhum'}. Avanço ignorado.")
    
    def _advance_workflow_step(self, task, completed_step, user, comment_for_advance=""):
        """Avança o workflow para o próximo passo após conclusão do completed_step."""
        
        logger.info(f"Iniciando avanço do workflow da tarefa {task.id} a partir do passo {completed_step.name}")
        
        # Verificar se requer aprovação
        if completed_step.requires_approval:
            is_approved = TaskApproval.objects.filter(
                task=task,
                workflow_step=completed_step,
                approved=True
            ).exists()
            
            if not is_approved:
                logger.info(f"Passo {completed_step.name} da tarefa {task.id} requer aprovação. Criando notificação.")
                self._create_approval_notification(task, completed_step)
                return

        # Determinar próximos passos
        try:
            next_step_ids_str = completed_step.next_steps
            if isinstance(next_step_ids_str, list):
                next_step_ids = [str(sid) for sid in next_step_ids_str]
            elif next_step_ids_str:
                next_step_ids = [str(sid) for sid in json.loads(next_step_ids_str)]
            else:
                next_step_ids = []
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"Erro ao decodificar next_steps para o passo {completed_step.id} ({completed_step.name}): {e}. Conteúdo: '{completed_step.next_steps}'")
            next_step_ids = []

        if not next_step_ids:
            # Sem próximos passos definidos, workflow concluído
            task.current_workflow_step = None
            task.status = 'completed'
            task.completed_at = timezone.now()
            task.save()
            
            WorkflowHistory.objects.create(
                task=task,
                from_step=completed_step,
                to_step=None,
                changed_by=user,
                action='workflow_completed',
                comment=f"Workflow concluído após passo: {completed_step.name}. {comment_for_advance}".strip()
            )
            logger.info(f"Workflow concluído para tarefa {task.id} após passo {completed_step.name}.")
            return

        if len(next_step_ids) == 1:
            try:
                next_step = WorkflowStep.objects.get(id=next_step_ids[0])
                
                # Atualizar tarefa
                task.current_workflow_step = next_step
                task.save()
                
                # Registrar no histórico
                WorkflowHistory.objects.create(
                    task=task,
                    from_step=completed_step,
                    to_step=next_step,
                    changed_by=user,
                    action='step_advanced',
                    comment=f"Avançado automaticamente de '{completed_step.name}' para '{next_step.name}'. {comment_for_advance}".strip()
                )
                
                # Criar notificação
                if next_step.assign_to:
                    WorkflowNotification.objects.create(
                        user=next_step.assign_to,
                        task=task,
                        workflow_step=next_step,
                        notification_type='step_ready',
                        title=f"Novo passo pronto: {next_step.name}",
                        message=f"A tarefa '{task.title}' chegou ao passo '{next_step.name}' e está pronta para ser trabalhada."
                    )
                
                logger.info(f"Workflow para tarefa {task.id} avançado de {completed_step.name} para {next_step.name}.")
                    
            except WorkflowStep.DoesNotExist:
                logger.error(f"Próximo passo com ID {next_step_ids[0]} não encontrado para tarefa {task.id}.")
        else:
            # Múltiplos próximos passos - requer escolha manual
            logger.info(f"Múltiplos próximos passos disponíveis para tarefa {task.id} a partir do passo {completed_step.name}. Escolha manual necessária.")
            
            if task.assigned_to:
                WorkflowNotification.objects.create(
                    user=task.assigned_to,
                    task=task,
                    workflow_step=completed_step,
                    notification_type='manual_advance_needed',
                    title=f"Escolha o próximo passo para: {task.title}",
                    message=f"A tarefa '{task.title}' completou o passo '{completed_step.name}' e tem múltiplos caminhos. Por favor, avance manualmente."
                )

    def _complete_workflow_step(self, task, workflow_step, user):
        """Marca um passo do workflow como concluído e avança se possível"""
        # Verificar se requer aprovação
        if workflow_step.requires_approval:
            # Criar notificação para aprovação - NÃO avançar ainda
            self._create_approval_notification(task, workflow_step)
        else:
            # Tentar avançar automaticamente para o próximo passo
            self._advance_to_next_step_if_possible(task, workflow_step, user)

    def _advance_to_next_step_if_possible(self, task, from_step, user):
        """Avança a tarefa para o próximo passo se existir"""
        
        # Verificar se há próximos passos definidos
        if not from_step.next_steps:
            # Não há próximos passos - workflow concluído
            task.current_workflow_step = None
            task.save()
            
            WorkflowHistory.objects.create(
                task=task,
                from_step=from_step,
                to_step=None,
                changed_by=user,
                action='workflow_completed',
                comment=f"Workflow concluído. Último passo: {from_step.name}"
            )
            return
        
        try:
            next_step_ids = from_step.next_steps
            if isinstance(next_step_ids, str):
                next_step_ids = json.loads(next_step_ids)
            
            # Se há apenas um próximo passo, avançar automaticamente
            if len(next_step_ids) == 1:
                try:
                    next_step = WorkflowStep.objects.get(id=next_step_ids[0])
                    
                    # Atualizar a tarefa para o próximo passo
                    task.current_workflow_step = next_step
                    task.save()
                    
                    # Registrar a transição no histórico
                    WorkflowHistory.objects.create(
                        task=task,
                        from_step=from_step,
                        to_step=next_step,
                        changed_by=user,
                        action='step_completed',  # from_step foi concluído
                        comment=f"Avançado automaticamente de {from_step.name} para {next_step.name}"
                    )
                    
                    # Criar notificação para o responsável pelo próximo passo
                    if next_step.assign_to:
                        WorkflowNotification.objects.create(
                            user=next_step.assign_to,
                            task=task,
                            workflow_step=next_step,
                            notification_type='step_ready',
                            title=f"Novo passo pronto: {next_step.name}",
                            message=f"A tarefa '{task.title}' chegou ao passo '{next_step.name}' e está pronta para ser trabalhada."
                        )
                        
                except WorkflowStep.DoesNotExist:
                    # Next step doesn't exist - treat as workflow completed
                    task.current_workflow_step = None
                    task.save()
                    
                    WorkflowHistory.objects.create(
                        task=task,
                        from_step=from_step,
                        to_step=None,
                        changed_by=user,
                        action='workflow_completed',
                        comment=f"Workflow concluído. Próximo passo não encontrado após: {from_step.name}"
                    )
            
            elif len(next_step_ids) > 1:
                # Múltiplos próximos passos possíveis - não avançar automaticamente
                # O usuário deve escolher manualmente o próximo passo
                pass
                
        except (json.JSONDecodeError, ValueError) as e:
            # Erro ao processar next_steps - log e não avançar
            logger.error(f"Erro ao processar next_steps para {from_step}: {e}")

    def _auto_advance_workflow(self, task, user):
        """Avança automaticamente para o próximo passo se marcado para avançar"""
        current_step = task.current_workflow_step
        
        if not current_step:
            return
            
        # Usar a mesma lógica de avanço
        self._advance_to_next_step_if_possible(task, current_step, user)
    def _advance_to_next_step(self, task, from_step, user, to_step=None):
        """Avança a tarefa para o próximo passo"""
        if to_step:
            # Atualizar a tarefa
            task.current_workflow_step = to_step
            task.save()
            
            # FIXED: Registrar no histórico a transição correta
            WorkflowHistory.objects.create(
                task=task,
                from_step=from_step,  # Passo que foi concluído
                to_step=to_step,      # Passo para onde avançou
                changed_by=user,
                action='step_completed',  # O from_step foi concluído
                comment=f"Passo avançado automaticamente de {from_step.name} para {to_step.name}"
            )
            
            # Criar notificação para o responsável pelo próximo passo
            if to_step.assign_to:
                WorkflowNotification.objects.create(
                    user=to_step.assign_to,
                    task=task,
                    workflow_step=to_step,
                    notification_type='step_ready',
                    title=f"Novo passo pronto: {to_step.name}",
                    message=f"A tarefa '{task.title}' chegou ao passo '{to_step.name}' e está pronta para ser trabalhada."
                )
                
                # Enviar email de notificação
                self._send_workflow_email(to_step.assign_to, task, to_step, 'step_ready')
        else:
            # Se não há próximo passo, o workflow foi concluído
            task.current_workflow_step = None
            task.save()
            
            # Registrar conclusão do workflow
            WorkflowHistory.objects.create(
                task=task,
                from_step=from_step,
                to_step=None,
                changed_by=user,
                action='workflow_completed',
                comment=f"Workflow concluído. Último passo: {from_step.name}"
            )

    def _create_approval_notification(self, task, workflow_step):
        """Cria notificação para aprovação de passo"""
        # Buscar usuários que podem aprovar (baseado no papel)
        if workflow_step.approver_role:
            # Procurar usuários com o papel específico
            approvers = Profile.objects.filter(
                organization=task.client.organization,
                role__icontains=workflow_step.approver_role
            )
        else:
            # Usar admins da organização
            approvers = Profile.objects.filter(
                organization=task.client.organization,
                is_org_admin=True
            )
        
        for approver_profile in approvers:
            WorkflowNotification.objects.create(
                user=approver_profile.user,
                task=task,
                workflow_step=workflow_step,
                notification_type='approval_needed',
                title=f"Aprovação necessária: {workflow_step.name}",
                message=f"O passo '{workflow_step.name}' da tarefa '{task.title}' precisa de aprovação."
            )
            
            # Enviar email
            self._send_workflow_email(approver_profile.user, task, workflow_step, 'approval_needed')
    
    def _send_workflow_email(self, user, task, workflow_step, notification_type):
        """Envia email de notificação de workflow"""
        from django.core.mail import send_mail
        from django.conf import settings
        
        if not user.email:
            return
            
        subject_map = {
            'step_ready': f"Nova tarefa pronta: {task.title}",
            'approval_needed': f"Aprovação necessária: {task.title}",
            'step_completed': f"Passo concluído: {task.title}",
            'workflow_completed': f"Workflow concluído: {task.title}"
        }
        
        message_map = {
            'step_ready': f"A tarefa '{task.title}' chegou ao passo '{workflow_step.name}' e está pronta para ser trabalhada.",
            'approval_needed': f"O passo '{workflow_step.name}' da tarefa '{task.title}' precisa de sua aprovação.",
            'step_completed': f"O passo '{workflow_step.name}' da tarefa '{task.title}' foi concluído.",
            'workflow_completed': f"O workflow da tarefa '{task.title}' foi concluído com sucesso."
        }
        
        try:
            send_mail(
                subject=subject_map.get(notification_type, f"Atualização de workflow: {task.title}"),
                message=message_map.get(notification_type, f"Atualização no workflow da tarefa '{task.title}'."),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as e:
            logger.error(f"Erro ao enviar email de workflow: {e}")

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
        # ✅ OTIMIZADO: select_related para cliente e criador
        queryset = Expense.objects.select_related(
            'client__organization',
            'created_by'
        )
        
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
            
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
            # ✅ OTIMIZADO: Profile com organização
            profile = Profile.objects.select_related('organization').get(user=user)
            
            if not (profile.is_org_admin or profile.can_view_profitability):
                return ClientProfitability.objects.none()
            
            # ✅ OTIMIZADO: select_related para cliente e organização
            base_queryset = ClientProfitability.objects.select_related(
                'client__organization',
                'client__account_manager'
            )
            
            # Apply filters
            year = self.request.query_params.get('year')
            month = self.request.query_params.get('month')
            if year and month:
                base_queryset = base_queryset.filter(year=year, month=month)
            
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
                
            is_profitable = self.request.query_params.get('is_profitable')
            if is_profitable is not None:
                is_profitable_bool = is_profitable.lower() == 'true'
                base_queryset = base_queryset.filter(is_profitable=is_profitable_bool)
            
            # Apply client visibility filtering
            if profile.organization:
                if profile.is_org_admin or profile.can_view_all_clients:
                    return base_queryset.filter(client__organization=profile.organization)
                else:
                    # ✅ OTIMIZADO: values_list para evitar query extra
                    visible_client_ids = list(
                        profile.visible_clients.values_list('id', flat=True)
                    )
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
        queryset = WorkflowDefinition.objects.select_related(
            'created_by'
        ).prefetch_related(
            Prefetch(
                'steps',
                queryset=WorkflowStep.objects.select_related('assign_to').order_by('order')
            )
        )
        
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
        approval = serializer.save(approved_by=self.request.user)
        
        # Se foi aprovado, verificar se pode avançar o workflow
        if approval.approved:
            task = approval.task
            workflow_step = approval.workflow_step
            
            # Verificar se este é o passo atual da tarefa
            if task.current_workflow_step == workflow_step:
                # Registrar no histórico
                WorkflowHistory.objects.create(
                    task=task,
                    from_step=workflow_step,
                    to_step=workflow_step,
                    changed_by=self.request.user,
                    action='step_approved',
                    comment=approval.comment or "Passo aprovado"
                )
                
                # Criar notificação para o responsável do passo
                if workflow_step.assign_to:
                    WorkflowNotification.objects.create(
                        user=workflow_step.assign_to,
                        task=task,
                        workflow_step=workflow_step,
                        notification_type='approval_completed',
                        title=f"Passo aprovado: {workflow_step.name}",
                        message=f"O passo '{workflow_step.name}' da tarefa '{task.title}' foi aprovado e pode ser avançado."
                    )

class WorkflowStepDetailViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        workflow_id = self.request.query_params.get('workflow')
        
        try:
            profile = Profile.objects.get(user=user)
            
            queryset = WorkflowStep.objects.select_related(
                'workflow', 'assign_to'
            ).prefetch_related(
                'time_entries',
                'task_approvals'
            )
            
            if workflow_id:
                queryset = queryset.filter(workflow=workflow_id)
            
            # Filtrar por permissões
            if not (profile.is_org_admin or profile.can_view_all_tasks):
                # Usuários só veem passos de workflows de tarefas que podem acessar
                visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                queryset = queryset.filter(
                    workflow__tasks__client_id__in=visible_client_ids
                ).distinct()
            
            return queryset.order_by('workflow', 'order')
            
        except Profile.DoesNotExist:
            return WorkflowStep.objects.none()
    
    @action(detail=True, methods=['get'])
    def time_entries(self, request, pk=None):
        """Retorna todas as entradas de tempo para este passo"""
        workflow_step = self.get_object()
        
        time_entries = TimeEntry.objects.filter(
            workflow_step=workflow_step
        ).select_related(
            'user', 'task', 'client'
        ).order_by('-date', '-created_at')
        
        serializer = TimeEntrySerializer(time_entries, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def current_tasks(self, request, pk=None):
        """Retorna tarefas que estão atualmente neste passo"""
        workflow_step = self.get_object()
        
        current_tasks = Task.objects.filter(
            current_workflow_step=workflow_step
        ).select_related(
            'client', 'assigned_to', 'created_by'
        )
        
        serializer = TaskSerializer(current_tasks, many=True)
        return Response(serializer.data)
        
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
        
        if user.is_superuser:
            # ✅ OTIMIZADO: prefetch para membros e clientes
            return Organization.objects.prefetch_related(
                Prefetch(
                    'members',
                    queryset=Profile.objects.select_related('user')
                ),
                Prefetch(
                    'clients',
                    queryset=Client.objects.select_related('account_manager')
                )
            )
            
        try:
            # ✅ OTIMIZADO: select_related para organização
            profile = Profile.objects.select_related('organization').get(user=user)
            
            if profile.organization:
                return Organization.objects.filter(
                    id=profile.organization.id
                ).prefetch_related(
                    Prefetch(
                        'members',
                        queryset=Profile.objects.select_related('user')
                    ),
                    Prefetch(
                        'clients',
                        queryset=Client.objects.select_related('account_manager')
                    )
                )
            
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
        # ✅ OTIMIZADO: Uma única query para profile com organização
        profile = Profile.objects.select_related('organization').get(user=user)
        
        # Base response com permissões
        response_data = {
            'has_full_access': profile.is_org_admin,
            'can_view_all_clients': profile.can_view_all_clients,
            'can_create_clients': profile.can_create_clients,
            'can_edit_clients': profile.can_edit_clients,
            'can_delete_clients': profile.can_delete_clients,
            'can_change_client_status': profile.can_change_client_status,
            'can_assign_tasks': profile.can_assign_tasks,
            'can_create_tasks': profile.can_create_tasks,
            'can_edit_all_tasks': profile.can_edit_all_tasks,
            'can_delete_tasks': profile.can_delete_tasks,
            'can_view_all_tasks': profile.can_view_all_tasks,
            'can_approve_tasks': profile.can_approve_tasks,
            'can_log_time': profile.can_log_time,
            'can_edit_own_time': profile.can_edit_own_time,
            'can_edit_all_time': profile.can_edit_all_time,
            'can_view_team_time': profile.can_view_team_time,
            'can_view_client_fees': profile.can_view_client_fees,
            'can_edit_client_fees': profile.can_edit_client_fees,
            'can_manage_expenses': profile.can_manage_expenses,
            'can_view_profitability': profile.can_view_profitability,
            'can_view_team_profitability': profile.can_view_team_profitability,
            'can_view_organization_profitability': profile.can_view_organization_profitability,
            'can_view_analytics': profile.can_view_analytics,
            'can_export_reports': profile.can_export_reports,
            'can_create_custom_reports': profile.can_create_custom_reports,
            'can_schedule_reports': profile.can_schedule_reports,
            'can_create_workflows': profile.can_create_workflows,
            'can_edit_workflows': profile.can_edit_workflows,
            'can_assign_workflows': profile.can_assign_workflows,
            'can_manage_workflows': profile.can_manage_workflows,
        }
        
        today = timezone.now().date()
        seven_days_ago = today - timezone.timedelta(days=7)
        org_id = profile.organization.id if profile.organization else None
        
        # ✅ OTIMIZADO: Clients data com uma query
        if profile.is_org_admin or profile.can_view_all_clients:
            clients_count = Client.objects.filter(
                organization_id=org_id,
                is_active=True
            ).count()
        else:
            # ✅ OTIMIZADO: count() direto sem carregar objetos
            clients_count = profile.visible_clients.filter(is_active=True).count()
            
        response_data['active_clients'] = clients_count
        
        # ✅ OTIMIZADO: Tasks data com queries agregadas
        if profile.is_org_admin or profile.can_view_all_tasks:
            task_stats = Task.objects.filter(
                client__organization_id=org_id
            ).aggregate(
                active_tasks=Count('id', filter=~Q(status='completed')),
                overdue_tasks=Count('id', filter=Q(status='pending', deadline__lt=today)),
                today_tasks=Count('id', filter=Q(deadline__date=today)),
                completed_week=Count('id', filter=Q(status='completed', completed_at__gte=seven_days_ago))
            )
        else:
            # ✅ OTIMIZADO: Usar values_list e agregação
            visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
            task_stats = Task.objects.filter(
                Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
            ).distinct().aggregate(
                active_tasks=Count('id', filter=~Q(status='completed')),
                overdue_tasks=Count('id', filter=Q(status='pending', deadline__lt=today)),
                today_tasks=Count('id', filter=Q(deadline__date=today)),
                completed_week=Count('id', filter=Q(status='completed', completed_at__gte=seven_days_ago))
            )
        
        response_data.update({
            'active_tasks': task_stats['active_tasks'] or 0,
            'overdue_tasks': task_stats['overdue_tasks'] or 0,
            'today_tasks': task_stats['today_tasks'] or 0,
            'completed_tasks_week': task_stats['completed_week'] or 0,
        })
        
        # ✅ OTIMIZADO: Time entries com agregação
        if profile.is_org_admin or profile.can_view_team_time:
            time_stats = TimeEntry.objects.filter(
                client__organization_id=org_id
            ).aggregate(
                today_time=Sum('minutes_spent', filter=Q(date=today)),
                week_time=Sum('minutes_spent', filter=Q(date__gte=seven_days_ago, date__lte=today))
            )
        else:
            visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
            time_stats = TimeEntry.objects.filter(
                Q(client_id__in=visible_client_ids) | Q(user=user)
            ).distinct().aggregate(
                today_time=Sum('minutes_spent', filter=Q(date=today)),
                week_time=Sum('minutes_spent', filter=Q(date__gte=seven_days_ago, date__lte=today))
            )
        
        response_data.update({
            'time_tracked_today': time_stats['today_time'] or 0,
            'time_tracked_week': time_stats['week_time'] or 0,
        })
        
        # ✅ OTIMIZADO: Profitability com agregação
        if profile.can_view_profitability or profile.can_view_team_profitability or profile.can_view_organization_profitability:
            if profile.is_org_admin or profile.can_view_organization_profitability:
                profit_clients = Client.objects.filter(organization_id=org_id)
            elif profile.can_view_team_profitability:
                team_user_ids = Profile.objects.filter(
                    organization=profile.organization,
                    role=profile.role
                ).values_list('user', flat=True)
                profit_clients = Client.objects.filter(
                    organization_id=org_id,
                    account_manager__in=team_user_ids
                )
            else:
                profit_clients = profile.visible_clients.all()
            
            # ✅ OTIMIZADO: Uma query agregada para todos os dados de rentabilidade
            profit_stats = ClientProfitability.objects.filter(
                client_id__in=profit_clients.values_list('id', flat=True)
            ).aggregate(
                unprofitable_count=Count('id', filter=Q(is_profitable=False)),
                total_revenue=Sum('monthly_fee'),
                total_time_cost=Sum('time_cost'),
                total_expenses=Sum('total_expenses'),
                avg_margin=Avg('profit_margin', filter=~Q(profit_margin=None))
            )
            
            response_data.update({
                'unprofitable_clients': profit_stats['unprofitable_count'] or 0,
                'total_revenue': profit_stats['total_revenue'] or 0,
                'total_cost': (profit_stats['total_time_cost'] or 0) + (profit_stats['total_expenses'] or 0),
                'average_profit_margin': profit_stats['avg_margin'] or 0,
            })
        
        # ✅ OTIMIZADO: Workflow data se necessário
        if profile.can_create_workflows or profile.can_edit_workflows or profile.can_assign_workflows:
            workflow_stats = {
                'active_workflows': WorkflowDefinition.objects.filter(is_active=True).count(),
                'tasks_with_workflows': Task.objects.filter(
                    client__organization_id=org_id
                ).exclude(workflow=None).count()
            }
            response_data.update(workflow_stats)
            
            if profile.can_approve_tasks:
                # ✅ OTIMIZADO: Query complexa mas otimizada para aprovações pendentes
                tasks_needing_approval = Task.objects.filter(
                    client__organization_id=org_id,
                    current_workflow_step__requires_approval=True
                ).exclude(
                    id__in=TaskApproval.objects.filter(
                        approved=True,
                        task__client__organization_id=org_id
                    ).values_list('task', flat=True)
                ).count()
                
                response_data['tasks_needing_approval'] = tasks_needing_approval
        
        return Response(response_data)
        
    except Profile.DoesNotExist:
        return Response({
            'error': 'User profile not found',
            'has_full_access': False,
            'can_view_analytics': False,
            'can_view_profitability': False,
        })

class WorkflowNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Filtros opcionais
        is_read = self.request.query_params.get('is_read')
        notification_type = self.request.query_params.get('type')
        
        queryset = WorkflowNotification.objects.filter(user=user).select_related(
            'task', 'workflow_step', 'task__client'
        )
        
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
            
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
            
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marca uma notificação específica como lida"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'marked_as_read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marca todas as notificações do usuário como lidas"""
        count = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'marked_as_read', 'count': count})


class WorkflowHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkflowHistorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        task_id = self.request.query_params.get('task')
        
        try:
            profile = Profile.objects.get(user=user)
            
            base_queryset = WorkflowHistory.objects.select_related(
                'task', 'from_step', 'to_step', 'changed_by'
            )
            
            if task_id:
                base_queryset = base_queryset.filter(task_id=task_id)
            
            # Aplicar filtros de permissão
            if profile.is_org_admin or profile.can_view_all_tasks:
                return base_queryset.filter(task__client__organization=profile.organization)
            else:
                # Usuários só veem histórico de tarefas que podem acessar
                visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                return base_queryset.filter(
                    Q(task__client_id__in=visible_client_ids) | 
                    Q(task__assigned_to=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            return WorkflowHistory.objects.none()