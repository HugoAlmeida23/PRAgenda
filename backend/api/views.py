import logging
logger = logging.getLogger(__name__)
from rest_framework import viewsets, generics
from rest_framework.request import Request
from datetime import datetime, timedelta 
from django.utils import timezone
import json
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError 
from .models import (Organization, Client, TaskCategory, Task, TimeEntry, Expense, 
                    ClientProfitability, Profile, AutoTimeTracking, WorkflowStep,
                    NLPProcessor, WorkflowDefinition, TaskApproval, WorkflowNotification,NotificationTemplate, 
                    WorkflowHistory,NotificationSettings, NotificationDigest)
from .serializers import (ClientSerializer, TaskCategorySerializer, TaskSerializer,
                         TimeEntrySerializer, ExpenseSerializer, ClientProfitabilitySerializer,
                         ProfileSerializer, AutoTimeTrackingSerializer, OrganizationSerializer,
                         UserSerializer, NLPProcessorSerializer, WorkflowDefinitionSerializer, 
                         WorkflowStepSerializer, TaskApprovalSerializer, WorkflowNotificationSerializer,
                         WorkflowHistorySerializer, NotificationSettingsSerializer,NotificationTemplateSerializer,NotificationDigestSerializer,FiscalGenerationRequestSerializer,FiscalStatsSerializer,FiscalObligationTestSerializer)
from django.contrib.auth.models import User
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Prefetch, F # Added F
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum, Count, Avg
import logging # Redundant, already imported
from .constants.prompts import GEMINI_TIME_EXTRACTION_PROMPT # Assuming this exists
from .services.gemini_service import GeminiService # Assuming this exists
from django.db import models # Redundant
from .utils import update_client_profitability # Already imported
from .services.notification_service import NotificationService 
from .services.notifications_metrics import NotificationMetricsService
from .services.notification_escalation import NotificationEscalationService
from .services.notifications_reports import NotificationReportsService
from .services.notification_template_service import NotificationTemplateService
from .services.notification_digest_service import NotificationDigestService
from .models import FiscalObligationDefinition
from .serializers import FiscalObligationDefinitionSerializer
from .services.fiscal_obligation_service import FiscalObligationGenerator
from .models import FiscalSystemSettings
from django.core.exceptions import PermissionDenied
from .services.fiscal_notification_service import FiscalNotificationService 
from .serializers import FiscalSystemSettingsSerializer
from django.db.models.functions import Now
from django.db.models import ExpressionWrapper, fields
from .services.ai_advisor_service import AIAdvisorService
from .utils import CustomJSONEncoder


logger = logging.getLogger(__name__) # Redundant

class FiscalObligationDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = FiscalObligationDefinitionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            # Superusuário pode ver todas as definições
            return FiscalObligationDefinition.objects.all().select_related('organization', 'default_task_category', 'default_workflow')
        
        try:
            profile = Profile.objects.get(user=user)
            if profile.organization:
                # Usuários normais veem definições globais (sem organização) OU da sua própria organização
                return FiscalObligationDefinition.objects.filter(
                    Q(organization__isnull=True) | Q(organization=profile.organization)
                ).select_related('organization', 'default_task_category', 'default_workflow')
            else:
                # Usuário sem organização só vê definições globais
                return FiscalObligationDefinition.objects.filter(organization__isnull=True).select_related('organization', 'default_task_category', 'default_workflow')
        except Profile.DoesNotExist:
            return FiscalObligationDefinition.objects.none() # Ou apenas globais se fizer sentido

    def perform_create(self, serializer):
        user = self.request.user
        # Apenas superusuários podem criar definições globais (sem organização)
        # Apenas administradores de organização podem criar definições para a sua organização
        organization_id = self.request.data.get('organization')
        
        if user.is_superuser:
            if organization_id:
                try:
                    org = Organization.objects.get(id=organization_id)
                    serializer.save(organization=org)
                except Organization.DoesNotExist:
                    raise serializers.ValidationError({"organization": "Organização não encontrada."})
            else:
                serializer.save(organization=None) # Definição Global
        else:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.is_org_admin or not profile.organization:
                    raise PermissionDenied("Apenas administradores de organização podem criar definições fiscais para a sua organização.")
                
                # Se um admin de org tenta criar, deve ser para a sua própria org ou nenhuma (se permitido)
                if organization_id and str(profile.organization.id) != str(organization_id):
                     raise PermissionDenied("Não pode criar definições para outra organização.")
                
                serializer.save(organization=profile.organization) # Força a ser da organização do admin
            except Profile.DoesNotExist:
                raise PermissionDenied("Perfil de usuário não encontrado.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance

        if user.is_superuser:
            serializer.save()
        else:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.is_org_admin or not profile.organization:
                    raise PermissionDenied("Sem permissão para editar esta definição.")
                if instance.organization and instance.organization != profile.organization:
                    raise PermissionDenied("Não pode editar definições de outra organização.")
                # Admins de org só podem editar as suas ou as globais se tiverem permissão (não implementado aqui)
                if instance.organization is None and not user.is_superuser: # Admin de org tentando editar global
                    raise PermissionDenied("Apenas superusuários podem editar definições globais.")
                serializer.save()
            except Profile.DoesNotExist:
                raise PermissionDenied("Perfil de usuário não encontrado.")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.is_superuser:
            instance.delete()
        else:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.is_org_admin or not profile.organization:
                    raise PermissionDenied("Sem permissão para excluir esta definição.")
                if instance.organization and instance.organization != profile.organization:
                    raise PermissionDenied("Não pode excluir definições de outra organização.")
                if instance.organization is None and not user.is_superuser:
                    raise PermissionDenied("Apenas superusuários podem excluir definições globais.")
                
                # Verificar se está em uso antes de excluir (opcional, mas bom)
                if Task.objects.filter(source_fiscal_obligation=instance).exists():
                    # Em vez de excluir, poderia desativar: instance.is_active = False; instance.save()
                    raise PermissionDenied("Esta definição está em uso por tarefas e não pode ser excluída. Considere desativá-la.")

                instance.delete()
            except Profile.DoesNotExist:
                raise PermissionDenied("Perfil de usuário não encontrado.")
                
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
            profile = Profile.objects.select_related(
                'organization'
            ).prefetch_related(
                'visible_clients__organization',
                'visible_clients__account_manager'
            ).get(user=user)
            
            queryset = Client.objects.select_related(
                'organization',
                'account_manager'
            ).prefetch_related(
                Prefetch(
                    'tasks',
                    queryset=Task.objects.select_related(
                        'category',
                        'assigned_to'
                    ).filter(status__in=['pending', 'in_progress'])
                ),
                Prefetch(
                    'time_entries',
                    queryset=TimeEntry.objects.select_related(
                        'user',
                        'task',
                        'category'
                    ).order_by('-date')
                ),
                'profitability_records'
            )
            
            is_active_param = self.request.query_params.get('is_active')
            if is_active_param is not None:
                is_active = is_active_param.lower() == 'true'
                queryset = queryset.filter(is_active=is_active)
            
            if not profile.organization:
                return Client.objects.none()
                
            if profile.is_org_admin:
                return queryset.filter(organization=profile.organization)
            elif profile.can_view_all_clients: # Assuming can_view_all_clients implies within their org
                return queryset.filter(organization=profile.organization)
            else:
                # Filter by explicitly visible clients
                # visible_client_ids = [c.id for c in profile.visible_clients.all()] # This was optimized
                return queryset.filter(id__in=profile.visible_clients.values_list('id', flat=True))
                
        except Profile.DoesNotExist:
            return Client.objects.none()
    
    def perform_create(self, serializer):
        try:
            profile = Profile.objects.select_related('organization').get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_clients):
                raise PermissionDenied("Você não tem permissão para criar clientes")
                
            if profile.organization:
                serializer.save(organization=profile.organization)
            else:
                # This case might be redundant if user must have an org to have `can_create_clients`
                raise PermissionDenied("Usuário não pertence a nenhuma organização para criar clientes.")
        except Profile.DoesNotExist:
            # Allow superuser to create if they don't have a profile, but without an org
            if self.request.user.is_superuser:
                serializer.save() # Superuser creates client without organization
            else:
                raise PermissionDenied("Perfil de usuário não encontrado")

    def update(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.select_related('organization').get(user=request.user)
            client_instance = self.get_object() # Use client_instance to avoid confusion with serializer.client
            
            if not (profile.is_org_admin or profile.can_edit_clients):
                raise PermissionDenied("Você não tem permissão para editar clientes")
                
            if client_instance.organization != profile.organization:
                # This check might be too strict if an admin from Org A should never edit client from Org B, even if superuser.
                # Superuser bypass might be needed here if intended.
                raise PermissionDenied("Este cliente não pertence à sua organização")
                
            if not (profile.is_org_admin or profile.can_view_all_clients):
                if not profile.visible_clients.filter(id=client_instance.id).exists():
                    raise PermissionDenied("Você não tem acesso a este cliente para edição")
            
            return super().update(request, *args, **kwargs)
            
        except Profile.DoesNotExist:
            if self.request.user.is_superuser: # Allow superuser to update if no profile
                return super().update(request, *args, **kwargs)
            raise PermissionDenied("Perfil de usuário não encontrado")

    def destroy(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.get(user=request.user)
            client_instance = self.get_object()

            if not (profile.is_org_admin or profile.can_delete_clients):
                raise PermissionDenied("Você não tem permissão para excluir clientes")
            
            # Ensure client belongs to user's org before deleting (unless superuser)
            if client_instance.organization != profile.organization and not request.user.is_superuser:
                 raise PermissionDenied("Não pode excluir clientes de outra organização.")

            return super().destroy(request, *args, **kwargs)
        except Profile.DoesNotExist:
            if self.request.user.is_superuser:
                return super().destroy(request, *args, **kwargs)
            raise PermissionDenied("Perfil de usuário não encontrado")
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        client = self.get_object()
        
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not (profile.is_org_admin or profile.can_change_client_status):
                raise PermissionDenied("Você não tem permissão para alterar o status do cliente")

            if client.organization != profile.organization and not request.user.is_superuser:
                 raise PermissionDenied("Não pode alterar status de clientes de outra organização.")
                
            client.is_active = not client.is_active
            client.save()
            
            serializer = self.get_serializer(client)
            return Response(serializer.data)
            
        except Profile.DoesNotExist:
            if self.request.user.is_superuser: # Superuser can toggle if client exists
                client.is_active = not client.is_active
                client.save()
                serializer = self.get_serializer(client)
                return Response(serializer.data)
            raise PermissionDenied("Perfil de usuário não encontrado")
        
class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all() # Categories are typically global or org-specific.
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]
    # Add permission checks for create/update/delete (e.g., only org admins)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.select_related('organization').get(user=user)
            
            base_queryset = Task.objects.select_related(
                'client__organization',
                'client__account_manager',
                'category',
                'assigned_to', # User object
                'created_by',  # User object
                'workflow',    # WorkflowDefinition object
                'current_workflow_step' # WorkflowStep object
            ).prefetch_related(
                Prefetch(
                    'time_entries',
                    queryset=TimeEntry.objects.select_related('user')
                ),
                Prefetch(
                    'approvals',
                    queryset=TaskApproval.objects.select_related(
                        'workflow_step',
                        'approved_by' # User object
                    )
                )
            )
            
            status_param = self.request.query_params.get('status')
            if status_param:
                status_values = status_param.split(',')
                base_queryset = base_queryset.filter(status__in=status_values)
                
            user_param = self.request.query_params.get('user') # Expects user ID
            if user_param:
                base_queryset = base_queryset.filter(assigned_to_id=user_param)
                
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
            
            overdue_param = self.request.query_params.get('overdue')
            if overdue_param and overdue_param.lower() == 'true':
                today_datetime = timezone.now() # Datetime for comparison
                # Tasks whose deadline has passed and are not completed or cancelled
                base_queryset = base_queryset.filter(deadline__lt=today_datetime.date(), status__in=['pending', 'in_progress'])
                
            due_param = self.request.query_params.get('due')
            if due_param:
                today_date = timezone.now().date()
                if due_param == 'today':
                    base_queryset = base_queryset.filter(deadline=today_date)
                elif due_param == 'this-week':
                    week_start = today_date - timedelta(days=today_date.weekday())
                    week_end = week_start + timedelta(days=6)
                    base_queryset = base_queryset.filter(deadline__range=[week_start, week_end])
            
            if not profile.organization: # User must belong to an organization to see tasks
                return Task.objects.none()
                
            # Filter by organization first
            org_queryset = base_queryset.filter(client__organization=profile.organization)

            if profile.is_org_admin or profile.can_view_all_tasks:
                return org_queryset
            else:
                visible_client_ids = list(
                    profile.visible_clients.values_list('id', flat=True)
                )
                # User sees tasks for their visible clients OR tasks assigned to them within their org
                return org_queryset.filter(
                    Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            if user.is_superuser: # Superuser sees all tasks if no profile
                return base_queryset # Or apply other filters as needed for superuser
            return Task.objects.none()
        
    def perform_create(self, serializer):
        try:
            profile = Profile.objects.select_related('organization').get(user=self.request.user)
            
            if not (profile.is_org_admin or profile.can_create_tasks):
                raise PermissionDenied("Você não tem permissão para criar tarefas")
                
            client_id = self.request.data.get('client')
            client_instance = None
            if client_id:
                try:
                    client_instance = Client.objects.select_related('organization').get(id=client_id)
                    if client_instance.organization != profile.organization:
                         raise PermissionDenied("Não pode criar tarefa para cliente de outra organização.")
                    if not profile.can_access_client(client_instance): # Checks visibility if not admin
                        raise PermissionDenied("Você não tem acesso a este cliente para criar tarefas")
                except Client.DoesNotExist:
                    raise ValidationError({"client": "Cliente não encontrado."})
            else:
                raise ValidationError({"client": "Cliente é obrigatório."})

            task = serializer.save(created_by=self.request.user, client=client_instance) # Pass client instance

            workflow_id = self.request.data.get('workflow')
            if workflow_id:
                try:
                    workflow = WorkflowDefinition.objects.get(id=workflow_id, is_active=True)
                    # Add check: if workflow.organization and workflow.organization != profile.organization: PermissionDenied
                    first_step = workflow.steps.order_by('order').first()
                    if first_step:
                        task.workflow = workflow
                        task.current_workflow_step = first_step
                        task.save(update_fields=['workflow', 'current_workflow_step'])
                        WorkflowHistory.objects.create(
                            task=task, from_step=None, to_step=first_step,
                            changed_by=self.request.user, action='workflow_assigned',
                            comment=f"Workflow '{workflow.name}' atribuído na criação da tarefa."
                        )
                        NotificationService.notify_workflow_assigned(task, self.request.user)
                    else:
                        logger.warning(f"Workflow {workflow_id} selecionado para tarefa {task.id} não tem passos definidos.")
                except WorkflowDefinition.DoesNotExist:
                    logger.warning(f"Workflow {workflow_id} não encontrado ou inativo para tarefa {task.id}.")

        except Profile.DoesNotExist:
            # Superuser creation logic (if different)
            if self.request.user.is_superuser:
                client_id = self.request.data.get('client')
                if not client_id: raise ValidationError({"client": "Cliente é obrigatório."})
                try:
                    client_instance = Client.objects.get(id=client_id)
                    serializer.save(created_by=self.request.user, client=client_instance)
                except Client.DoesNotExist:
                    raise ValidationError({"client": "Cliente não encontrado."})
            else:
                raise PermissionDenied("Perfil de usuário não encontrado")
       
    def update(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.get(user=request.user)
            task_instance = self.get_object()
            
            can_edit = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or 
                (profile.can_edit_assigned_tasks and task_instance.assigned_to == request.user)
            )
            
            if not can_edit:
                raise PermissionDenied("Você não tem permissão para editar esta tarefa")
            
            # Ensure task belongs to the user's organization
            if task_instance.client.organization != profile.organization and not profile.is_org_admin:
                raise PermissionDenied("Não pode editar tarefas de outra organização.")

            client_id = request.data.get('client')
            if client_id and str(task_instance.client.id) != client_id:
                try:
                    new_client = Client.objects.get(id=client_id)
                    if new_client.organization != profile.organization and not profile.is_org_admin:
                        raise PermissionDenied("Não pode mover tarefa para cliente de outra organização.")
                    if not profile.can_access_client(new_client):
                        raise PermissionDenied("Você não tem acesso ao novo cliente selecionado")
                except Client.DoesNotExist:
                    raise ValidationError({"client": "Novo cliente não encontrado."})
            
            old_workflow_id = str(task_instance.workflow.id) if task_instance.workflow else None
            new_workflow_id_from_request = request.data.get('workflow') # Could be null or empty string

            response = super().update(request, *args, **kwargs)
            task_instance.refresh_from_db() 

            # Handle workflow change or assignment
            new_workflow_id = str(task_instance.workflow.id) if task_instance.workflow else None # ID from saved task

            if new_workflow_id != old_workflow_id:
                if task_instance.workflow: # A new workflow was set (or changed)
                    first_step = task_instance.workflow.steps.order_by('order').first()
                    if first_step:
                        task_instance.current_workflow_step = first_step
                        task_instance.save(update_fields=['current_workflow_step'])
                        WorkflowHistory.objects.create(
                            task=task_instance, from_step=None, to_step=first_step,
                            changed_by=request.user, action='workflow_assigned',
                            comment=f"Workflow alterado para '{task_instance.workflow.name}'."
                        )
                        NotificationService.notify_workflow_assigned(task_instance, request.user)
                    else: # New workflow has no steps, effectively remove it
                        task_instance.workflow = None
                        task_instance.current_workflow_step = None
                        task_instance.save(update_fields=['workflow', 'current_workflow_step'])
                        logger.warning(f"Workflow {new_workflow_id} atribuído à tarefa {task_instance.id} não tem passos.")
                else: # Workflow was removed (new_workflow_id is None but old_workflow_id was not)
                    # current_workflow_step should have been set to None by serializer or model signal
                    if task_instance.current_workflow_step is not None: # Defensive clear
                        task_instance.current_workflow_step = None
                        task_instance.save(update_fields=['current_workflow_step'])
                    WorkflowHistory.objects.create(
                        task=task_instance, from_step=None, to_step=None, # From step might be complex to get here if cleared
                        changed_by=request.user, action='workflow_assigned', # Or 'workflow_removed'
                        comment="Workflow removido da tarefa."
                    )
            return response
            
        except Profile.DoesNotExist:
            if request.user.is_superuser: return super().update(request, *args, **kwargs)
            raise PermissionDenied("Perfil de usuário não encontrado")
            
    def destroy(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.get(user=request.user)
            task_instance = self.get_object()

            if not (profile.is_org_admin or profile.can_delete_tasks):
                raise PermissionDenied("Você não tem permissão para excluir tarefas")

            if task_instance.client.organization != profile.organization and not request.user.is_superuser:
                raise PermissionDenied("Não pode excluir tarefas de outra organização.")
                
            return super().destroy(request, *args, **kwargs)
        except Profile.DoesNotExist:
            if request.user.is_superuser: return super().destroy(request, *args, **kwargs)
            raise PermissionDenied("Perfil de usuário não encontrado")
            
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({"error": "Status é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        if new_status not in [s[0] for s in Task.STATUS_CHOICES]:
            return Response({"error": "Status inválido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = Profile.objects.get(user=request.user)
            can_edit = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or 
                (profile.can_edit_assigned_tasks and task.assigned_to == request.user)
            )
            
            if not can_edit:
                raise PermissionDenied("Você não tem permissão para atualizar o status desta tarefa")
            
            if task.client.organization != profile.organization and not profile.is_org_admin :
                 raise PermissionDenied("Não pode atualizar status de tarefa de outra organização.")

            old_status = task.status
            task.status = new_status
            
            if new_status == 'completed':
                task.completed_at = timezone.now()
                if task.workflow and task.current_workflow_step: # If workflow active, complete it
                    WorkflowHistory.objects.create(
                        task=task, from_step=task.current_workflow_step, to_step=None,
                        changed_by=request.user, action='workflow_completed',
                        comment=f"Workflow concluído ao marcar tarefa como '{new_status}'."
                    )
                    NotificationService.notify_workflow_completed(task, request.user)
                    task.current_workflow_step = None 
            elif old_status == 'completed' and new_status != 'completed': 
                task.completed_at = None
                if task.workflow and not task.current_workflow_step: # Workflow was completed, now task reopened
                    first_step = task.workflow.steps.order_by('order').first()
                    if first_step:
                        task.current_workflow_step = first_step
                        WorkflowHistory.objects.create(
                            task=task, from_step=None, to_step=first_step,
                            changed_by=request.user, action='workflow_assigned', 
                            comment=f"Workflow reativado para '{first_step.name}' ao reabrir tarefa (status: '{new_status}')."
                        )
                        NotificationService.notify_step_ready(task, first_step, request.user)


            task.save()
            serializer = self.get_serializer(task)
            return Response(serializer.data)
            
        except Profile.DoesNotExist:
            if request.user.is_superuser: # Allow superuser if no profile
                task.status = new_status
                if new_status == 'completed': task.completed_at = timezone.now()
                else: task.completed_at = None
                task.save()
                return Response(self.get_serializer(task).data)
            raise PermissionDenied("Perfil de usuário não encontrado")

    def _advance_workflow_step(self, task, completed_step, user, comment_for_advance=""):
        logger.info(f"Avançando workflow da tarefa {task.id} a partir do passo {completed_step.name if completed_step else 'N/A'}")
        
        if not completed_step:
            logger.error(f"Tentativa de avançar workflow sem um completed_step para tarefa {task.id}")
            return

        if completed_step.requires_approval:
            is_approved = TaskApproval.objects.filter(
                task=task,
                workflow_step=completed_step,
                approved=True
            ).exists()
            if not is_approved:
                logger.info(f"Passo {completed_step.name} da tarefa {task.id} requer aprovação antes de avançar.")
                NotificationService.notify_approval_needed(task, completed_step) # Uses service
                return

        try:
            next_step_ids = completed_step.get_next_steps() # Use model's method
        except Exception as e: # Catch potential errors from get_next_steps if it parses JSON badly
            logger.error(f"Erro ao obter next_steps para o passo {completed_step.id} ({completed_step.name}): {e}")
            next_step_ids = []

        if not next_step_ids: # No more steps, workflow ends
            task.current_workflow_step = None
            if task.status != 'completed': # Avoid re-setting if already completed
                task.status = 'completed'
                task.completed_at = timezone.now()
            task.save(update_fields=['current_workflow_step', 'status', 'completed_at'])
            
            WorkflowHistory.objects.create(
                task=task, from_step=completed_step, to_step=None, changed_by=user,
                action='workflow_completed',
                comment=f"Workflow concluído após passo: {completed_step.name}. {comment_for_advance}".strip()
            )
            NotificationService.notify_workflow_completed(task, user) # Uses service
            logger.info(f"Workflow concluído para tarefa {task.id} após passo {completed_step.name}.")
            return

        if len(next_step_ids) == 1:
            try:
                next_step = WorkflowStep.objects.get(id=next_step_ids[0])
                task.current_workflow_step = next_step
                task.save(update_fields=['current_workflow_step'])
                
                WorkflowHistory.objects.create(
                    task=task, from_step=completed_step, to_step=next_step, changed_by=user,
                    action='step_advanced',
                    comment=f"Avançado de '{completed_step.name}' para '{next_step.name}'. {comment_for_advance}".strip()
                )
                NotificationService.notify_step_completed(task, completed_step, user) # Uses service
                NotificationService.notify_step_ready(task, next_step, user) # Uses service
                logger.info(f"Workflow para tarefa {task.id} avançado de {completed_step.name} para {next_step.name}.")
            except WorkflowStep.DoesNotExist:
                logger.error(f"Próximo passo com ID {next_step_ids[0]} não encontrado para tarefa {task.id}.")
        else: # Multiple next steps
            logger.info(f"Múltiplos próximos passos ({len(next_step_ids)}) para tarefa {task.id} a partir do passo {completed_step.name}. Requer escolha manual.")
            
            # ==============================================================================
            # NEW: Get next steps information and send manual advance notification
            # ==============================================================================
            try:
                next_steps_available = []
                for step_id in next_step_ids:
                    try:
                        step = WorkflowStep.objects.get(id=step_id)
                        next_steps_available.append({
                            'id': str(step.id),
                            'name': step.name,
                            'description': step.description or '',
                            'assign_to': step.assign_to.username if step.assign_to else None,
                            'requires_approval': step.requires_approval
                        })
                    except WorkflowStep.DoesNotExist:
                        logger.warning(f"Passo com ID {step_id} não encontrado ao preparar notificação de escolha manual")
                        continue
                
                if next_steps_available:
                    # Send notification for manual advance needed
                    NotificationService.notify_manual_advance_needed(
                        task=task,
                        workflow_step=completed_step,
                        next_steps_available=next_steps_available
                    )
                else:
                    logger.error(f"Nenhum passo válido encontrado para escolha manual na tarefa {task.id}")
                    
            except Exception as e:
                logger.error(f"Erro ao processar notificação de escolha manual para tarefa {task.id}: {e}")
                # Fallback to original behavior if notification fails
                responsible_user = task.assigned_to or task.created_by # Fallback
                if responsible_user and responsible_user.is_active:
                    NotificationService.create_notification(
                        user=responsible_user, task=task, workflow_step=completed_step,
                        notification_type='manual_advance_needed',
                        title=f"Escolha o próximo passo para: {task.title}",
                        message=f"A tarefa '{task.title}' completou o passo '{completed_step.name}' e tem múltiplos caminhos. Avance manualmente.",
                        priority='high'
                    )

    @action(detail=True, methods=['post'])
    def advance_workflow(self, request, pk=None): # Manual advance
        task = self.get_object()
        
        if not task.workflow or not task.current_workflow_step:
            return Response({"error": "Esta tarefa não possui workflow ativo ou passo atual definido"}, status=status.HTTP_400_BAD_REQUEST)
        
        next_step_id = request.data.get('next_step_id')
        comment = request.data.get('comment', '')
        
        if not next_step_id:
            return Response({"error": "ID do próximo passo é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            profile = Profile.objects.get(user=request.user)
            current_step = task.current_workflow_step

            can_advance = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or # or specific workflow management perm
                (profile.can_edit_assigned_tasks and task.assigned_to == request.user) or
                (current_step.assign_to == request.user) 
            )
            if not can_advance:
                raise PermissionDenied("Você não tem permissão para avançar este workflow")

            possible_next_step_ids = current_step.get_next_steps()
            
            if str(next_step_id) not in possible_next_step_ids and next_step_id != 'complete_workflow':
                return Response({"error": "Passo inválido para esta transição."}, status=status.HTTP_400_BAD_REQUEST)
            
            if current_step.requires_approval:
                if not TaskApproval.objects.filter(task=task, workflow_step=current_step, approved=True).exists():
                    return Response({"error": "Este passo requer aprovação antes de avançar"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark current step as completed (if not already marked through other means like time entry)
            if not WorkflowHistory.objects.filter(task=task, from_step=current_step, action__in=['step_completed', 'step_advanced']).exists():
                WorkflowHistory.objects.create(
                    task=task, from_step=current_step, to_step=None, 
                    changed_by=request.user, action='step_completed',
                    comment=comment or f"Passo '{current_step.name}' concluído manualmente para avançar."
                )
                NotificationService.notify_step_completed(task, current_step, request.user)

            if next_step_id == 'complete_workflow':
                task.current_workflow_step = None
                if task.status != 'completed':
                    task.status = 'completed'
                    task.completed_at = timezone.now()
                task.workflow_comment = comment
                task.save()
                
                WorkflowHistory.objects.create(
                    task=task, from_step=current_step, to_step=None, changed_by=request.user,
                    action='workflow_completed',
                    comment=comment or f"Workflow finalizado manualmente no passo '{current_step.name}'"
                )
                NotificationService.notify_workflow_completed(task, request.user)
                return Response({"success": True, "message": "Workflow finalizado com sucesso"}, status=status.HTTP_200_OK)

            next_step = WorkflowStep.objects.get(id=next_step_id)
            task.current_workflow_step = next_step
            task.workflow_comment = comment
            task.save()
            
            WorkflowHistory.objects.create(
                task=task, from_step=current_step, to_step=next_step, changed_by=request.user,
                action='step_advanced',
                comment=comment or f"Workflow avançado de '{current_step.name}' para '{next_step.name}'"
            )
            NotificationService.notify_step_ready(task, next_step, request.user)
            
            return Response({"success": True, "message": "Workflow avançado com sucesso"}, status=status.HTTP_200_OK)
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil de usuário não encontrado")
        except WorkflowStep.DoesNotExist:
            return Response({"error": "Passo do workflow não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def workflow_status(self, request, pk=None):
        task = self.get_object()
        
        if not task.workflow:
            return Response({"workflow": None, "message": "Tarefa não tem workflow atribuído."})
        
        workflow_definition = task.workflow
        all_steps_qs = workflow_definition.steps.order_by('order')
        
        history_qs = WorkflowHistory.objects.filter(task=task).select_related(
            'from_step', 'to_step', 'changed_by__profile' # Added profile for username if needed via serializer
        ).order_by('-created_at')
        
        approvals_qs = TaskApproval.objects.filter(task=task).select_related(
            'workflow_step', 'approved_by__profile' # Added profile for username if needed via serializer
        )
        
        time_by_step = {}
        for step_obj in all_steps_qs:
            step_time_entries = TimeEntry.objects.filter(task=task, workflow_step=step_obj)
            total_minutes = step_time_entries.aggregate(total=models.Sum('minutes_spent'))['total'] or 0
            time_by_step[str(step_obj.id)] = total_minutes

        completed_step_ids = set()
        workflow_is_completed = history_qs.filter(action='workflow_completed').exists()
        
        current_step_in_definition = None
        if task.current_workflow_step:
            try: 
                current_step_in_definition = all_steps_qs.get(id=task.current_workflow_step_id)
            except WorkflowStep.DoesNotExist:
                 logger.warning(f"Current step {task.current_workflow_step_id} for task {task.id} not found in definition {workflow_definition.id}. Workflow status might be inaccurate.")
                 # task.current_workflow_step = None # Don't save here, just impacts display
        
        if workflow_is_completed and not current_step_in_definition :
            completed_step_ids.update(str(s.id) for s in all_steps_qs)
        else:
            for entry in history_qs.filter(action__in=['step_completed', 'step_advanced']):
                if entry.from_step_id:
                    completed_step_ids.add(str(entry.from_step_id))
            if current_step_in_definition:
                for step_obj in all_steps_qs:
                    if step_obj.order < current_step_in_definition.order:
                        completed_step_ids.add(str(step_obj.id))
        
        completed_count = len(completed_step_ids)
        total_steps_count = all_steps_qs.count()

        if workflow_is_completed:
            current_step_display_number = total_steps_count 
            percentage = 100.0
        elif current_step_in_definition:
            current_step_display_number = current_step_in_definition.order
            percentage = (completed_count / total_steps_count) * 100 if total_steps_count > 0 else 0.0
        else: 
            current_step_display_number = 1 if total_steps_count > 0 else 0 
            percentage = 0.0


        response_data = {
            'task': TaskSerializer(task).data, # Serialize the task object
            'workflow': {
                'id': workflow_definition.id,
                'name': workflow_definition.name,
                'is_completed': workflow_is_completed,
                'steps': [], # Will be populated below
                'time_by_step': time_by_step,
                'progress': {
                    'current_step': current_step_display_number,
                    'completed_steps': completed_count,
                    'total_steps': total_steps_count,
                    'percentage': round(percentage, 1)
                }
            },
            'current_step_dynamic': WorkflowStepSerializer(current_step_in_definition).data if current_step_in_definition else None,
            'history': WorkflowHistorySerializer(history_qs[:50], many=True).data,
            'approvals': TaskApprovalSerializer(approvals_qs, many=True).data,
        }

        for step_obj in all_steps_qs:
            step_id_str = str(step_obj.id)
            step_data = WorkflowStepSerializer(step_obj).data # Use serializer for consistency
            step_data['is_current'] = current_step_in_definition is not None and current_step_in_definition.id == step_obj.id
            step_data['is_completed'] = step_id_str in completed_step_ids
            step_data['time_spent'] = time_by_step.get(step_id_str, 0)
            response_data['workflow']['steps'].append(step_data)
            
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
                profile = Profile.objects.select_related('organization').get(user=user)
                
                base_queryset = TimeEntry.objects.select_related(
                    'user', # User object
                    'client__organization',
                    'client__account_manager', # User object
                    'task__category',
                    'task__assigned_to', # User object
                    'category',
                    'workflow_step' 
                )
                
                start_date = self.request.query_params.get('start_date')
                end_date = self.request.query_params.get('end_date')
                if start_date and end_date:
                    try:
                        datetime.strptime(start_date, '%Y-%m-%d')
                        datetime.strptime(end_date, '%Y-%m-%d')
                        base_queryset = base_queryset.filter(date__range=[start_date, end_date])
                    except ValueError:
                        raise ValidationError("Formato de data inválido. Use YYYY-MM-DD.")

                client_id = self.request.query_params.get('client')
                if client_id:
                    base_queryset = base_queryset.filter(client_id=client_id)
                    
                user_id_param = self.request.query_params.get('user') # User ID for filtering
                if user_id_param:
                    base_queryset = base_queryset.filter(user_id=user_id_param)
                
                task_id = self.request.query_params.get('task') 
                if task_id:
                    base_queryset = base_queryset.filter(task_id=task_id)

                if not profile.organization:
                    return TimeEntry.objects.none()

                # Filter by organization
                org_queryset = base_queryset.filter(client__organization=profile.organization)

                if profile.is_org_admin or profile.can_view_team_time: # can_view_team_time implies for whole org
                    return org_queryset
                else: # Regular user: sees own time entries + time entries for visible clients (even if by other users)
                    visible_client_ids = list(
                        profile.visible_clients.values_list('id', flat=True)
                    )
                    return org_queryset.filter(
                        Q(user=user) | Q(client_id__in=visible_client_ids)
                    ).distinct()
                    
            except Profile.DoesNotExist: 
                if user.is_superuser: # Superuser sees all if no profile
                    return base_queryset # Or apply other query params for superuser
                return TimeEntry.objects.filter(user=user).select_related( # Fallback for users without profile (should be rare)
                    'user', 'client', 'task', 'category', 'workflow_step'
                )
            except ValidationError as e: # Catch date validation error
                # This isn't standard for get_queryset, usually validation is in serializer or view actions
                # Consider how to best return this error. DRF might handle some query param validation.
                # For now, let it raise, or return empty queryset with a log.
                logger.error(f"Validation error in TimeEntry queryset: {e}")
                return TimeEntry.objects.none() # Or raise
    
    def perform_create(self, serializer):
        user = self.request.user
        try:
            profile = Profile.objects.get(user=user)
            if not profile.can_log_time:
                raise PermissionDenied("Você não tem permissão para registrar tempo")
            
            client_id = serializer.validated_data.get('client').id if serializer.validated_data.get('client') else None
            if client_id:
                client = Client.objects.get(id=client_id) # Already validated by serializer if client is a field
                if client.organization != profile.organization and not profile.is_org_admin : # Org check
                     raise PermissionDenied("Não pode registrar tempo para cliente de outra organização.")
                if not profile.can_access_client(client):
                    raise PermissionDenied("Você não tem acesso a este cliente para registrar tempo")
            
        except Profile.DoesNotExist:
            if not user.is_superuser:
                 raise PermissionDenied("Perfil de usuário não encontrado e sem permissão para registrar tempo")
        # Client.DoesNotExist should be handled by serializer if client is required.

        time_entry = serializer.save(user=user)
        # Use TaskViewSet's internal method if appropriate, or replicate logic carefully.
        # Replicating for now, but ensure it's consistent.
        task_viewset = TaskViewSet()
        task_viewset.request = self.request # provide request to the other viewset if it needs it

        self._process_workflow_step(time_entry, task_viewset) # Pass task_viewset instance
        self._update_task_status_if_needed(time_entry) # This one is local
        
    def _process_workflow_step(self, time_entry, task_viewset_instance): # Added task_viewset_instance
        if not time_entry.task or not time_entry.task.workflow:
            return
            
        task = time_entry.task
        step_being_worked_on = time_entry.workflow_step
        
        if not step_being_worked_on and task.current_workflow_step:
            step_being_worked_on = task.current_workflow_step
            time_entry.workflow_step = step_being_worked_on
            time_entry.save(update_fields=['workflow_step'])
        
        if not step_being_worked_on:
            logger.warning(f"Nenhum passo de workflow determinado para time entry {time_entry.id} da tarefa {task.id}")
            return

        WorkflowHistory.objects.create(
            task=task, from_step=step_being_worked_on, to_step=None, 
            changed_by=time_entry.user, action='step_work_logged',
            comment=f"Tempo: {time_entry.minutes_spent}m no passo '{step_being_worked_on.name}'. Desc: {time_entry.description}",
            time_spent_minutes=time_entry.minutes_spent
        )
        
        if time_entry.workflow_step_completed:
            if not WorkflowHistory.objects.filter(task=task, from_step=step_being_worked_on,action='step_completed').exists():
                WorkflowHistory.objects.create(
                    task=task, from_step=step_being_worked_on, to_step=None, 
                    changed_by=time_entry.user, action='step_completed',
                    comment=f"Passo '{step_being_worked_on.name}' concluído via registro de tempo."
                )
                NotificationService.notify_step_completed(task, step_being_worked_on, time_entry.user)
            
            if time_entry.advance_workflow:
                if task.current_workflow_step == step_being_worked_on:
                    task_viewset_instance._advance_workflow_step(task, step_being_worked_on, time_entry.user, 
                                                                f"Avançado após registro de tempo: {time_entry.description}")
                else:
                    logger.warning(f"Tentativa de avançar wf para tarefa {task.id} do passo {step_being_worked_on.name}, mas atual é {task.current_workflow_step.name if task.current_workflow_step else 'Nenhum'}. Ignorado.")
    
    def _update_task_status_if_needed(self, time_entry): # This is fine as a local method
        if time_entry.task and time_entry.task_status_after != 'no_change':
            old_status = time_entry.task.status
            new_status = time_entry.task_status_after
            
            if new_status not in [s[0] for s in Task.STATUS_CHOICES]:
                logger.error(f"Status inválido '{new_status}' para tarefa {time_entry.task.id} em time_entry.")
                return

            time_entry.task.status = new_status
            if new_status == 'completed':
                time_entry.task.completed_at = timezone.now()
                if time_entry.task.workflow and time_entry.task.current_workflow_step:
                    WorkflowHistory.objects.create(
                        task=time_entry.task, from_step=time_entry.task.current_workflow_step, to_step=None,
                        changed_by=time_entry.user, action='workflow_completed',
                        comment=f"Workflow concluído: tarefa '{new_status}' via registro de tempo."
                    )
                    NotificationService.notify_workflow_completed(time_entry.task, time_entry.user)
                    time_entry.task.current_workflow_step = None
            elif old_status == 'completed' and new_status != 'completed':
                time_entry.task.completed_at = None
                if time_entry.task.workflow and not time_entry.task.current_workflow_step:
                    first_step = time_entry.task.workflow.steps.order_by('order').first()
                    if first_step:
                        time_entry.task.current_workflow_step = first_step
                        # Consider logging workflow reactivation
            time_entry.task.save()
            logger.info(f"Status da tarefa {time_entry.task.title} alterado de {old_status} para {new_status} via time entry.")
    
    def update(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.get(user=request.user)
            time_entry_instance = self.get_object()
            can_edit = (
                profile.is_org_admin or 
                profile.can_edit_all_time or 
                (profile.can_edit_own_time and time_entry_instance.user == request.user)
            )
            if not can_edit:
                raise PermissionDenied("Você não tem permissão para editar este registro de tempo")

            if time_entry_instance.client.organization != profile.organization and not profile.is_org_admin:
                 raise PermissionDenied("Não pode editar registro de tempo de cliente de outra organização.")
                
            new_client_id = request.data.get('client')
            if new_client_id and str(time_entry_instance.client.id) != str(new_client_id):
                try:
                    new_client = Client.objects.get(id=new_client_id)
                    if new_client.organization != profile.organization and not profile.is_org_admin:
                        raise PermissionDenied("Não pode mover registro para cliente de outra organização.")
                    if not profile.can_access_client(new_client):
                        raise PermissionDenied("Você não tem acesso ao novo cliente selecionado")
                except Client.DoesNotExist:
                     raise ValidationError({"client": "Novo cliente não encontrado."})
            return super().update(request, *args, **kwargs)
        except Profile.DoesNotExist:
            if request.user.is_superuser:
                time_entry_instance = self.get_object()
                # Superuser can edit any, but not change client to other orgs unless specific logic allows
                return super().update(request, *args, **kwargs)
            raise PermissionDenied("Perfil de usuário não encontrado")
            
    def destroy(self, request, *args, **kwargs):
        try:
            profile = Profile.objects.get(user=request.user)
            time_entry_instance = self.get_object()
            can_delete = (
                profile.is_org_admin or 
                profile.can_edit_all_time or # Assuming can_edit_all_time implies can_delete_all_time
                (profile.can_edit_own_time and time_entry_instance.user == request.user) # edit_own implies delete_own
            )
            if not can_delete:
                raise PermissionDenied("Você não tem permissão para excluir este registro de tempo")

            if time_entry_instance.client.organization != profile.organization and not profile.is_org_admin:
                 raise PermissionDenied("Não pode excluir registro de tempo de cliente de outra organização.")
            return super().destroy(request, *args, **kwargs)
        except Profile.DoesNotExist:
            if request.user.is_superuser:
                return super().destroy(request, *args, **kwargs)
            raise PermissionDenied("Perfil de usuário não encontrado")
            
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        entries_data = request.data.get('entries', [])
        if not isinstance(entries_data, list):
            return Response({"error": "O campo 'entries' deve ser uma lista."}, status=status.HTTP_400_BAD_REQUEST)
        if not entries_data:
            return Response({"error": "Nenhum registro de tempo fornecido"}, status=status.HTTP_400_BAD_REQUEST)
            
        profile = None
        if not request.user.is_superuser:
            try:
                profile = Profile.objects.get(user=request.user)
                if not profile.can_log_time:
                    raise PermissionDenied("Você não tem permissão para registrar tempo")
            except Profile.DoesNotExist:
                raise PermissionDenied("Perfil de usuário não encontrado e sem permissão para registrar tempo")

        created_entries_data = []
        errors = []

        for entry_data_item in entries_data: # Renamed to avoid conflict
            entry_data_item['user'] = request.user.id 
            
            client_id = entry_data_item.get('client')
            if client_id:
                try:
                    client = Client.objects.get(id=client_id)
                    if profile and client.organization != profile.organization and not profile.is_org_admin:
                        errors.append({(entry_data_item.get('description') or f"Entrada para cliente {client_id}"): f"Cliente {client.name} não pertence à sua organização."})
                        continue
                    if profile and not profile.can_access_client(client):
                        errors.append({(entry_data_item.get('description') or f"Entrada para cliente {client_id}"): f"Sem acesso ao cliente {client.name}."})
                        continue
                except Client.DoesNotExist:
                    errors.append({(entry_data_item.get('description') or f"Entrada para cliente {client_id}"): f"Cliente com ID {client_id} não encontrado."})
                    continue
            
            serializer = self.get_serializer(data=entry_data_item)
            if serializer.is_valid():
                try:
                    time_entry_instance = serializer.save() 
                    created_entries_data.append(serializer.data)
                except PermissionDenied as e: 
                    errors.append({(entry_data_item.get('description') or f"Entrada") : str(e)})
                except Exception as e:
                     errors.append({(entry_data_item.get('description') or f"Entrada") : f"Erro ao salvar: {str(e)}"})
            else:
                errors.append({(entry_data_item.get('description') or f"Entrada") : serializer.errors})

        status_code = status.HTTP_201_CREATED
        response_payload = {"created_entries": created_entries_data}

        if errors:
            response_payload["errors"] = errors
            response_payload["message"] = "Alguns registros não puderam ser criados."
            status_code = status.HTTP_207_MULTI_STATUS if created_entries_data else status.HTTP_400_BAD_REQUEST
        
        return Response(response_payload, status=status_code)
               
class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Expense.objects.select_related(
            'client__organization',
            'created_by__profile' # For created_by_name if needed via serializer
        )
        
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization:
                    return Expense.objects.none()
                queryset = queryset.filter(client__organization=profile.organization)
                
                if not (profile.is_org_admin or profile.can_manage_expenses): # Assuming can_view_expenses is covered by can_manage_expenses
                    # If user cannot manage all, they can only see expenses they created
                    # or expenses for clients they have visibility on (more complex)
                    queryset = queryset.filter(created_by=user) 
            except Profile.DoesNotExist:
                return Expense.objects.none()

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            try:
                datetime.strptime(start_date, '%Y-%m-%d')
                datetime.strptime(end_date, '%Y-%m-%d')
                queryset = queryset.filter(date__range=[start_date, end_date])
            except ValueError:
                 raise ValidationError("Formato de data inválido. Use YYYY-MM-DD.")
            
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not (profile.is_org_admin or profile.can_manage_expenses):
                    raise PermissionDenied("Você não tem permissão para criar despesas.")
                
                # Ensure client for expense is in user's org
                client_id = serializer.validated_data.get('client').id if serializer.validated_data.get('client') else None
                if client_id:
                    client_for_expense = Client.objects.get(id=client_id)
                    if client_for_expense.organization != profile.organization:
                        raise PermissionDenied("Não pode criar despesa para cliente de outra organização.")
            except Profile.DoesNotExist:
                raise PermissionDenied("Perfil não encontrado e sem permissão para criar despesas.")
            except Client.DoesNotExist:
                 raise ValidationError({"client": "Cliente para despesa não encontrado."})

        serializer.save(created_by=user)

class ClientProfitabilityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientProfitabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.select_related('organization').get(user=user)
            
            if not profile.organization:
                return ClientProfitability.objects.none()
            
            # Base queryset filtered by user's organization
            base_queryset = ClientProfitability.objects.filter(
                client__organization=profile.organization
            ).select_related(
                'client__organization', # Already filtered, but good for select_related
                'client__account_manager__profile' # For account manager name
            )
            
            # Permissions check for viewing profitability
            can_view_any_profitability = (
                profile.is_org_admin or 
                profile.can_view_organization_profitability or 
                profile.can_view_team_profitability or 
                profile.can_view_profitability # Generic can_view_profitability
            )
            if not can_view_any_profitability:
                return ClientProfitability.objects.none()

            # Apply specific filters if user has some level of profitability view
            year = self.request.query_params.get('year')
            month = self.request.query_params.get('month')
            if year and month:
                try:
                    base_queryset = base_queryset.filter(year=int(year), month=int(month))
                except ValueError:
                    raise ValidationError("Ano e mês devem ser números inteiros.")

            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
                
            is_profitable_param = self.request.query_params.get('is_profitable')
            if is_profitable_param is not None:
                is_profitable_bool = is_profitable_param.lower() == 'true'
                base_queryset = base_queryset.filter(is_profitable=is_profitable_bool)
            
            # Filter based on the *type* of profitability permission
            if profile.is_org_admin or profile.can_view_organization_profitability:
                return base_queryset # Sees all for their org
            elif profile.can_view_team_profitability:
                # This is complex: depends on team definition.
                # If team means "clients managed by users in my role/dept", needs more logic.
                # A simpler interpretation: if they can view team, they see all in their org.
                # This should ideally be more granular based on Profile.get_team_members() or similar.
                # For now, if they have this perm, they see all their org's profitability records.
                return base_queryset 
            elif profile.can_view_profitability: # User can view profitability for their visible clients
                visible_client_ids = list(
                    profile.visible_clients.values_list('id', flat=True)
                )
                return base_queryset.filter(client_id__in=visible_client_ids)
            
            return ClientProfitability.objects.none() # Should be caught by initial perm check
                
        except Profile.DoesNotExist:
            if user.is_superuser: # Superuser sees all if no profile
                return ClientProfitability.objects.select_related('client__organization', 'client__account_manager')
            return ClientProfitability.objects.none()
        except ValidationError as e: # Return DRF response for validation error
            # This approach for handling ValidationError in get_queryset isn't standard.
            # Usually, query param validation happens earlier or in filter backends.
            # For now, logging and returning empty or re-raising for DRF to handle.
            logger.error(f"Validation error in ClientProfitability queryset: {e}")
            return ClientProfitability.objects.none() 


class NLPProcessorViewSet(viewsets.ModelViewSet):
    queryset = NLPProcessor.objects.all() # NLP patterns are often global
    serializer_class = NLPProcessorSerializer
    permission_classes = [IsAuthenticated] 
    
    # For creating/editing patterns, usually restricted to admins
    def perform_create(self, serializer):
        if not self.request.user.is_staff: # Example: only staff/admins can create patterns
            raise PermissionDenied("Apenas administradores podem criar padrões NLP.")
        serializer.save()
    # Add similar checks for update and destroy

    @action(detail=False, methods=['post'])
    def process_text(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        results = NLPProcessor.process_text(text, request.user)
        
        response_data = {
            'clients': [{'id': client.id, 'name': client.name} for client in results.get('clients', [])],
            'categories': [{'id': category.id, 'name': category.name} for category in results.get('categories', [])],
            'tasks': [{'id': task.id, 'title': task.title, 'client_id': str(task.client.id) if task.client else None, 'client_name': task.client.name if task.client else None} for task in results.get('tasks', [])],
            'times': results['times'],
            'activities': results['activities'],
            'confidence': results['confidence']
        }
        return Response(response_data)
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        text = request.data.get('text', '')
        client_id_param = request.data.get('client_id')
        task_id_param = request.data.get('task_id')
        date_str_param = request.data.get('date')
        
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        date_obj_for_entry = timezone.now().date()
        if date_str_param:
            try:
                date_obj_for_entry = datetime.strptime(date_str_param, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            profile = Profile.objects.get(user=request.user)
            if not profile.can_log_time:
                raise PermissionDenied("Você não tem permissão para registrar tempo via NLP.")
        except Profile.DoesNotExist:
             if not request.user.is_superuser:
                raise PermissionDenied("Perfil não encontrado e sem permissão para registrar tempo.")

        try:
            entries = NLPProcessor.create_time_entries_from_text(
                text, request.user, client_id_param, date_obj_for_entry, task_id_param
            )
            # After creation, process workflow and task status for each entry
            task_viewset_instance = TaskViewSet()
            task_viewset_instance.request = self.request
            time_entry_viewset_instance = TimeEntryViewSet()
            time_entry_viewset_instance.request = self.request

            for entry in entries:
                time_entry_viewset_instance._process_workflow_step(entry, task_viewset_instance)
                time_entry_viewset_instance._update_task_status_if_needed(entry)

            serializer = TimeEntrySerializer(entries, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except PermissionDenied as e: 
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e: 
            logger.error(f"Error in NLP create_time_entries: {str(e)}")
            return Response({'error': f"Erro ao processar: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class GeminiNLPViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.gemini_service = GeminiService() 

    @action(detail=False, methods=['post'])
    def process_text(self, request):
        text = request.data.get('text', '')
        default_client_id = request.data.get('client_id')
        
        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Fetching data needs to be permission-aware and efficient.
            # This is a simplified example. A DataService or more complex queries are needed.
            profile = request.user.profile if hasattr(request.user, 'profile') else None
            organization = profile.organization if profile else None

            clients_qs = Client.objects.none()
            tasks_qs = Task.objects.none()

            if organization:
                clients_qs = Client.objects.filter(is_active=True, organization=organization)
                tasks_qs = Task.objects.filter(status__in=['pending', 'in_progress'], client__organization=organization)
                
                if profile and not (profile.is_org_admin or profile.can_view_all_clients):
                    clients_qs = clients_qs.filter(id__in=profile.visible_clients.values_list('id', flat=True))
                if profile and not (profile.is_org_admin or profile.can_view_all_tasks):
                    tasks_qs = tasks_qs.filter(Q(client_id__in=profile.visible_clients.values_list('id', flat=True)) | Q(assigned_to=request.user))
            elif request.user.is_superuser: # Superuser might see all or a limited set for NLP
                clients_qs = Client.objects.filter(is_active=True)[:200] # Limit for safety
                tasks_qs = Task.objects.filter(status__in=['pending', 'in_progress'])[:500]

            clients_data = ClientSerializer(clients_qs[:50], many=True).data 
            tasks_data = TaskSerializer(tasks_qs.distinct()[:100], many=True).data 

            default_client_data = None
            if default_client_id:
                try:
                    default_client = Client.objects.get(id=default_client_id)
                    if profile and not profile.can_access_client(default_client):
                         return Response({'error': 'Acesso negado ao cliente padrão.'}, status=status.HTTP_403_FORBIDDEN)
                    default_client_data = ClientSerializer(default_client).data
                except Client.DoesNotExist:
                    pass 
            
            extracted_info_wrapper = self.gemini_service.process_text(
                text=text,
                clients=clients_data,
                tasks=tasks_data,
                default_client=default_client_data
            )
            
            if not extracted_info_wrapper.get('success', False):
                return Response({'error': extracted_info_wrapper.get('error', 'Failed to process text with Gemini')}, 
                                status=extracted_info_wrapper.get('status_code', status.HTTP_400_BAD_REQUEST))
            
            return Response(extracted_info_wrapper.get('data', {})) 
            
        except Exception as e:
            logger.error(f"Error in Gemini process_text: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': f"Erro interno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        # Implementation requires parsing Gemini's specific output format.
        # This is a placeholder and would need careful implementation based on Gemini's response structure.
        text = request.data.get('text', '')
        # default_client_id = request.data.get('client_id')
        # default_task_id = request.data.get('task_id')
        # date_str = request.data.get('date')
        # task_status_after = request.data.get('task_status_after', 'no_change')

        if not text:
            return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = Profile.objects.get(user=request.user)
            if not profile.can_log_time:
                raise PermissionDenied("Você não tem permissão para registrar tempo.")
        except Profile.DoesNotExist:
             if not request.user.is_superuser:
                raise PermissionDenied("Perfil não encontrado e sem permissão para registrar tempo.")
        
        # 1. Call self.process_text to get structured data from Gemini
        # For this, we need to reconstruct a request-like object or directly call the method's logic
        # This is a bit tricky as process_text expects a DRF Request.
        # A better way would be to have the core Gemini processing logic in gemini_service.py
        # callable with just text and context, then this view calls that.
        
        # Simplified: Assume gemini_service.extract_time_entry_details exists
        try:
            # This is a conceptual call. GeminiService would need to parse `text` and return
            # structured data similar to what NLPProcessor's parsing produces,
            # possibly including client_id, task_id, minutes_spent, description, date.
            # For example:
            # parsed_details_list = self.gemini_service.extract_time_entry_details(text, request.user, default_client_id, default_task_id, date_str)
            # if not parsed_details_list:
            #    return Response({"error": "Não foi possível extrair detalhes para registo de tempo do texto."}, status=status.HTTP_400_BAD_REQUEST)

            # created_entries = []
            # for details in parsed_details_list:
            #     # Validate and create TimeEntry objects here
            #     # entry_serializer = TimeEntrySerializer(data=details)
            #     # if entry_serializer.is_valid():
            #     #    entry = entry_serializer.save(user=request.user, original_text=text, task_status_after=task_status_after)
            #     #    self._process_workflow_and_status(entry) # Helper method
            #     #    created_entries.append(entry_serializer.data)
            #     # else:
            #     #    errors.append(entry_serializer.errors)
            # pass
            logger.warning("GeminiNLPViewSet.create_time_entries needs full implementation based on Gemini output.")
            return Response({'message': 'Gemini time entry creation via this endpoint is conceptual and requires specific parsing logic.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        except Exception as e:
            logger.error(f"Error in Gemini create_time_entries: {str(e)}")
            return Response({'error': f'Erro interno ao criar registos de tempo com Gemini: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WorkflowDefinitionViewSet(viewsets.ModelViewSet):
    # queryset already defined with prefetch
    serializer_class = WorkflowDefinitionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Base queryset from class definition
        queryset = WorkflowDefinition.objects.select_related('created_by').prefetch_related(
            Prefetch('steps', queryset=WorkflowStep.objects.select_related('assign_to').order_by('order'))
        )
        
        # Filter by organization if user has one and WorkflowDefinition has an org field (conceptual)
        # if hasattr(self.request.user, 'profile') and self.request.user.profile.organization:
        #     # Assuming WorkflowDefinition has an 'organization' ForeignKey
        #     # queryset = queryset.filter(organization=self.request.user.profile.organization)
        #     # If no direct org link, accessible workflows might be determined differently (e.g., global, or via tasks)
        #     pass # For now, no direct org filtering on WorkflowDefinition itself if not modeled

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        organization_to_assign = None
        try:
            profile = Profile.objects.get(user=user)
            if not (profile.is_org_admin or profile.can_create_workflows):
                raise PermissionDenied("Você não tem permissão para criar workflows")
            organization_to_assign = profile.organization # Assign to user's org
        except Profile.DoesNotExist:
            if not user.is_superuser: 
                raise PermissionDenied("Perfil de usuário não encontrado e sem permissão.")
        
        # If WorkflowDefinition model gets an 'organization' field:
        # serializer.save(created_by=user, organization=organization_to_assign)
        serializer.save(created_by=user) 
    
    def update(self, request, *args, **kwargs):
        user = request.user
        workflow_def = self.get_object() # Get instance before super().update
        try:
            profile = Profile.objects.get(user=user)
            if not (profile.is_org_admin or profile.can_edit_workflows):
                raise PermissionDenied("Você não tem permissão para editar workflows")
            # If WorkflowDefinition is org-specific:
            # if workflow_def.organization and workflow_def.organization != profile.organization:
            #    raise PermissionDenied("Não pode editar workflows de outra organização.")
        except Profile.DoesNotExist:
            if not user.is_superuser:
                raise PermissionDenied("Perfil de usuário não encontrado e sem permissão.")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        user = request.user
        workflow_def = self.get_object()
        try:
            profile = Profile.objects.get(user=user)
            if not (profile.is_org_admin or profile.can_manage_workflows): # Use can_manage for delete
                raise PermissionDenied("Você não tem permissão para excluir workflows")
            # If WorkflowDefinition is org-specific:
            # if workflow_def.organization and workflow_def.organization != profile.organization:
            #    raise PermissionDenied("Não pode excluir workflows de outra organização.")
        except Profile.DoesNotExist:
             if not user.is_superuser:
                raise PermissionDenied("Perfil de usuário não encontrado e sem permissão.")
        
        # Check if workflow is in use before deleting
        if Task.objects.filter(workflow=workflow_def).exists():
            return Response(
                {"error": "Este workflow está em uso por uma ou mais tarefas e não pode ser excluído."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def assign_to_task(self, request, pk=None):
        workflow = self.get_object()
        task_id = request.data.get('task_id')
        
        if not task_id:
            return Response({"error": "ID da tarefa é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        try:
            profile = Profile.objects.get(user=user)
            if not (profile.is_org_admin or profile.can_assign_workflows):
                raise PermissionDenied("Você não tem permissão para atribuir workflows")
                
            task = Task.objects.select_related('client__organization').get(id=task_id)
            
            # Ensure workflow and task are compatible (e.g., same organization if workflows are org-specific)
            # if hasattr(workflow, 'organization') and workflow.organization and workflow.organization != profile.organization:
            #    raise PermissionDenied("Este workflow não pertence à sua organização.")
            if task.client.organization != profile.organization and not profile.is_org_admin:
                 raise PermissionDenied("Não pode atribuir workflow a uma tarefa de cliente de outra organização.")

            if not profile.can_access_client(task.client): # Check visibility if not admin
                    raise PermissionDenied("Você não tem acesso ao cliente desta tarefa")
                    
            first_step = workflow.steps.order_by('order').first()
            if not first_step:
                return Response({"error": "Este workflow não possui passos definidos e não pode ser atribuído."}, 
                                status=status.HTTP_400_BAD_REQUEST)
                    
            task.workflow = workflow
            task.current_workflow_step = first_step
            # Reset task status if it was completed, to allow workflow to run
            if task.status == 'completed':
                task.status = 'pending' # Or 'in_progress'
                task.completed_at = None
            task.save()
            
            WorkflowHistory.objects.create(
                task=task, from_step=None, to_step=first_step, changed_by=user,
                action='workflow_assigned', comment=f"Workflow '{workflow.name}' atribuído."
            )
            NotificationService.notify_workflow_assigned(task, user)
                
            return Response(TaskSerializer(task).data, status=status.HTTP_200_OK) # Return updated task
                
        except Task.DoesNotExist:
            return Response({"error": "Tarefa não encontrada"}, status=status.HTTP_404_NOT_FOUND)
        except Profile.DoesNotExist:
            if user.is_superuser: # Superuser specific logic if needed
                # ... handle superuser case ...
                pass
            raise PermissionDenied("Perfil de usuário não encontrado")


class WorkflowStepViewSet(viewsets.ModelViewSet):
    queryset = WorkflowStep.objects.select_related('workflow', 'assign_to').order_by('workflow__name', 'order')
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)
        
        # Filter by organization if workflows are org-specific
        # user = self.request.user
        # if hasattr(user, 'profile') and user.profile.organization:
        #     queryset = queryset.filter(workflow__organization=user.profile.organization)
        # elif not user.is_superuser:
        #     return WorkflowStep.objects.none()
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        workflow_id = serializer.validated_data.get('workflow').id
        try:
            profile = Profile.objects.get(user=user)
            workflow_def = WorkflowDefinition.objects.get(id=workflow_id)
            # if hasattr(workflow_def, 'organization') and workflow_def.organization and workflow_def.organization != profile.organization:
            #    raise PermissionDenied("Não pode adicionar passos a workflows de outra organização.")
            if not (profile.is_org_admin or profile.can_edit_workflows): # Use edit_workflows for adding steps
                 raise PermissionDenied("Sem permissão para adicionar passos a este workflow.")
        except Profile.DoesNotExist:
            if not user.is_superuser:
                 raise PermissionDenied("Perfil não encontrado e sem permissão.")
        except WorkflowDefinition.DoesNotExist:
            raise ValidationError({"workflow": "WorkflowDefinition não encontrado."})
        serializer.save()

    def update(self, request, *args, **kwargs):
        user = request.user
        step_instance = self.get_object()
        try:
            profile = Profile.objects.get(user=user)
            # if hasattr(step_instance.workflow, 'organization') and step_instance.workflow.organization and step_instance.workflow.organization != profile.organization:
            #    raise PermissionDenied("Não pode modificar passos de workflows de outra organização.")
            if not (profile.is_org_admin or profile.can_edit_workflows):
                 raise PermissionDenied("Sem permissão para modificar passos deste workflow.")
        except Profile.DoesNotExist:
            if not user.is_superuser:
                raise PermissionDenied("Perfil não encontrado e sem permissão.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        step_instance = self.get_object()
        try:
            profile = Profile.objects.get(user=user)
            # if hasattr(step_instance.workflow, 'organization') and step_instance.workflow.organization and step_instance.workflow.organization != profile.organization:
            #    raise PermissionDenied("Não pode excluir passos de workflows de outra organização.")
            if not (profile.is_org_admin or profile.can_edit_workflows): # can_manage_workflows might be better here
                 raise PermissionDenied("Sem permissão para excluir passos deste workflow.")
        except Profile.DoesNotExist:
            if not user.is_superuser:
                raise PermissionDenied("Perfil não encontrado e sem permissão.")
        
        # Add check if step is part of an active task's current_workflow_step
        if Task.objects.filter(current_workflow_step=step_instance).exists():
            return Response(
                {"error": "Este passo está ativo em uma ou mais tarefas e não pode ser excluído."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class TaskApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = TaskApprovalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = TaskApproval.objects.select_related(
            'task__client__organization', 
            'workflow_step__workflow', # Include workflow for context if needed
            'approved_by__profile' 
        )
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)

        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization: return TaskApproval.objects.none()
                
                queryset = queryset.filter(task__client__organization=profile.organization)
                
                # Further filter: user should only see approvals if they can see the task, or are the approver, or are admin.
                if not (profile.is_org_admin or profile.can_view_all_tasks or profile.can_approve_tasks):
                    visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                    queryset = queryset.filter(
                        Q(task__client_id__in=visible_client_ids) | 
                        Q(task__assigned_to=user) | 
                        Q(approved_by=user)
                    )
            except Profile.DoesNotExist:
                return TaskApproval.objects.none()
        return queryset.distinct()
    
    def perform_create(self, serializer):
        user = self.request.user
        validated_data = serializer.validated_data
        task = validated_data.get('task')
        workflow_step = validated_data.get('workflow_step')

        if not task or not workflow_step: # Should be caught by serializer validation
            raise ValidationError("Tarefa e passo do workflow são obrigatórios.")

        try:
            profile = Profile.objects.get(user=user)
            # Permission to approve/reject:
            # 1. Org admin
            # 2. User has general 'can_approve_tasks'
            # 3. User's role matches 'approver_role' defined on the workflow_step
            # 4. (Optional) User is specifically assigned as an approver for this task/step (more complex model needed)
            
            can_approve_this_step = profile.is_org_admin or profile.can_approve_tasks
            if not can_approve_this_step and workflow_step.approver_role:
                # Simple role check (case-insensitive substring match)
                if workflow_step.approver_role.lower() not in profile.role.lower():
                    raise PermissionDenied("Seu papel não permite aprovar/rejeitar este passo.")
            elif not can_approve_this_step: # No general perm and no specific role match
                raise PermissionDenied("Você não tem permissão para aprovar/rejeitar este passo.")

            if task.client.organization != profile.organization and not profile.is_org_admin:
                raise PermissionDenied("Não pode aprovar/rejeitar passo de tarefa de outra organização.")

            if task.current_workflow_step != workflow_step:
                raise ValidationError(f"Só é possível aprovar/rejeitar o passo atual '{task.current_workflow_step.name if task.current_workflow_step else 'N/A'}'. Este passo é '{workflow_step.name}'.")

        except Profile.DoesNotExist:
            if not user.is_superuser:
                raise PermissionDenied("Perfil de usuário não encontrado.")
        
        # Check if an approval/rejection already exists for this user, step, task to prevent duplicates
        if TaskApproval.objects.filter(task=task, workflow_step=workflow_step, approved_by=user).exists():
            raise ValidationError("Você já submeteu uma aprovação/rejeição para este passo desta tarefa.")

        approval = serializer.save(approved_by=user) # approved_at is auto_now_add
        
        action_taken = 'step_approved' if approval.approved else 'step_rejected'
        WorkflowHistory.objects.create(
            task=task, from_step=workflow_step, to_step=workflow_step, 
            changed_by=user, action=action_taken,
            comment=approval.comment or f"Passo {workflow_step.name} {action_taken.split('_')[1]}."
        )
        
        # ==============================================================================
        # NEW: Add notification for approval completion
        # ==============================================================================
        NotificationService.notify_approval_completed(
            task=approval.task,
            workflow_step=approval.workflow_step,
            approval_record=approval,
            approved_by=approval.approved_by
        )
        
        if approval.approved:
            logger.info(f"Passo {workflow_step.name} da tarefa {task.id} APROVADO por {user.username}")
            # Consider auto-advancing workflow if all required approvals are met (if multiple approvers were possible)
            # For now, single approval is sufficient. The _advance_workflow_step will check this approval.
        else: 
            logger.info(f"Passo {workflow_step.name} da tarefa {task.id} REJEITADO por {user.username}")

class WorkflowStepDetailViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Base queryset
        queryset = WorkflowStep.objects.select_related(
            'workflow', 'assign_to__profile'
        ).prefetch_related(
            'time_entries__user__profile', 
            'task_approvals__approved_by__profile' 
        )
        
        workflow_id_param = self.request.query_params.get('workflow')
        if workflow_id_param:
            queryset = queryset.filter(workflow_id=workflow_id_param)
        
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization: return WorkflowStep.objects.none()
                
                # If workflows are org-specific, filter here:
                # queryset = queryset.filter(workflow__organization=profile.organization)
                
                # Permissions for viewing step details depend on workflow visibility
                # For now, assume if user can see workflows (via Task view or WorkflowDefinition view), they can see details
                if not (profile.is_org_admin or profile.can_view_all_tasks or profile.can_edit_workflows):
                    # This is tricky. If a user is assigned a step, they should see its details.
                    # For listing, maybe only show steps of workflows they have broader access to.
                    # For retrieve (/:id/), check if the step is part of a task they can see or are assigned to.
                    # This might require more context than available in get_queryset for a list.
                    # For now, if not admin/manager, restrict significantly or rely on task-based access.
                    return WorkflowStep.objects.none() # Placeholder - needs better logic for non-admins
            except Profile.DoesNotExist:
                return WorkflowStep.objects.none()
            
        return queryset.order_by('workflow__name', 'order')
    
    # For retrieve, you might add get_object and perform permission checks there.

    @action(detail=True, methods=['get'])
    def time_entries(self, request, pk=None):
        workflow_step = self.get_object() 
        user = request.user
        
        # Permission Check: Can user see time entries for this specific step?
        # This could depend on if they can see tasks associated with this step, or if they are an admin.
        # Simplified: check if user's org matches (if step's workflow is org-bound)
        # try:
        #     profile = Profile.objects.get(user=user)
        #     if hasattr(workflow_step.workflow, 'organization') and workflow_step.workflow.organization and workflow_step.workflow.organization != profile.organization:
        #         raise PermissionDenied("Acesso negado às entradas de tempo deste passo.")
        #     # Further checks if user is not admin (e.g., only if they are assigned to tasks on this step)
        # except Profile.DoesNotExist:
        #     if not user.is_superuser: raise PermissionDenied("Acesso negado.")


        time_entries_qs = TimeEntry.objects.filter(
            workflow_step=workflow_step
        ).select_related(
            'user__profile', 'task__client', 'client' # Added client direct from TimeEntry
        ).order_by('-date', '-created_at')
        
        # Further filter time_entries_qs based on user's visibility of tasks/clients if not admin
        # ...
        
        serializer = TimeEntrySerializer(time_entries_qs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def current_tasks(self, request, pk=None):
        workflow_step = self.get_object()
        user = request.user
        
        current_tasks_qs = Task.objects.filter(
            current_workflow_step=workflow_step
        ).select_related(
            'client__organization', 'assigned_to__profile', 'created_by__profile'
        )
        
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization: return Task.objects.none()
                
                current_tasks_qs = current_tasks_qs.filter(client__organization=profile.organization)
                
                if not (profile.is_org_admin or profile.can_view_all_tasks):
                    visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                    current_tasks_qs = current_tasks_qs.filter(
                        Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
                    ).distinct()
            except Profile.DoesNotExist:
                 return Task.objects.none()
        
        serializer = TaskSerializer(current_tasks_qs, many=True)
        return Response(serializer.data)
        
class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.prefetch_related(
                Prefetch('members', queryset=Profile.objects.select_related('user')),
                Prefetch('clients', queryset=Client.objects.select_related('account_manager'))
            )
        try:
            profile = Profile.objects.select_related('organization').get(user=user)
            if profile.organization:
                return Organization.objects.filter(id=profile.organization.id).prefetch_related(
                    Prefetch('members', queryset=Profile.objects.select_related('user')),
                    Prefetch('clients', queryset=Client.objects.select_related('account_manager__profile'))
                )
            return Organization.objects.none()
        except Profile.DoesNotExist:
            return Organization.objects.none()
        
    # apply_role_preset is a helper, not a view method. It needs to be defined elsewhere (e.g., Profile model or a service)
    # For other actions (add_member, remove_member, etc.), ensure robust permission checks:
    # - Requester must be part of the organization.
    # - Requester must be an is_org_admin.
    # - Target user/profile must be valid.
    # - For remove_member, cannot remove the last admin.

    def perform_create(self, serializer):
        user = self.request.user
        
        # Verificar se o usuário já pertence a uma organização
        try:
            profile = Profile.objects.get(user=user)
            if profile.organization:
                raise PermissionDenied("Já pertence a uma organização. Não pode criar uma nova.")
        except Profile.DoesNotExist:
            # Se não tem perfil, criar um
            profile = Profile.objects.create(
                user=user,
                role='Administrador',
                access_level='Admin',
                hourly_rate=Decimal('0.00'),
                phone=''
            )
        
        # Criar a organização
        organization = serializer.save()
        
        # Definir o criador como administrador da organização
        profile.organization = organization
        profile.is_org_admin = True
        profile.role = 'Administrador'
        
        # Dar todas as permissões de administrador
        profile.can_manage_clients = True
        profile.can_view_all_clients = True
        profile.can_create_clients = True
        profile.can_edit_clients = True
        profile.can_delete_clients = True
        profile.can_change_client_status = True
        
        profile.can_assign_tasks = True
        profile.can_create_tasks = True
        profile.can_edit_all_tasks = True
        profile.can_edit_assigned_tasks = True
        profile.can_delete_tasks = True
        profile.can_view_all_tasks = True
        profile.can_approve_tasks = True
        
        profile.can_log_time = True
        profile.can_edit_own_time = True
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
        
        profile.save()
        
        logger.info(f"Organização '{organization.name}' criada por {user.username}. Usuário definido como administrador.")

    @action(detail=True, methods=['post'])
    def add_member_by_code(self, request, pk=None):
        organization = self.get_object() # The organization to add to
        user_making_request = request.user

        try:
            requester_profile = Profile.objects.get(user=user_making_request)
            if requester_profile.organization != organization or not requester_profile.is_org_admin:
                raise PermissionDenied("Sem permissão para adicionar membros a esta organização.")
        except Profile.DoesNotExist:
            if not user_making_request.is_superuser : # Superuser might bypass profile check
                 raise PermissionDenied("Perfil do solicitante não encontrado ou não pertence à organização.")
        
        invitation_code = request.data.get('invitation_code')
        if not invitation_code:
            return Response({"error": "Código de convite é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        
        profile_to_add = Profile.find_by_invitation_code(invitation_code)
        if not profile_to_add:
            return Response({"error": "Código de convite inválido ou não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        if profile_to_add.organization:
            return Response({"error": "Este utilizador já pertence a uma organização"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Assign organization and base role
        profile_to_add.organization = organization
        profile_to_add.role = request.data.get('role', profile_to_add.role or 'Membro Padrão') # Keep existing if not provided
        
        # Apply specific permissions from request or use a preset
        role_preset = request.data.get('role_preset')
        if role_preset:
            # Assuming Profile model has an instance method for this
            # This method needs to exist on the Profile model:
            # profile_to_add.apply_role_preset(role_preset) 
            # If it's a static method like in the original code:
            # OrganizationViewSet.apply_role_preset(profile_to_add, role_preset) # Needs careful scoping
            # For now, let's assume it's handled by setting fields directly or a Profile method.
            # Manual setting for now:
            if role_preset == "administrador": profile_to_add.is_org_admin = True 
            # ... other presets ...
        else: # Manual permission setting
            profile_to_add.is_org_admin = request.data.get('is_org_admin', profile_to_add.is_org_admin)
            # ... set all other can_... fields from request.data, falling back to existing profile_to_add values ...
            # Example:
            # profile_to_add.can_create_clients = request.data.get('can_create_clients', profile_to_add.can_create_clients)
        
        profile_to_add.hourly_rate = request.data.get('hourly_rate', profile_to_add.hourly_rate)
        
        profile_to_add.save()
        
        # Handle visible_clients (ensure clients belong to 'organization')
        visible_client_ids = request.data.get('visible_clients', [])
        if visible_client_ids and not profile_to_add.can_view_all_clients:
            valid_clients = Client.objects.filter(id__in=visible_client_ids, organization=organization)
            profile_to_add.visible_clients.set(valid_clients)
        elif profile_to_add.can_view_all_clients: # If can view all, clear specific list
            profile_to_add.visible_clients.clear()

        return Response(ProfileSerializer(profile_to_add).data, status=status.HTTP_200_OK)
    
    # OrganizationViewSet.apply_role_preset needs to be defined or moved.
    # This is a simplified version of the original provided static method.
    # It should ideally be a method on the Profile model.
    @staticmethod # If kept here, but better on Profile model
    def apply_role_preset(profile, role_preset_name):
        # Reset some common permissions
        profile.is_org_admin = False
        profile.can_view_all_clients = False
        # ... reset others ...

        if role_preset_name == "administrador":
            profile.is_org_admin = True
            profile.can_view_all_clients = True
            # ... set all admin perms ...
        # ... elif for other roles ...
        # profile.save() should be called after this method if it modifies the profile


    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        organization = self.get_object()
        # Permission: only members of this org or superuser can see members
        user = request.user
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user, organization=organization)
            except Profile.DoesNotExist:
                raise PermissionDenied("Acesso negado aos membros desta organização.")
        
        members_profiles = Profile.objects.filter(organization=organization).select_related('user')
        serializer = ProfileSerializer(members_profiles, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None): # Renamed from 'clients_summary' to 'clients' to match common REST patterns
        organization = self.get_object()
        user = request.user
        
        # Permission: User must be part of this organization or superuser
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user, organization=organization)
            except Profile.DoesNotExist:
                raise PermissionDenied("Acesso negado aos clientes desta organização.")
        
        clients_qs = Client.objects.filter(organization=organization).select_related('account_manager__profile')
        # Further filtering based on profile.visible_clients could be added if needed here
        serializer = ClientSerializer(clients_qs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        organization = self.get_object()
        user_making_request = request.user
        try:
            requester_profile = Profile.objects.get(user=user_making_request)
            if requester_profile.organization != organization or not requester_profile.is_org_admin:
                raise PermissionDenied("Sem permissão para remover membros.")
        except Profile.DoesNotExist:
            if not user_making_request.is_superuser:
                raise PermissionDenied("Perfil do solicitante não encontrado.")
        
        user_id_to_remove = request.data.get('user_id')
        if not user_id_to_remove:
            return Response({"error": "ID do usuário é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            profile_to_remove = Profile.objects.get(user_id=user_id_to_remove, organization=organization)
            
            if profile_to_remove.is_org_admin:
                admin_count = Profile.objects.filter(organization=organization, is_org_admin=True).count()
                if admin_count <= 1:
                    return Response({"error": "Não é possível remover o único administrador."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Instead of deleting profile, just disassociate from org and reset permissions
            profile_to_remove.organization = None
            profile_to_remove.is_org_admin = False 
            # Reset all can_... permissions to False or default values
            # This should ideally be a method on Profile model: profile_to_remove.reset_organization_permissions()
            profile_to_remove.save()
            
            return Response({"success": "Membro removido da organização."}, status=status.HTTP_200_OK)
        except Profile.DoesNotExist:
            return Response({"error": "Perfil não encontrado nesta organização."}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def update_member(self, request, pk=None):
        organization = self.get_object()
        user_making_request = request.user
        try:
            requester_profile = Profile.objects.get(user=user_making_request)
            if requester_profile.organization != organization or not requester_profile.is_org_admin:
                raise PermissionDenied("Sem permissão para atualizar membros.")
        except Profile.DoesNotExist:
             if not user_making_request.is_superuser:
                raise PermissionDenied("Perfil do solicitante não encontrado.")
        
        user_id_to_update = request.data.get('user_id')
        if not user_id_to_update:
            return Response({"error": "ID do usuário é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            profile_to_update = Profile.objects.get(user_id=user_id_to_update, organization=organization)
            
            # Apply changes from request.data to profile_to_update, similar to add_member_by_code
            # Example:
            # profile_to_update.role = request.data.get('role', profile_to_update.role)
            # profile_to_update.is_org_admin = request.data.get('is_org_admin', profile_to_update.is_org_admin)
            # ... set all other can_... fields ...
            # role_preset = request.data.get('role_preset')
            # if role_preset:
            #     OrganizationViewSet.apply_role_preset(profile_to_update, role_preset) # Or Profile model method

            # For brevity, not listing all fields again. Ensure all relevant fields are updatable.
            serializer = ProfileSerializer(profile_to_update, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                # Handle visible_clients update if 'visible_clients' is in request.data
                if 'visible_clients' in request.data and not profile_to_update.can_view_all_clients:
                    valid_clients = Client.objects.filter(id__in=request.data['visible_clients'], organization=organization)
                    profile_to_update.visible_clients.set(valid_clients)
                elif 'visible_clients' in request.data and profile_to_update.can_view_all_clients:
                    profile_to_update.visible_clients.clear() # Ensure it's empty if can_view_all

                return Response(ProfileSerializer(profile_to_update).data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Profile.DoesNotExist:
            return Response({"error": "Perfil não encontrado nesta organização."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def manage_visible_clients(self, request, pk=None):
        organization = self.get_object()
        user_making_request = request.user
        try:
            requester_profile = Profile.objects.get(user=user_making_request)
            if requester_profile.organization != organization or not requester_profile.is_org_admin:
                raise PermissionDenied("Sem permissão para gerenciar clientes visíveis.")
        except Profile.DoesNotExist:
            if not user_making_request.is_superuser:
                raise PermissionDenied("Perfil do solicitante não encontrado.")
        
        target_user_id = request.data.get('user_id') # User whose visible clients are being managed
        client_ids = request.data.get('client_ids', []) # List of client IDs
        action_type = request.data.get('action', 'set')  # 'add', 'remove', 'set'
        
        if not target_user_id:
            return Response({"error": "ID do perfil do membro é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_profile = Profile.objects.get(user_id=target_user_id, organization=organization)
        except Profile.DoesNotExist:
            return Response({"error": "Perfil do membro não encontrado nesta organização."}, status=status.HTTP_404_NOT_FOUND)
            
        clients_to_manage = Client.objects.filter(organization=organization, id__in=client_ids)
        if len(clients_to_manage) != len(set(client_ids)) and client_ids: # Check if all provided client_ids were found
            return Response({"error": "Um ou mais IDs de cliente são inválidos ou não pertencem a esta organização."}, status=status.HTTP_400_BAD_REQUEST)
            
        if target_profile.can_view_all_clients:
             return Response({"error": "Este usuário já pode ver todos os clientes. Gestão de clientes visíveis não aplicável."}, status=status.HTTP_400_BAD_REQUEST)

        if action_type == 'add':
            target_profile.visible_clients.add(*clients_to_manage)
        elif action_type == 'remove':
            target_profile.visible_clients.remove(*clients_to_manage)
        elif action_type == 'set':
            target_profile.visible_clients.set(clients_to_manage)
        else:
            return Response({"error": "Ação inválida. Use 'add', 'remove' ou 'set'."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(ProfileSerializer(target_profile).data, status=status.HTTP_200_OK)


# dashboard_summary - No major changes needed for this step, but ensure it uses Profile permissions correctly.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    user = request.user
    try:
        profile = Profile.objects.select_related('organization').get(user=user)
        org_id = profile.organization_id if profile.organization else None
        
        response_data = {
            'permissions': ProfileSerializer(profile).data, # Send all profile permissions
            'active_clients': 0, 'active_tasks': 0, 'overdue_tasks': 0, 'today_tasks': 0,
            'completed_tasks_week': 0, 'time_tracked_today': 0, 'time_tracked_week': 0,
        }

        today = timezone.now().date()
        seven_days_ago = today - timedelta(days=7)

        clients_qs = Client.objects.none()
        tasks_qs = Task.objects.none()
        time_entries_qs = TimeEntry.objects.none()

        if org_id:
            if profile.is_org_admin or profile.can_view_all_clients:
                clients_qs = Client.objects.filter(organization_id=org_id, is_active=True)
            else:
                clients_qs = profile.visible_clients.filter(is_active=True, organization_id=org_id)
            response_data['active_clients'] = clients_qs.count()

            org_tasks_base = Task.objects.filter(client__organization_id=org_id)
            if profile.is_org_admin or profile.can_view_all_tasks:
                tasks_qs = org_tasks_base
            else:
                visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                tasks_qs = org_tasks_base.filter(Q(client_id__in=visible_client_ids) | Q(assigned_to=user)).distinct()
            
            response_data['active_tasks'] = tasks_qs.filter(~Q(status__in=['completed', 'cancelled'])).count()
            response_data['overdue_tasks'] = tasks_qs.filter(deadline__lt=today, status__in=['pending', 'in_progress']).count()
            response_data['today_tasks'] = tasks_qs.filter(deadline=today, status__in=['pending', 'in_progress']).count()
            response_data['completed_tasks_week'] = tasks_qs.filter(status='completed', completed_at__gte=seven_days_ago).count()

            org_time_base = TimeEntry.objects.filter(client__organization_id=org_id)
            if profile.is_org_admin or profile.can_view_team_time:
                time_entries_qs = org_time_base
            else:
                visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                time_entries_qs = org_time_base.filter(Q(user=user) | Q(client_id__in=visible_client_ids)).distinct()
            
            response_data['time_tracked_today'] = time_entries_qs.filter(date=today).aggregate(total=Sum('minutes_spent'))['total'] or 0
            response_data['time_tracked_week'] = time_entries_qs.filter(date__gte=seven_days_ago).aggregate(total=Sum('minutes_spent'))['total'] or 0

            # Profitability summary (simplified for brevity, use ClientProfitability model)
            if profile.is_org_admin or profile.can_view_organization_profitability:
                profit_stats = ClientProfitability.objects.filter(client__organization_id=org_id, year=today.year, month=today.month).aggregate(
                    unprofitable_count=Count('id', filter=Q(is_profitable=False)),
                    avg_margin=Avg('profit_margin')
                )
                response_data['unprofitable_clients'] = profit_stats.get('unprofitable_count',0)
                response_data['average_profit_margin'] = profit_stats.get('avg_margin',0)

            # Workflow Stats
            if profile.is_org_admin or profile.can_manage_workflows or profile.can_view_all_tasks : # Broader perm to see general workflow stats
                # Assuming workflows are not org-specific, or need a filter if they are
                response_data['active_workflows'] = WorkflowDefinition.objects.filter(is_active=True).count()
                response_data['tasks_with_workflows'] = tasks_qs.exclude(workflow__isnull=True).count()
            
            if profile.is_org_admin or profile.can_approve_tasks:
                # Tasks needing approval: current step requires approval AND no existing 'approved=True' approval for that step
                response_data['tasks_needing_approval'] = tasks_qs.filter(
                    current_workflow_step__requires_approval=True
                ).exclude(
                    approvals__workflow_step=F('current_workflow_step'), # F object to compare fields
                    approvals__approved=True
                ).distinct().count()
        
        return Response(response_data)
        
    except Profile.DoesNotExist:
        # For users without profiles (e.g. superuser before profile creation, or if profiles are optional)
        if user.is_superuser:
            # Provide some global stats for superuser if no profile exists
            return Response({
                'message': 'Superuser dashboard summary (global stats).',
                'active_clients': Client.objects.filter(is_active=True).count(),
                'active_tasks': Task.objects.filter(~Q(status__in=['completed', 'cancelled'])).count(),
                 # ... other global stats ...
            })
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)


# --- New Scheduled Task Views ---

@api_view(['POST']) 
@permission_classes([IsAuthenticated]) 
def check_deadlines_and_notify_view(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        if not (profile.is_org_admin): 
            return Response({'error': 'Apenas administradores podem executar esta verificação.'}, status=status.HTTP_403_FORBIDDEN)
        
        organization = profile.organization
        if not organization:
            return Response({'error': 'Administrador não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        thresholds_days = [3, 1, 0] 
        notifications_created_total = 0
        tasks_checked_total = 0

        for days_ahead in thresholds_days:
            target_deadline_date = (now + timedelta(days=days_ahead)).date()
            
            tasks_with_near_deadline = Task.objects.filter(
                deadline=target_deadline_date,
                status__in=['pending', 'in_progress'],
                client__organization=organization 
            ).select_related('assigned_to', 'current_workflow_step__assign_to', 'created_by', 'client') # Added client for service
            
            tasks_checked_total += tasks_with_near_deadline.count()

            for task in tasks_with_near_deadline:
                notifications = NotificationService.notify_deadline_approaching(task, days_ahead)
                notifications_created_total += len(notifications)
        
        return Response({
            'success': True,
            'message': f'Verificação de deadlines concluída para a organização {organization.name}.',
            'tasks_checked': tasks_checked_total,
            'notifications_created': notifications_created_total
        })
        
    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao verificar deadlines: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_overdue_steps_and_notify_view(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        if not profile.is_org_admin:
            return Response({'error': 'Apenas administradores podem executar esta verificação.'}, status=status.HTTP_403_FORBIDDEN)
        
        organization = profile.organization
        if not organization:
            return Response({'error': 'Administrador não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        overdue_threshold_days = int(request.data.get('overdue_threshold_days', 5)) 
        if overdue_threshold_days <= 0:
            return Response({'error': 'overdue_threshold_days deve ser positivo.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        
        notifications_created_total = 0
        tasks_processed_total = 0

        active_workflow_tasks = Task.objects.filter(
            client__organization=organization,
            status__in=['pending', 'in_progress'],
            workflow__isnull=False,
            current_workflow_step__isnull=False
        ).select_related('current_workflow_step', 'current_workflow_step__assign_to', 
                         'assigned_to', 'created_by', 'client', 'client__account_manager') # Added client relations

        for task in active_workflow_tasks:
            tasks_processed_total += 1
            last_significant_history = WorkflowHistory.objects.filter(
                task=task, 
                to_step=task.current_workflow_step, # When this step became current
                action__in=['step_advanced', 'workflow_assigned'] 
            ).order_by('-created_at').first()

            # If no history of becoming current, use task's updated_at,
            # but this might be less accurate for overdue calculation.
            # A better approach might be to log when a step *becomes* current.
            # For now, if it's current and no "advanced to this step" history, consider task.updated_at.
            step_became_current_at = task.updated_at 
            if last_significant_history:
                step_became_current_at = last_significant_history.created_at
            
            days_on_current_step = (now - step_became_current_at).days

            if days_on_current_step >= overdue_threshold_days:
                notifications = NotificationService.notify_step_overdue(task, task.current_workflow_step, days_on_current_step)
                notifications_created_total += len(notifications)
        
        return Response({
            'success': True,
            'message': f'Verificação de passos atrasados ({overdue_threshold_days} dias) concluída para {organization.name}.',
            'tasks_with_active_workflow_step_checked': tasks_processed_total,
            'overdue_step_notifications_created': notifications_created_total
        })

    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao verificar passos atrasados: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_pending_approvals_and_notify_view(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        if not profile.is_org_admin:
            return Response({'error': 'Apenas administradores podem executar esta verificação.'}, status=status.HTTP_403_FORBIDDEN)

        organization = profile.organization
        if not organization:
            return Response({'error': 'Administrador não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        reminder_threshold_days = int(request.data.get('reminder_threshold_days', 2))
        if reminder_threshold_days <= 0:
            return Response({'error': 'reminder_threshold_days deve ser positivo.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        
        tasks_needing_approval_reminder = Task.objects.filter(
            client__organization=organization,
            status__in=['pending', 'in_progress'],
            current_workflow_step__requires_approval=True
        ).exclude( # Exclude if already approved for the current step
            id__in=TaskApproval.objects.filter(
                task_id=models.F('task_id'), # Ensures we are checking approvals for the *same task*
                workflow_step=models.F('task__current_workflow_step'), # And for the *current step*
                approved=True
            ).values_list('task_id', flat=True)
        ).select_related('current_workflow_step', 'client', 'client__organization') # Added client.organization for service
        
        notifications_sent_total = 0
        tasks_checked_count = 0

        for task in tasks_needing_approval_reminder:
            tasks_checked_count +=1
            
            # When did this current_workflow_step requiring approval become active?
            step_became_current_history = WorkflowHistory.objects.filter(
                task=task, to_step=task.current_workflow_step,
                action__in=['step_advanced', 'workflow_assigned'] # Became current via advance or initial assignment
            ).order_by('-created_at').first()

            if step_became_current_history:
                days_pending_approval = (now - step_became_current_history.created_at).days
                if days_pending_approval >= reminder_threshold_days:
                    reminders = NotificationService.notify_approval_needed(
                        task, task.current_workflow_step, 
                        approvers=None, # Let service find approvers
                        is_reminder=True
                    )
                    notifications_sent_total += len(reminders)
        
        return Response({
            'success': True,
            'message': f'Verificação de aprovações pendentes ({reminder_threshold_days} dias) concluída para {organization.name}.',
            'tasks_checked_for_pending_approval': tasks_checked_count,
            'approval_reminder_notifications_sent': notifications_sent_total
        })
        
    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao verificar aprovações pendentes: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ... (outros imports e ViewSets que já existem no seu views.py) ...

class WorkflowNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        is_read = self.request.query_params.get('is_read')
        notification_type = self.request.query_params.get('type')
        priority = self.request.query_params.get('priority')
        is_archived_str = self.request.query_params.get('is_archived', 'false') # Default to 'false'
        is_archived = is_archived_str.lower() == 'true'
        
        limit_str = self.request.query_params.get('limit')

        queryset = WorkflowNotification.objects.filter(
            user=user,
            is_archived=is_archived
        ).select_related(
            'task__client', 
            'workflow_step', 
            'created_by' # User who triggered the notification, if applicable
        ).order_by('-created_at')
        
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        if limit_str:
            try:
                limit = int(limit_str)
                if limit > 0:
                    queryset = queryset[:limit]
            except ValueError:
                pass # Ignore invalid limit parameter
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def summary_stats(self, request):
        """Resumo rápido de estatísticas"""
        user = request.user
        
        # Últimos 7 dias
        week_ago = timezone.now() - timedelta(days=7)
        
        notifications = WorkflowNotification.objects.filter(
            user=user,
            created_at__gte=week_ago,
            is_archived=False
        )
        
        stats = {
            'total_this_week': notifications.count(),
            'unread_this_week': notifications.filter(is_read=False).count(),
            'urgent_unread': notifications.filter(
                is_read=False, 
                priority='urgent'
            ).count(),
            'most_frequent_type': notifications.values('notification_type').annotate(
                count=Count('id')
            ).order_by('-count').first(),
            'oldest_unread_days': None,
        }
        
        # Notificação não lida mais antiga
        oldest_unread = notifications.filter(is_read=False).order_by('created_at').first()
        if oldest_unread:
            days_old = (timezone.now() - oldest_unread.created_at).days
            stats['oldest_unread_days'] = days_old
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        if notification.user != request.user: # Ensure user can only modify their own notifications
            raise PermissionDenied("Você não pode modificar notificações de outro usuário.")
        notification.mark_as_read()
        return Response({'status': 'marked_as_read'})
    
    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        notification = self.get_object()
        if notification.user != request.user:
            raise PermissionDenied("Você não pode modificar notificações de outro usuário.")
        notification.mark_as_unread()
        return Response({'status': 'marked_as_unread'})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        count = NotificationService.mark_all_as_read(request.user)
        return Response({'status': 'marked_as_read', 'count': count})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = NotificationService.get_unread_count(request.user)
        return Response({'unread_count': count})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        notification = self.get_object()
        if notification.user != request.user:
            raise PermissionDenied("Você não pode modificar notificações de outro usuário.")
        notification.archive()
        return Response({'status': 'archived'})
    
    @action(detail=False, methods=['post'])
    def create_manual_reminder(self, request):
        task_id = request.data.get('task_id')
        user_ids_str = request.data.get('user_ids', []) 
        user_ids = []
        if isinstance(user_ids_str, str): 
            user_ids = [uid.strip() for uid in user_ids_str.split(',') if uid.strip()]
        elif isinstance(user_ids_str, list):
            user_ids = user_ids_str
        
        title = request.data.get('title')
        message = request.data.get('message')
        priority = request.data.get('priority', 'normal')
        scheduled_for_str = request.data.get('scheduled_for')
        
        if not all([task_id, user_ids, title, message]):
            return Response({'error': 'task_id, user_ids, title e message são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            task = Task.objects.get(id=task_id)
            target_users = User.objects.filter(id__in=user_ids, is_active=True)
            
            if not target_users.exists():
                 return Response({'error': 'Nenhum usuário alvo válido encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

            profile = Profile.objects.get(user=request.user)
            
            can_remind = (
                profile.is_org_admin or 
                profile.can_edit_all_tasks or
                (profile.can_edit_assigned_tasks and task.assigned_to == request.user) or
                (task.current_workflow_step and task.current_workflow_step.assign_to == request.user)
            )
            if not can_remind:
                return Response({'error': 'Sem permissão para criar lembretes para esta tarefa'}, status=status.HTTP_403_FORBIDDEN)
            
            scheduled_for = None
            if scheduled_for_str:
                try:
                    # Ensure timezone-aware datetime objects if your DATETIME_INPUT_FORMATS support 'Z' or '+HH:MM'
                    # For simplicity, assuming ISO format possibly with 'Z'
                    scheduled_for = timezone.datetime.fromisoformat(scheduled_for_str.replace('Z', '+00:00'))
                    if scheduled_for <= timezone.now(): # Ensure it's in the future
                        return Response({'error': 'Data agendada deve ser no futuro.'}, status=status.HTTP_400_BAD_REQUEST)
                except ValueError:
                    return Response({'error': 'Formato de data inválido para scheduled_for. Use ISO 8601 (e.g., YYYY-MM-DDTHH:MM:SSZ).'}, status=status.HTTP_400_BAD_REQUEST)
            
            notifications = NotificationService.create_manual_reminder(
                task=task, target_users=target_users, title=title, message=message,
                created_by=request.user, priority=priority, scheduled_for=scheduled_for
            )
            return Response({
                'status': 'created', 
                'count': len(notifications), 
                'notifications': [n.id for n in notifications]
            }, status=status.HTTP_201_CREATED)
            
        except Task.DoesNotExist:
            return Response({'error': 'Tarefa não encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Profile.DoesNotExist:
            return Response({'error': 'Perfil do solicitante não encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erro ao criar lembrete manual: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WorkflowHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkflowHistorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        task_id = self.request.query_params.get('task')
        
        base_queryset = WorkflowHistory.objects.select_related(
            'task__client__organization', 
            'from_step', 
            'to_step', 
            'changed_by__profile' # For username via serializer
        ).order_by('-created_at')
        
        if task_id:
            base_queryset = base_queryset.filter(task_id=task_id)
        
        # Superuser sees all if no profile, or if they have a profile but want to see all
        if user.is_superuser:
            # If superuser might have a profile but wants to see all, check here
            # For now, if superuser, they see all history regardless of profile org.
            return base_queryset

        try:
            profile = Profile.objects.get(user=user)
            if not profile.organization: # User has profile but no org
                return WorkflowHistory.objects.none()

            org_filter = Q(task__client__organization=profile.organization)
            
            if profile.is_org_admin or profile.can_view_all_tasks:
                return base_queryset.filter(org_filter)
            else:
                visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                user_access_filter = Q(task__client_id__in=visible_client_ids) | Q(task__assigned_to=user)
                return base_queryset.filter(org_filter & user_access_filter).distinct()
                
        except Profile.DoesNotExist:
            # This case should ideally not be hit for non-superusers if IsAuthenticated is used properly
            # and profiles are created on user creation.
            return WorkflowHistory.objects.none()

class WorkflowStepDetailViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = WorkflowStep.objects.select_related(
            'workflow', 'assign_to__profile' # for assign_to_name in serializer
        ).prefetch_related(
            'time_entries__user__profile', 
            'task_approvals__approved_by__profile' 
        )
        
        workflow_id_param = self.request.query_params.get('workflow')
        if workflow_id_param:
            queryset = queryset.filter(workflow_id=workflow_id_param)
        
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization: 
                    return WorkflowStep.objects.none()
                
                # Assuming workflows are not directly organization-bound in the model for now.
                # If they were: queryset = queryset.filter(workflow__organization=profile.organization)
                # Further, filter based on whether user can see the workflows themselves.
                # This is a simplified permission for listing.
                if not (profile.is_org_admin or profile.can_view_all_tasks or profile.can_edit_workflows):
                    # Non-admins might only see steps of workflows assigned to tasks they can access
                    # or steps they are directly assigned to. This is complex for a general list.
                    # For now, a broad permission is assumed for listing.
                    # A more granular approach would filter based on tasks using these workflow steps.
                    # Example: accessible_workflow_ids = Task.objects.filter(...user access...).values_list('workflow_id', flat=True).distinct()
                    # queryset = queryset.filter(workflow_id__in=accessible_workflow_ids)
                    pass # No further specific filtering for listing steps if user has basic task/workflow view perms
            except Profile.DoesNotExist:
                return WorkflowStep.objects.none()
            
        return queryset.order_by('workflow__name', 'order')
    
    @action(detail=True, methods=['get'])
    def time_entries(self, request, pk=None):
        workflow_step = self.get_object() 
        user = request.user
        
        time_entries_qs = TimeEntry.objects.filter(
            workflow_step=workflow_step
        ).select_related(
            'user__profile', 'task__client', 'client'
        ).order_by('-date', '-created_at')
        
        # Permission check for viewing these time entries
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization: return TimeEntry.objects.none()
                # Filter time entries by the user's organization (via client)
                time_entries_qs = time_entries_qs.filter(client__organization=profile.organization)

                # If user is not admin/team_time_viewer, filter to their own or visible client entries
                if not (profile.is_org_admin or profile.can_view_team_time):
                    visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                    time_entries_qs = time_entries_qs.filter(
                        Q(user=user) | Q(client_id__in=visible_client_ids)
                    )
            except Profile.DoesNotExist:
                return TimeEntry.objects.none()
        
        serializer = TimeEntrySerializer(time_entries_qs.distinct(), many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def current_tasks(self, request, pk=None):
        workflow_step = self.get_object()
        user = request.user
        
        current_tasks_qs = Task.objects.filter(
            current_workflow_step=workflow_step
        ).select_related(
            'client__organization', 'assigned_to__profile', 'created_by__profile'
        )
        
        if not user.is_superuser:
            try:
                profile = Profile.objects.get(user=user)
                if not profile.organization: return Task.objects.none()
                
                current_tasks_qs = current_tasks_qs.filter(client__organization=profile.organization)
                
                if not (profile.is_org_admin or profile.can_view_all_tasks):
                    visible_client_ids = list(profile.visible_clients.values_list('id', flat=True))
                    current_tasks_qs = current_tasks_qs.filter(
                        Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
                    ).distinct()
            except Profile.DoesNotExist:
                 return Task.objects.none()
        
        serializer = TaskSerializer(current_tasks_qs.distinct(), many=True)
        return Response(serializer.data)

# --- (As definições de OrganizationViewSet, dashboard_summary, e os novos endpoints de verificação já devem estar no seu views.py) ---
# --- Certifique-se que o resto do seu views.py está correto e completo. ---
# --- O código abaixo são os novos endpoints de verificação, caso precise deles aqui novamente. ---

@api_view(['POST']) 
@permission_classes([IsAuthenticated]) 
def check_deadlines_and_notify_view(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        if not (profile.is_org_admin): 
            return Response({'error': 'Apenas administradores podem executar esta verificação.'}, status=status.HTTP_403_FORBIDDEN)
        
        organization = profile.organization
        if not organization:
            return Response({'error': 'Administrador não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        thresholds_days = [3, 1, 0] 
        notifications_created_total = 0
        tasks_checked_total = 0

        for days_ahead in thresholds_days:
            target_deadline_date = (now + timedelta(days=days_ahead)).date()
            
            tasks_with_near_deadline = Task.objects.filter(
                deadline=target_deadline_date,
                status__in=['pending', 'in_progress'],
                client__organization=organization 
            ).select_related('assigned_to', 'current_workflow_step__assign_to', 'created_by', 'client') 
            
            tasks_checked_total += tasks_with_near_deadline.count()

            for task in tasks_with_near_deadline:
                notifications = NotificationService.notify_deadline_approaching(task, days_ahead)
                notifications_created_total += len(notifications)
        
        return Response({
            'success': True,
            'message': f'Verificação de deadlines concluída para a organização {organization.name}.',
            'tasks_checked': tasks_checked_total,
            'notifications_created': notifications_created_total
        })
        
    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao verificar deadlines: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_overdue_steps_and_notify_view(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        if not profile.is_org_admin:
            return Response({'error': 'Apenas administradores podem executar esta verificação.'}, status=status.HTTP_403_FORBIDDEN)
        
        organization = profile.organization
        if not organization:
            return Response({'error': 'Administrador não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        overdue_threshold_days = int(request.data.get('overdue_threshold_days', 5)) 
        if overdue_threshold_days <= 0:
            return Response({'error': 'overdue_threshold_days deve ser positivo.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        
        notifications_created_total = 0
        tasks_processed_total = 0

        active_workflow_tasks = Task.objects.filter(
            client__organization=organization,
            status__in=['pending', 'in_progress'],
            workflow__isnull=False,
            current_workflow_step__isnull=False
        ).select_related('current_workflow_step', 'current_workflow_step__assign_to', 
                         'assigned_to', 'created_by', 'client', 'client__account_manager') 

        for task in active_workflow_tasks:
            tasks_processed_total += 1
            last_significant_history = WorkflowHistory.objects.filter(
                task=task, 
                to_step=task.current_workflow_step, 
                action__in=['step_advanced', 'workflow_assigned'] 
            ).order_by('-created_at').first()

            step_became_current_at = task.updated_at 
            if last_significant_history:
                step_became_current_at = last_significant_history.created_at
            
            days_on_current_step = (now - step_became_current_at).days

            if days_on_current_step >= overdue_threshold_days:
                notifications = NotificationService.notify_step_overdue(task, task.current_workflow_step, days_on_current_step)
                notifications_created_total += len(notifications)
        
        return Response({
            'success': True,
            'message': f'Verificação de passos atrasados ({overdue_threshold_days} dias) concluída para {organization.name}.',
            'tasks_with_active_workflow_step_checked': tasks_processed_total,
            'overdue_step_notifications_created': notifications_created_total
        })

    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao verificar passos atrasados: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_pending_approvals_and_notify_view(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        if not profile.is_org_admin:
            return Response({'error': 'Apenas administradores podem executar esta verificação.'}, status=status.HTTP_403_FORBIDDEN)

        organization = profile.organization
        if not organization:
            return Response({'error': 'Administrador não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        reminder_threshold_days = int(request.data.get('reminder_threshold_days', 2))
        if reminder_threshold_days <= 0:
            return Response({'error': 'reminder_threshold_days deve ser positivo.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        
        tasks_needing_approval_reminder = Task.objects.filter(
            client__organization=organization,
            status__in=['pending', 'in_progress'],
            current_workflow_step__requires_approval=True
        ).exclude( 
            id__in=TaskApproval.objects.filter(
                task_id=models.F('task_id'), 
                workflow_step=models.F('task__current_workflow_step'), 
                approved=True
            ).values_list('task_id', flat=True)
        ).select_related('current_workflow_step', 'client', 'client__organization')
        
        notifications_sent_total = 0
        tasks_checked_count = 0

        for task in tasks_needing_approval_reminder:
            tasks_checked_count +=1
            
            step_became_current_history = WorkflowHistory.objects.filter(
                task=task, to_step=task.current_workflow_step,
                action__in=['step_advanced', 'workflow_assigned']
            ).order_by('-created_at').first()

            if step_became_current_history:
                days_pending_approval = (now - step_became_current_history.created_at).days
                if days_pending_approval >= reminder_threshold_days:
                    reminders = NotificationService.notify_approval_needed(
                        task, task.current_workflow_step, 
                        approvers=None, 
                        is_reminder=True
                    )
                    notifications_sent_total += len(reminders)
        
        return Response({
            'success': True,
            'message': f'Verificação de aprovações pendentes ({reminder_threshold_days} dias) concluída para {organization.name}.',
            'tasks_checked_for_pending_approval': tasks_checked_count,
            'approval_reminder_notifications_sent': notifications_sent_total
        })
        
    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao verificar aprovações pendentes: {str(e)}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ... (outros imports e ViewSets no seu views.py) ...

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_organization_profitability(request):
    """
    Atualiza dados de rentabilidade para todos os clientes da organização do usuário.
    Calcula para o mês atual e os últimos N meses.
    """
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user)
        
        if not profile.organization:
            return Response(
                {'error': 'Usuário não pertence a nenhuma organização'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar permissões - quem pode acionar esta atualização?
        # Normalmente um admin ou alguém com permissão para ver rentabilidade da organização.
        if not (profile.is_org_admin or profile.can_view_organization_profitability):
            return Response(
                {'error': 'Sem permissão para atualizar dados de rentabilidade da organização'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        months_back_str = request.data.get('months_back', '3') # Padrão: 3 meses
        try:
            months_back = int(months_back_str)
            if not (1 <= months_back <= 12): # Limite para evitar sobrecarga
                raise ValueError("months_back deve estar entre 1 e 12.")
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        organization = profile.organization
        now = timezone.now()
        updated_periods_summary = []
        total_clients_updated_overall = 0 # Contará cada par (cliente, período) atualizado
        
        for i in range(months_back):
            # Calcular a data do mês alvo
            # Corrigindo a lógica para subtrair meses corretamente
            year = now.year
            month = now.month - i
            
            while month <= 0:
                month += 12
                year -= 1
            
            target_date_for_period = now.replace(year=year, month=month, day=1) # Usar o primeiro dia do mês
            
            year_to_update = target_date_for_period.year
            month_to_update = target_date_for_period.month
            
            org_clients = Client.objects.filter(organization=organization, is_active=True)
            clients_updated_this_period = 0
            
            for client_instance in org_clients:
                # A função update_client_profitability já lida com get_or_create
                result = update_client_profitability(client_instance.id, year_to_update, month_to_update)
                if result: # Se um registro foi criado ou atualizado
                    clients_updated_this_period += 1
            
            updated_periods_summary.append({
                'year': year_to_update,
                'month': month_to_update,
                'month_name': target_date_for_period.strftime('%B %Y'), # Nome do mês e ano
                'clients_processed_for_period': clients_updated_this_period 
            })
            total_clients_updated_overall += clients_updated_this_period # Somando os registros atualizados
            
            logger.info(f"Rentabilidade atualizada para {clients_updated_this_period} clientes em {month_to_update:02d}/{year_to_update} - Org: {organization.name}")
        
        return Response({
            'success': True,
            'message': f'Rentabilidade atualizada para os últimos {months_back} meses para a organização {organization.name}.',
            'organization': organization.name,
            'total_profitability_records_updated': total_clients_updated_overall,
            'periods_processed': updated_periods_summary,
            'processed_at': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil de usuário não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro ao atualizar rentabilidade da organização: {str(e)}")
        import traceback
        traceback.print_exc() # Para debug detalhado no console do servidor
        return Response(
            {'error': f'Erro interno ao processar a requisição: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class NotificationSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NotificationSettings.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Retorna ou cria as configurações do usuário"""
        settings, created = NotificationSettings.objects.get_or_create(
            user=self.request.user,
            defaults={
                'deadline_days_notice': [3, 1, 0],
                'digest_time': '09:00',
            }
        )
        return settings
    
    @action(detail=False, methods=['get'])
    def my_settings(self, request):
        """Endpoint para obter configurações do usuário logado"""
        settings = self.get_object()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_settings(self, request):
        """Endpoint para atualizar configurações"""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset para configurações padrão"""
        settings = self.get_object()
        
        # Reset para valores padrão
        settings.email_notifications_enabled = True
        settings.push_notifications_enabled = True
        settings.notify_step_ready = True
        settings.notify_step_completed = True
        settings.notify_approval_needed = True
        settings.notify_approval_completed = True
        settings.notify_workflow_completed = True
        settings.notify_deadline_approaching = True
        settings.notify_step_overdue = True
        settings.notify_workflow_assigned = True
        settings.notify_step_rejected = True
        settings.notify_manual_reminders = True
        settings.digest_frequency = 'immediate'
        settings.digest_time = timezone.datetime.strptime('09:00', '%H:%M').time()
        settings.deadline_days_notice = [3, 1, 0]
        settings.overdue_threshold_days = 5
        settings.approval_reminder_days = 2
        settings.quiet_start_time = None
        settings.quiet_end_time = None
        
        settings.save()
        
        serializer = self.get_serializer(settings)
        return Response({
            'message': 'Configurações resetadas para o padrão',
            'settings': serializer.data
        })
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_stats(request):
    """Estatísticas de notificações do usuário"""
    days = int(request.GET.get('days', 30))
    
    try:
        stats = NotificationMetricsService.get_user_notification_stats(
            request.user, days
        )
        return Response(stats)
    except Exception as e:
        logger.error(f"Erro ao calcular estatísticas de notificação: {e}")
        return Response(
            {'error': 'Erro ao calcular estatísticas'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organization_notification_stats(request):
    """Estatísticas de notificações da organização (apenas admins)"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not profile.is_org_admin:
            return Response(
                {'error': 'Apenas administradores podem ver estatísticas da organização'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.GET.get('days', 30))
        stats = NotificationMetricsService.get_organization_notification_stats(
            profile.organization, days
        )
        return Response(stats)
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro ao calcular estatísticas da organização: {e}")
        return Response(
            {'error': 'Erro ao calcular estatísticas'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workflow_notification_performance(request):
    """Performance de notificações de workflow"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not (profile.is_org_admin or profile.can_view_analytics):
            return Response(
                {'error': 'Sem permissão para ver métricas de workflow'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        workflow_id = request.GET.get('workflow_id')
        days = int(request.GET.get('days', 30))
        
        stats = NotificationMetricsService.get_workflow_notification_performance(
            workflow_id, days
        )
        return Response(stats)
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro ao calcular performance de workflow: {e}")
        return Response(
            {'error': 'Erro ao calcular métricas'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_reports(request):
    """Gera relatórios de notificações"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not (profile.is_org_admin or profile.can_view_analytics):
            return Response(
                {'error': 'Sem permissão para gerar relatórios'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parâmetros
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        format_type = request.GET.get('format', 'json')
        
        if not start_date_str or not end_date_str:
            return Response(
                {'error': 'start_date e end_date são obrigatórios'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.fromisoformat(start_date_str)
            end_date = datetime.fromisoformat(end_date_str)
        except ValueError:
            return Response(
                {'error': 'Formato de data inválido. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report = NotificationReportsService.generate_notification_report(
            profile.organization, start_date, end_date, format_type
        )
        
        if format_type == 'csv':
            response = Response(report, content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="notification_report.csv"'
            return response
        
        return Response(report)
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workflow_efficiency_report(request):
    """Relatório de eficiência de workflows"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not (profile.is_org_admin or profile.can_view_analytics):
            return Response(
                {'error': 'Sem permissão para ver relatórios de workflow'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parâmetros
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if not start_date_str or not end_date_str:
            # Usar últimos 30 dias como padrão
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
        else:
            try:
                start_date = datetime.fromisoformat(start_date_str)
                end_date = datetime.fromisoformat(end_date_str)
            except ValueError:
                return Response(
                    {'error': 'Formato de data inválido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        report = NotificationReportsService.generate_workflow_efficiency_report(
            profile.organization, start_date, end_date
        )
        
        return Response(report)
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_escalation_check(request):
    """Endpoint para acionar verificação de escalação (apenas admins)"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not profile.is_org_admin:
            return Response(
                {'error': 'Apenas administradores podem acionar escalação'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        escalated_count = NotificationEscalationService.check_and_escalate_overdue_notifications()
        
        return Response({
            'success': True,
            'escalated_notifications': escalated_count,
            'message': f'{escalated_count} notificações foram escaladas'
        })
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            if not profile.organization:
                return NotificationTemplate.objects.none()
            
            # Apenas admins podem gerenciar templates
            if not profile.is_org_admin:
                return NotificationTemplate.objects.none()
            
            return NotificationTemplate.objects.filter(
                organization=profile.organization
            ).select_related('organization', 'created_by')
            
        except Profile.DoesNotExist:
            return NotificationTemplate.objects.none()
    
    def perform_create(self, serializer):
        try:
            profile = Profile.objects.get(user=self.request.user)
            
            if not profile.is_org_admin:
                raise PermissionDenied("Apenas administradores podem criar templates")
            
            serializer.save(
                organization=profile.organization,
                created_by=self.request.user
            )
            
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil não encontrado")
    
    @action(detail=False, methods=['get'])
    def available_types(self, request):
        """Lista tipos de notificação disponíveis"""
        types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in WorkflowNotification.NOTIFICATION_TYPES
        ]
        return Response(types)
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview do template com dados de exemplo"""
        template = self.get_object()
        
        # Dados de exemplo
        example_context = {
            'user_name': 'João Silva',
            'user_first_name': 'João',
            'task_title': 'Declaração de IRS 2024',
            'client_name': 'Empresa XYZ Lda',
            'step_name': 'Revisão de Documentos',
            'workflow_name': 'Processo de Declaração',
            'organization_name': template.organization.name,
            'current_date': timezone.now().strftime('%d/%m/%Y'),
            'current_time': timezone.now().strftime('%H:%M'),
        }
        
        try:
            title, message = template.render(example_context)
            return Response({
                'title': title,
                'message': message,
                'context_used': example_context
            })
        except Exception as e:
            return Response({
                'error': f'Erro ao renderizar template: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_defaults(self, request):
        """Cria templates padrão para a organização"""
        try:
            profile = Profile.objects.get(user=request.user)
            
            if not profile.is_org_admin:
                raise PermissionDenied("Apenas administradores podem criar templates padrão")
            
            created_count = 0
            
            # Templates padrão para cada tipo
            default_templates = [
                {
                    'notification_type': 'step_ready',
                    'name': 'Passo Pronto - Padrão',
                    'title_template': '🔔 Passo pronto: {step_name}',
                    'message_template': 'Olá {user_first_name},\n\nA tarefa "{task_title}" (Cliente: {client_name}) chegou ao passo "{step_name}" e está pronta para ser trabalhada.\n\nWorkflow: {workflow_name}\nData: {current_date}',
                    'default_priority': 'normal',
                    'is_default': True
                },
                {
                    'notification_type': 'approval_needed',
                    'name': 'Aprovação Necessária - Padrão',
                    'title_template': '⚠️ Aprovação necessária: {step_name}',
                    'message_template': 'Caro {user_first_name},\n\nO passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) precisa de sua aprovação.\n\nPor favor, revise e aprove o mais breve possível.\n\nData: {current_date} às {current_time}',
                    'default_priority': 'high',
                    'is_default': True
                },
                {
                    'notification_type': 'step_overdue',
                    'name': 'Passo Atrasado - Padrão',
                    'title_template': '🚨 URGENTE: Passo atrasado - {step_name}',
                    'message_template': 'Atenção {user_first_name},\n\nO passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) está ATRASADO.\n\nPor favor, priorize esta atividade.\n\nWorkflow: {workflow_name}\nData: {current_date}',
                    'default_priority': 'urgent',
                    'is_default': True
                }
            ]
            
            for template_data in default_templates:
                # Verificar se já existe
                existing = NotificationTemplate.objects.filter(
                    organization=profile.organization,
                    notification_type=template_data['notification_type'],
                    is_default=True
                ).exists()
                
                if not existing:
                    NotificationTemplate.objects.create(
                        organization=profile.organization,
                        created_by=request.user,
                        **template_data
                    )
                    created_count += 1
            
            return Response({
                'success': True,
                'created_templates': created_count,
                'message': f'{created_count} templates padrão criados'
            })
            
        except Profile.DoesNotExist:
            return Response({
                'error': 'Perfil não encontrado'
            }, status=status.HTTP_404_NOT_FOUND)


class NotificationDigestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationDigestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return NotificationDigest.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def generate_digest(self, request):
        """Gera digest manual para o usuário"""
        digest_type = request.data.get('type', 'daily')
        
        if digest_type not in ['hourly', 'daily', 'weekly']:
            return Response({
                'error': 'Tipo de digest inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if digest_type == 'daily':
                digest = NotificationDigestService._create_daily_digest(request.user)
            else:
                return Response({
                    'error': 'Tipo de digest não implementado ainda'
                }, status=status.HTTP_501_NOT_IMPLEMENTED)
            
            if digest:
                serializer = self.get_serializer(digest)
                return Response({
                    'success': True,
                    'digest': serializer.data
                })
            else:
                return Response({
                    'message': 'Nenhuma notificação encontrada para o período'
                })
                
        except Exception as e:
            logger.error(f"Erro ao gerar digest: {e}")
            return Response({
                'error': 'Erro interno ao gerar digest'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_daily_digests_view(request):
    """Gera digests diários para todos os usuários (apenas admins)"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not profile.is_org_admin:
            return Response(
                {'error': 'Apenas administradores podem gerar digests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        generated_count = NotificationDigestService.generate_daily_digests()
        
        return Response({
            'success': True,
            'digests_generated': generated_count,
            'message': f'{generated_count} digests diários gerados'
        })
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro ao gerar digests diários: {e}")
        return Response(
            {'error': 'Erro interno ao gerar digests'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_pending_digests_view(request):
    """Envia digests pendentes (apenas admins)"""
    try:
        profile = Profile.objects.get(user=request.user)
        
        if not profile.is_org_admin:
            return Response(
                {'error': 'Apenas administradores podem enviar digests'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        sent_count = NotificationDigestService.send_pending_digests()
        
        return Response({
            'success': True,
            'digests_sent': sent_count,
            'message': f'{sent_count} digests enviados'
        })
        
    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro ao enviar digests: {e}")
        return Response(
            {'error': 'Erro interno ao enviar digests'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_fiscal_obligations_manual(request):
    """
    Endpoint para geração manual de obrigações fiscais.
    Apenas administradores podem executar.
    """
    try:
        profile = Profile.objects.get(user=request.user)
        if not profile.is_org_admin:
            return Response(
                {'error': 'Apenas administradores podem gerar obrigações fiscais manualmente'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        organization = profile.organization
        if not organization:
            return Response(
                {'error': 'Administrador não associado a uma organização'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parâmetros opcionais
        months_ahead = int(request.data.get('months_ahead', 3))
        clean_old = request.data.get('clean_old', False)
        days_old = int(request.data.get('days_old', 30))

        # Limpar obrigações obsoletas se solicitado
        cleaned_count = 0
        if clean_old:
            cleaned_count = FiscalObligationGenerator.clean_old_pending_obligations(
                days_old=days_old,
                organization=organization
            )

        # Gerar obrigações
        results = FiscalObligationGenerator.generate_for_next_months(
            months_ahead=months_ahead,
            organization=organization
        )

        # Calcular totais
        total_created = sum(result['tasks_created'] for result in results)
        total_skipped = sum(result['tasks_skipped'] for result in results)
        total_errors = sum(len(result['errors']) for result in results)

        return Response({
            'success': True,
            'message': f'Geração concluída para {organization.name}',
            'summary': {
                'months_processed': len(results),
                'tasks_created': total_created,
                'tasks_skipped': total_skipped,
                'errors': total_errors,
                'old_tasks_cleaned': cleaned_count
            },
            'detailed_results': results
        })

    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro na geração manual de obrigações: {e}")
        return Response(
            {'error': f'Erro interno: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fiscal_obligations_stats(request):
    """
    Endpoint para obter estatísticas do sistema de obrigações fiscais.
    """
    try:
        profile = Profile.objects.get(user=request.user)
        
        # Verificar permissões - admins ou usuários com permissão de analytics
        if not (profile.is_org_admin or profile.can_view_analytics):
            return Response(
                {'error': 'Sem permissão para ver estatísticas fiscais'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        organization = profile.organization
        stats = FiscalObligationGenerator.get_generation_stats(organization)
        
        # Adicionar informações extras
        if organization:
            stats['organization_info'] = {
                'name': organization.name,
                'active_clients': organization.clients.filter(is_active=True).count(),
                'clients_with_tags': organization.clients.exclude(fiscal_tags=[]).count(),
                'active_definitions': FiscalObligationDefinition.objects.filter(
                    Q(organization__isnull=True) | Q(organization=organization),
                    is_active=True
                ).count()
            }

        return Response(stats)

    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas fiscais: {e}")
        return Response(
            {'error': f'Erro interno: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_client_fiscal_obligations(request):
    """
    Endpoint para testar quais obrigações seriam geradas para um cliente específico.
    """
    try:
        profile = Profile.objects.get(user=request.user)
        
        client_id = request.data.get('client_id')
        year = request.data.get('year', timezone.now().year)
        month = request.data.get('month', timezone.now().month)
        
        if not client_id:
            return Response(
                {'error': 'client_id é obrigatório'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response(
                {'error': 'Cliente não encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar acesso ao cliente
        if not profile.can_access_client(client):
            return Response(
                {'error': 'Sem acesso a este cliente'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Buscar definições aplicáveis
        definitions_query = FiscalObligationDefinition.objects.filter(is_active=True)
        
        if client.organization:
            definitions_query = definitions_query.filter(
                Q(organization__isnull=True) | Q(organization=client.organization)
            )

        applicable_obligations = []
        for definition in definitions_query:
            # Verificar se se aplica ao período
            if not FiscalObligationGenerator._should_generate_for_period(definition, year, month):
                continue
                
            # Verificar se se aplica ao cliente
            if definition.applies_to_client_tags:
                if definition.applies_to_client_tags != ['ALL'] and not any(
                    tag in (client.fiscal_tags or []) for tag in definition.applies_to_client_tags
                ):
                    continue
            
            # Calcular deadline
            deadline_info = FiscalObligationGenerator._calculate_deadline(definition, year, month)
            if not deadline_info:
                continue
            
            # Verificar se deve gerar agora
            should_generate = FiscalObligationGenerator._should_generate_now(
                deadline_info['deadline'], 
                definition.generation_trigger_offset_days
            )
            
            # Verificar se já existe
            period_key = FiscalObligationGenerator._generate_period_key(definition, year, month)
            existing_task = client.tasks.filter(
                source_fiscal_obligation=definition,
                obligation_period_key=period_key
            ).first()
            
            # Gerar título simulado
            simulated_title = FiscalObligationGenerator._generate_task_title(
                definition, client, deadline_info, year, month
            )
            
            applicable_obligations.append({
                'definition_id': definition.id,
                'definition_name': definition.name,
                'periodicity': definition.get_periodicity_display(),
                'required_tags': definition.applies_to_client_tags or [],
                'deadline': deadline_info['deadline'],
                'period_description': deadline_info['period_description'],
                'should_generate_now': should_generate,
                'existing_task': {
                    'id': existing_task.id,
                    'title': existing_task.title,
                    'status': existing_task.status
                } if existing_task else None,
                'simulated_title': simulated_title,
                'trigger_offset_days': definition.generation_trigger_offset_days,
                'priority': definition.get_default_priority_display()
            })

        return Response({
            'client': {
                'id': client.id,
                'name': client.name,
                'fiscal_tags': client.fiscal_tags or []
            },
            'test_period': {
                'year': year,
                'month': month,
                'month_name': datetime(year, month, 1).strftime('%B %Y')
            },
            'applicable_obligations': applicable_obligations,
            'summary': {
                'total_definitions_checked': definitions_query.count(),
                'applicable_count': len(applicable_obligations),
                'would_generate_count': sum(1 for o in applicable_obligations if o['should_generate_now'] and not o['existing_task']),
                'already_exists_count': sum(1 for o in applicable_obligations if o['existing_task'])
            }
        })

    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro no teste de obrigações fiscais: {e}")
        return Response(
            {'error': f'Erro interno: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class FiscalSystemSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = FiscalSystemSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        try:
            profile = Profile.objects.get(user=user)
            if profile.organization and profile.is_org_admin:
                return FiscalSystemSettings.objects.filter(organization=profile.organization)
            return FiscalSystemSettings.objects.none()
        except Profile.DoesNotExist:
            return FiscalSystemSettings.objects.none()
    
    def get_object(self):
        """Retorna ou cria configurações da organização do usuário."""
        try:
            profile = Profile.objects.get(user=self.request.user)
            if not profile.is_org_admin:
                raise PermissionDenied("Apenas administradores podem gerenciar configurações fiscais")
            
            if not profile.organization:
                raise ValidationError("Usuário não pertence a uma organização")
            
            settings = FiscalSystemSettings.get_for_organization(profile.organization)
            return settings
        except Profile.DoesNotExist:
            raise PermissionDenied("Perfil não encontrado")
    
    @action(detail=False, methods=['get'])
    def my_settings(self, request):
        """Endpoint para obter configurações da organização do usuário."""
        settings = self.get_object()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_settings(self, request):
        """Endpoint para atualizar configurações."""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def test_webhook(self, request):
        """Testa o webhook configurado."""
        settings = self.get_object()
        
        if not settings.webhook_url:
            return Response(
                {'error': 'Nenhum webhook configurado'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            test_data = {
                'type': 'webhook_test',
                'organization': settings.organization.name,
                'message': 'Teste de webhook do sistema fiscal',
                'timestamp': timezone.now().isoformat()
            }
            
            FiscalNotificationService._send_webhook(settings, test_data)
            
            return Response({'success': True, 'message': 'Webhook testado com sucesso'})
            
        except Exception as e:
            return Response(
                {'error': f'Erro no teste do webhook: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def send_test_email(self, request):
        """Envia email de teste."""
        settings = self.get_object()
        
        try:
            test_data = {
                'type': 'email_test',
                'organization': settings.organization.name,
                'stats': {
                    'tasks_created': 5,
                    'tasks_skipped': 2,
                    'errors': []
                },
                'timestamp': timezone.now().isoformat(),
                'success': True
            }
            
            FiscalNotificationService._send_generation_email(settings, test_data)
            
            return Response({'success': True, 'message': 'Email de teste enviado'})
            
        except Exception as e:
            return Response(
                {'error': f'Erro no envio do email: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_fiscal_obligations_manual(request):
    """
    Endpoint para geração manual de obrigações fiscais.
    """
    try:
        serializer = FiscalGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        profile = Profile.objects.get(user=request.user)
        if not profile.is_org_admin:
            return Response(
                {'error': 'Apenas administradores podem gerar obrigações fiscais manualmente'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        organization = profile.organization
        if not organization:
            return Response(
                {'error': 'Administrador não associado a uma organização'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        validated_data = serializer.validated_data
        months_ahead = validated_data['months_ahead']
        clean_old = validated_data['clean_old']
        days_old = validated_data['days_old']

        # Limpar obrigações obsoletas se solicitado
        cleaned_count = 0
        if clean_old:
            cleaned_count = FiscalObligationGenerator.clean_old_pending_obligations(
                days_old=days_old,
                organization=organization
            )

        # Gerar obrigações
        results = FiscalObligationGenerator.generate_for_next_months(
            months_ahead=months_ahead,
            organization=organization
        )

        # Calcular totais
        total_created = sum(result['tasks_created'] for result in results)
        total_skipped = sum(result['tasks_skipped'] for result in results)
        total_errors = sum(len(result['errors']) for result in results)

        return Response({
            'success': True,
            'message': f'Geração concluída para {organization.name}',
            'summary': {
                'months_processed': len(results),
                'tasks_created': total_created,
                'tasks_skipped': total_skipped,
                'errors': total_errors,
                'old_tasks_cleaned': cleaned_count
            },
            'detailed_results': results
        })

    except Profile.DoesNotExist:
        return Response(
            {'error': 'Perfil não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Erro na geração manual de obrigações: {e}")
        return Response(
            {'error': f'Erro interno: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fiscal_upcoming_deadlines(request):
    """
    Returns fiscal obligation tasks with upcoming deadlines for the user's organization.
    Default: next 30 days.
    Query Params:
        - days: Number of days ahead to check for deadlines (e.g., ?days=7 for next week). Default is 30.
        - limit: Max number of tasks to return. Default is 20.
    """
    try:
        profile = Profile.objects.get(user=request.user)
        if not profile.organization:
            return Response({'error': 'Usuário não associado a uma organização.'}, status=status.HTTP_400_BAD_REQUEST)

        # Permissions: Org admins or users with analytics/task view permissions
        if not (profile.is_org_admin or profile.can_view_analytics or profile.can_view_all_tasks):
            # If user can only see assigned tasks, filter for those. This might be too restrictive for a dashboard view.
            # For a general dashboard, typically broader view is preferred if allowed.
            # Consider if non-admins should see all upcoming fiscal deadlines for their org, or only their assigned ones.
            # For now, restricting to admins/analytics viewers for org-wide view.
             return Response({'error': 'Sem permissão para visualizar prazos fiscais da organização.'}, status=status.HTTP_403_FORBIDDEN)


        days_ahead_str = request.query_params.get('days', '30')
        limit_str = request.query_params.get('limit', '20')

        try:
            days_ahead = int(days_ahead_str)
            limit = int(limit_str)
            if not (1 <= days_ahead <= 90): # Limit days_ahead to a reasonable range
                raise ValueError("Parâmetro 'days' deve estar entre 1 e 90.")
            if not (1 <= limit <= 100): # Limit the number of results
                 raise ValueError("Parâmetro 'limit' deve estar entre 1 e 100.")
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        future_date = today + timedelta(days=days_ahead)

        upcoming_tasks = Task.objects.filter(
            client__organization=profile.organization,
            source_fiscal_obligation__isnull=False, # Ensure it's a fiscal obligation task
            deadline__gte=today,
            deadline__lte=future_date,
            status__in=['pending', 'in_progress'] # Only active tasks
        ).select_related(
            'client', 
            'assigned_to', 
            'source_fiscal_obligation' # To get obligation name if needed
        ).order_by('deadline', 'priority')[:limit]

        # Using TaskSerializer but might need a more specific one if you want less/different fields
        serializer = TaskSerializer(upcoming_tasks, many=True) 
        return Response(serializer.data)

    except Profile.DoesNotExist:
        return Response({'error': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro ao buscar prazos fiscais futuros: {e}")
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# views.py

# ... (other imports and the beginning of get_ai_advisor_initial_context) ...

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ai_advisor_initial_context(request):
    try:
        profile = Profile.objects.select_related('organization').get(user=request.user) # Fetch organization along with profile
        if not profile.organization:
            return Response({"error": "Usuário não está associado a uma organização."}, status=status.HTTP_400_BAD_REQUEST)

        if not profile.is_org_admin: # Or a more specific 'can_use_ai_advisor' permission
            return Response({"error": "Sem permissão para aceder ao consultor AI."}, status=status.HTTP_403_FORBIDDEN)

        organization = profile.organization
        context_data = {
            "organization_name": organization.name,
            "current_date": timezone.now().strftime("%Y-%m-%d"),
            "data_summary_period": "Últimos 90 dias e dados atuais relevantes" # Clarify the scope
        }
        
        # --- Timeframe for aggregations ---
        ninety_days_ago = timezone.now().date() - timedelta(days=90)
        today = timezone.now().date() # Use today consistently

        # 1. Clients Overview
        # ... (Client overview logic remains the same) ...
        active_clients = Client.objects.filter(organization=organization, is_active=True)
        client_details_sample = []
        top_clients = active_clients.order_by('-monthly_fee')[:5]
        low_fee_clients = active_clients.filter(monthly_fee__lte=0).order_by('name')[:3]
        
        clients_for_sample = list(top_clients) + list(low_fee_clients)
        clients_for_sample_ids = {c.id for c in clients_for_sample}
        
        if len(clients_for_sample_ids) < 8:
            additional_clients_needed = 8 - len(clients_for_sample_ids)
            other_clients = active_clients.exclude(id__in=clients_for_sample_ids).order_by('?')[:additional_clients_needed]
            clients_for_sample.extend(other_clients)
            clients_for_sample_ids.update(c.id for c in other_clients)
            
        unique_sample_clients = {c.id: c for c in clients_for_sample}.values()

        for client in unique_sample_clients:
            profit_record = ClientProfitability.objects.filter(
                client=client
            ).order_by('-year', '-month').first()
            client_details_sample.append({
                "name": client.name,
                "monthly_fee": float(client.monthly_fee or 0),
                "fiscal_tags": client.fiscal_tags or [],
                "recent_profit_margin": float(profit_record.profit_margin) if profit_record and profit_record.profit_margin is not None else None,
                "active_tasks_count": Task.objects.filter(client=client, status__in=['pending', 'in_progress']).count(),
            })
        context_data['clients_overview'] = {
            "total_active_clients": active_clients.count(),
            "clients_sample_details": client_details_sample,
            "clients_with_no_fee": active_clients.filter(monthly_fee__lte=0).count()
        }

        # 2. Profitability Snapshot (Organization Level for last 90 days)
        # ... (Profitability snapshot logic remains the same) ...
        profitability_snapshot = ClientProfitability.objects.filter(
            client__organization=organization,
            last_updated__gte=ninety_days_ago 
        ).aggregate(
            avg_profit_margin_org=Avg('profit_margin', filter=Q(profit_margin__isnull=False)),
            total_profit_org=Sum('profit', filter=Q(profit__isnull=False)),
            count_profitable_periods=Count('id', filter=Q(is_profitable=True)),
            count_unprofitable_periods=Count('id', filter=Q(is_profitable=False))
        )
        context_data['profitability_snapshot_organization'] = {
            "average_profit_margin": profitability_snapshot.get('avg_profit_margin_org'),
            "total_profit_last_90_days_approx": profitability_snapshot.get('total_profit_org'),
            "profitable_client_months_count": profitability_snapshot.get('count_profitable_periods'),
            "unprofitable_client_months_count": profitability_snapshot.get('count_unprofitable_periods'),
        }

        # 3. Tasks Overview
        org_tasks = Task.objects.filter(client__organization=organization)
        active_org_tasks = org_tasks.filter(status__in=['pending', 'in_progress'])
        
        duration_expression = ExpressionWrapper(F('completed_at') - F('created_at'), output_field=fields.DurationField())
        completed_tasks_recent = org_tasks.filter(
            status='completed',
            completed_at__gte=ninety_days_ago,
            created_at__isnull=False,
            completed_at__isnull=False
        )
        avg_completion_duration_data = completed_tasks_recent.annotate(duration=duration_expression).aggregate(avg_duration=Avg('duration'))
        
        avg_completion_days = None
        if avg_completion_duration_data and avg_completion_duration_data['avg_duration']:
            avg_completion_days = avg_completion_duration_data['avg_duration'].total_seconds() / (60*60*24)

        context_data['tasks_overview'] = {
            "total_tasks": org_tasks.count(),
            "active_tasks": active_org_tasks.count(),
            "overdue_tasks": active_org_tasks.filter(deadline__lt=today).count(), # Corrected: today instead of timezone.now().date()
            "completed_last_90_days": completed_tasks_recent.count(),
            "avg_task_completion_days_last_90_days": round(avg_completion_days, 1) if avg_completion_days is not None else None,
        }

        tasks_per_category = TaskCategory.objects.annotate(
            active_task_count=Count('tasks', filter=Q(tasks__client__organization=organization, tasks__status__in=['pending', 'in_progress']))
        ).filter(active_task_count__gt=0).order_by('-active_task_count')[:5]
        
        context_data['tasks_overview']['active_tasks_per_category_top_5'] = [
            {"category_name": cat.name, "count": cat.active_task_count} for cat in tasks_per_category
        ]

        # --- START: NEW SECTION FOR DETAILED TASK SAMPLE ---
        detailed_tasks_sample = []
        sample_task_ids = set()
        MAX_SAMPLE_TASKS = 15 # Max tasks to include in the detailed sample

        # a. Overdue tasks (up to 5)
        overdue_sample = active_org_tasks.filter(
            deadline__lt=today
        ).select_related('assigned_to', 'client').order_by('deadline', '-priority')[:5]
        for task in overdue_sample:
            if len(detailed_tasks_sample) < MAX_SAMPLE_TASKS and task.id not in sample_task_ids:
                detailed_tasks_sample.append({
                    "title": task.title,
                    "client_name": task.client.name if task.client else "N/A",
                    "status": task.get_status_display(),
                    "priority": task.get_priority_display(),
                    "deadline": task.deadline.strftime("%Y-%m-%d") if task.deadline else "N/A",
                    "assigned_to": task.assigned_to.username if task.assigned_to else "Não atribuído"
                })
                sample_task_ids.add(task.id)

        # b. Tasks due today or tomorrow (up to 5, excluding already added overdue)
        if len(detailed_tasks_sample) < MAX_SAMPLE_TASKS:
            due_soon_sample = active_org_tasks.filter(
                deadline__gte=today,
                deadline__lte=today + timedelta(days=1)
            ).exclude(id__in=sample_task_ids).select_related('assigned_to', 'client').order_by('deadline', 'priority')[:5]
            for task in due_soon_sample:
                if len(detailed_tasks_sample) < MAX_SAMPLE_TASKS and task.id not in sample_task_ids:
                    detailed_tasks_sample.append({
                        "title": task.title,
                        "client_name": task.client.name if task.client else "N/A",
                        "status": task.get_status_display(),
                        "priority": task.get_priority_display(),
                        "deadline": task.deadline.strftime("%Y-%m-%d") if task.deadline else "N/A",
                        "assigned_to": task.assigned_to.username if task.assigned_to else "Não atribuído"
                    })
                    sample_task_ids.add(task.id)
        
        # c. Other active high priority tasks or recently updated active tasks (to fill up to MAX_SAMPLE_TASKS)
        if len(detailed_tasks_sample) < MAX_SAMPLE_TASKS:
            remaining_needed = MAX_SAMPLE_TASKS - len(detailed_tasks_sample)
            other_active_sample = active_org_tasks.exclude(
                id__in=sample_task_ids
            ).select_related('assigned_to', 'client').order_by('-priority', '-updated_at')[:remaining_needed]
            for task in other_active_sample:
                # No need to check MAX_SAMPLE_TASKS again due to slice, but keep id check
                if task.id not in sample_task_ids:
                    detailed_tasks_sample.append({
                        "title": task.title,
                        "client_name": task.client.name if task.client else "N/A",
                        "status": task.get_status_display(),
                        "priority": task.get_priority_display(),
                        "deadline": task.deadline.strftime("%Y-%m-%d") if task.deadline else "N/A",
                        "assigned_to": task.assigned_to.username if task.assigned_to else "Não atribuído"
                    })
                    sample_task_ids.add(task.id)

        context_data['tasks_overview']['detailed_tasks_sample'] = detailed_tasks_sample
        # --- END: NEW SECTION FOR DETAILED TASK SAMPLE ---


        # 4. Fiscal Obligations Snapshot
        # ... (Fiscal obligations logic remains the same) ...
        upcoming_fiscal_days = 30
        future_date_fiscal = today + timedelta(days=upcoming_fiscal_days) # Corrected: today
        
        upcoming_fiscal_tasks = Task.objects.filter(
            client__organization=organization,
            source_fiscal_obligation__isnull=False,
            deadline__gte=today, # Corrected: today
            deadline__lte=future_date_fiscal,
            status__in=['pending', 'in_progress']
        ).select_related('source_fiscal_obligation', 'client').order_by('deadline')

        context_data['fiscal_obligations_snapshot'] = {
            "total_active_fiscal_definitions": FiscalObligationDefinition.objects.filter(
                Q(organization=organization) | Q(organization__isnull=True), is_active=True
            ).count(),
            "upcoming_deadlines_next_30_days_count": upcoming_fiscal_tasks.count(),
            "upcoming_deadlines_sample": [
                {
                    "obligation_name": task.source_fiscal_obligation.name if task.source_fiscal_obligation else task.title,
                    "client_name": task.client.name,
                    "deadline": task.deadline.strftime("%Y-%m-%d")
                } for task in upcoming_fiscal_tasks[:3]
            ]
        }

        # 5. Team Performance Snippet (Corrected field names based on previous implementation)
        # ... (Team performance logic remains the same) ...
        active_users_count = Profile.objects.filter(organization=organization, user__is_active=True).count()
        if active_users_count > 0:
            tasks_completed_last_month_org = org_tasks.filter(status='completed', completed_at__gte=today - timedelta(days=30)).count() # Corrected: today
            avg_tasks_per_user = tasks_completed_last_month_org / active_users_count if active_users_count > 0 else 0
            context_data['team_performance_snippet'] = {
                "active_team_members": active_users_count,
                "avg_tasks_completed_per_member_last_30_days": round(avg_tasks_per_user,1)
            }
        else:
            context_data['team_performance_snippet'] = {
                 "active_team_members": 0,
                 "avg_tasks_completed_per_member_last_30_days": 0
            }


        logger.info(f"Generated AI advisor context for org {organization.id}, user {request.user.username}. Size approx {len(json.dumps(context_data, cls=CustomJSONEncoder))} bytes.")

        return Response(context_data)

    except Profile.DoesNotExist:
        return Response({"error": "Perfil de usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error generating AI advisor initial context: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": "Erro ao preparar dados para o Consultor AI."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_ai_advisor_session(request):
    try:
        profile = Profile.objects.get(user=request.user)
        if not profile.is_org_admin: # Or your specific permission check
            return Response({"error": "Sem permissão para iniciar sessão com o Consultor AI."}, status=status.HTTP_403_FORBIDDEN)

        context_data = request.data.get('context', {})
        if not context_data: # This context comes from the /ai-advisor/get-initial-context/ call
            return Response({"error": "Dados de contexto são necessários para iniciar a sessão."}, status=status.HTTP_400_BAD_REQUEST)

        advisor_service = AIAdvisorService()
        session_id, initial_message = advisor_service.start_session(context_data, request.user)

        if session_id is None: # Indicates an error occurred within the service
            return Response({"error": initial_message or "Não foi possível iniciar a sessão com o Consultor AI."}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "session_id": session_id,
            "initial_message": initial_message
        }, status=status.HTTP_201_CREATED)

    except Profile.DoesNotExist:
        return Response({"error": "Perfil de usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in start_ai_advisor_session view: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": "Erro interno ao iniciar a sessão com o Consultor AI."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def query_ai_advisor(request):
    try:
        profile = Profile.objects.get(user=request.user)
        if not profile.is_org_admin: # Or your specific permission check
            return Response({"error": "Sem permissão para consultar o Consultor AI."}, status=status.HTTP_403_FORBIDDEN)

        session_id = request.data.get('session_id')
        user_query_text = request.data.get('query')

        if not session_id or not user_query_text:
            return Response({"error": "session_id e query são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

        advisor_service = AIAdvisorService()
        ai_response_text, error_message = advisor_service.process_query(session_id, user_query_text, request.user)

        if error_message:
            # Check if it's a session not found error specifically
            if "Sessão inválida ou expirada" in error_message:
                 return Response({"error": error_message}, status=status.HTTP_404_NOT_FOUND)
            return Response({"error": error_message or "Não foi possível obter resposta do Consultor AI."}, status=status.HTTP_502_BAD_GATEWAY)
        
        return Response({"response": ai_response_text})

    except Profile.DoesNotExist:
        return Response({"error": "Perfil de usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in query_ai_advisor view: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": "Erro interno ao consultar o Consultor AI."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)