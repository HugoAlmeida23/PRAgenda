from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Organization, Client, TaskCategory, Task, TimeEntry, Expense, ClientProfitability, Profile, AutoTimeTracking, NLPProcessor, WorkflowDefinition, WorkflowStep, TaskApproval, WorkflowNotification, WorkflowHistory
import json
from django.db import models
from django.db.models import Sum
import logging

logger = logging.getLogger(__name__)

class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    client_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'address', 'phone', 'email', 
                  'logo', 'created_at', 'updated_at', 'is_active', 
                  'subscription_plan', 'max_users', 'settings',
                  'member_count', 'client_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'member_count', 'client_count']
        
    def get_member_count(self, obj):
        return obj.members.count()
        
    def get_client_count(self, obj):
        return obj.clients.count()
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    organization_name = serializers.ReadOnlyField(source='organization.name')
    visible_clients_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = [
            # Campos básicos
            'invitation_code', 'user', 'username', 'email', 
            'organization', 'organization_name',
            'hourly_rate', 'role', 'access_level', 'phone', 
            'productivity_metrics',
            
            # Permissões de administração
            'is_org_admin',
            
            # Permissões para gestão de clientes
            'can_manage_clients',
            'can_view_all_clients',
            'can_create_clients',
            'can_edit_clients',
            'can_delete_clients',
            'can_change_client_status',
            'visible_clients',
            'visible_clients_info',
            
            # Permissões para gestão de tarefas
            'can_assign_tasks',
            'can_create_tasks',
            'can_edit_all_tasks',
            'can_edit_assigned_tasks',
            'can_delete_tasks',
            'can_view_all_tasks',
            'can_approve_tasks',
            
            # Permissões para gestão de tempo
            'can_log_time',
            'can_edit_own_time',
            'can_edit_all_time',
            'can_view_team_time',
            
            # Permissões financeiras
            'can_view_client_fees',
            'can_edit_client_fees',
            'can_manage_expenses',
            'can_view_profitability',
            'can_view_team_profitability',
            'can_view_organization_profitability',
            
            # Permissões de relatórios e análises
            'can_view_analytics',
            'can_export_reports',
            'can_create_custom_reports',
            'can_schedule_reports',
            
            # Permissões de workflow
            'can_create_workflows',
            'can_edit_workflows',
            'can_assign_workflows',
            'can_manage_workflows',
        ]
        read_only_fields = [
            'invitation_code', 'user', 'username', 
            'email', 'organization_name'
        ]
    
    def get_visible_clients_info(self, obj):
        """Returns basic info about visible clients for display purposes"""
        visible_clients = obj.visible_clients.all()
        return [{'id': client.id, 'name': client.name} for client in visible_clients]
    

class ClientSerializer(serializers.ModelSerializer):
    account_manager_name = serializers.ReadOnlyField(source='account_manager.username')
    organization_name = serializers.ReadOnlyField(source='organization.name')
    
    class Meta:
        model = Client
        fields = ['id', 'name', 'nif', 'email', 'phone', 'address', 
                  'organization', 'organization_name',
                  'account_manager', 'account_manager_name', 'monthly_fee', 
                  'created_at', 'updated_at', 'is_active', 'notes']
        read_only_fields = ['id', 'created_at', 'updated_at', 'organization_name']


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = ['id', 'name', 'description', 'color', 'average_time_minutes', 'created_at']
        read_only_fields = ['id', 'created_at']


class WorkflowDefinitionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    
    class Meta:
        model = WorkflowDefinition
        fields = ['id', 'name', 'description', 'created_by', 'created_by_name',
                  'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowStepSerializer(serializers.ModelSerializer):
    workflow_name = serializers.ReadOnlyField(source='workflow.name')
    assign_to_name = serializers.ReadOnlyField(source='assign_to.username')
    
    # Informações adicionais
    time_entries_count = serializers.SerializerMethodField()
    total_time_spent = serializers.SerializerMethodField()
    is_approved = serializers.SerializerMethodField()
    
    # Handle next_steps and previous_steps as lists
    next_steps = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list
    )
    previous_steps = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list
    )

    class Meta:
        model = WorkflowStep
        fields = [
            'id', 
            'workflow', 
            'workflow_name', 
            'name', 
            'description', 
            'order', 
            'assign_to', 
            'assign_to_name', 
            'requires_approval', 
            'approver_role', 
            'next_steps',      
            'previous_steps',  
            'time_entries_count', 
            'total_time_spent',
            'is_approved'
        ]
        read_only_fields = [
            'id', 
            'workflow_name', 
            'assign_to_name', 
            'time_entries_count', 
            'total_time_spent', 
            'is_approved'
        ]

    def validate_next_steps(self, value):
        """Validate that next_steps is a list of valid UUIDs or strings"""
        if not isinstance(value, list):
            raise serializers.ValidationError("next_steps must be a list")
        
        # Basic validation - you can add more specific UUID validation if needed
        for step_id in value:
            if not isinstance(step_id, (str, int)):
                raise serializers.ValidationError("Each step ID must be a string or integer")
        
        return value

    def validate_previous_steps(self, value):
        """Validate that previous_steps is a list of valid UUIDs or strings"""
        if not isinstance(value, list):
            raise serializers.ValidationError("previous_steps must be a list")
        
        for step_id in value:
            if not isinstance(step_id, (str, int)):
                raise serializers.ValidationError("Each step ID must be a string or integer")
        
        return value

    def create(self, validated_data):
        """Create workflow step ensuring next_steps and previous_steps are properly stored"""
        # Ensure next_steps and previous_steps are lists
        validated_data['next_steps'] = validated_data.get('next_steps', [])
        validated_data['previous_steps'] = validated_data.get('previous_steps', [])
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update workflow step ensuring connections are properly handled"""
        # Handle next_steps update
        if 'next_steps' in validated_data:
            instance.next_steps = validated_data['next_steps']
        
        # Handle previous_steps update
        if 'previous_steps' in validated_data:
            instance.previous_steps = validated_data['previous_steps']
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        """Ensure next_steps and previous_steps are returned as lists"""
        data = super().to_representation(instance)
        
        # Ensure next_steps is always a list
        next_steps = instance.next_steps
        if isinstance(next_steps, str):
            try:
                data['next_steps'] = json.loads(next_steps) if next_steps else []
            except (json.JSONDecodeError, TypeError):
                data['next_steps'] = []
        elif isinstance(next_steps, list):
            data['next_steps'] = next_steps
        else:
            data['next_steps'] = []
        
        # Ensure previous_steps is always a list
        previous_steps = instance.previous_steps
        if isinstance(previous_steps, str):
            try:
                data['previous_steps'] = json.loads(previous_steps) if previous_steps else []
            except (json.JSONDecodeError, TypeError):
                data['previous_steps'] = []
        elif isinstance(previous_steps, list):
            data['previous_steps'] = previous_steps
        else:
            data['previous_steps'] = []
        
        return data
    
    def get_time_entries_count(self, obj):
        return obj.time_entries.count()
    
    def get_total_time_spent(self, obj):
        total_sum = obj.time_entries.aggregate(total=Sum('minutes_spent'))['total']
        return total_sum or 0
    
    def get_is_approved(self, obj):
        if not obj.requires_approval:
            return None 
        return TaskApproval.objects.filter(workflow_step=obj, approved=True).exists()

class TaskSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    workflow_name = serializers.ReadOnlyField(source='workflow.name')
    current_workflow_step_name = serializers.ReadOnlyField(source='current_workflow_step.name')
    
    # Informações adicionais do workflow
    workflow_progress = serializers.SerializerMethodField()
    available_next_steps = serializers.SerializerMethodField()
    workflow_step_assignee = serializers.ReadOnlyField(source='current_workflow_step.assign_to.username')
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'client', 'client_name', 
                  'category', 'category_name', 'assigned_to', 'assigned_to_name', 
                  'created_by', 'created_by_name', 'status', 'priority', 
                  'deadline', 'estimated_time_minutes', 'created_at', 
                  'updated_at', 'completed_at','workflow', 'workflow_name', 
                  'current_workflow_step', 'current_workflow_step_name', 
                  'workflow_comment', 'workflow_progress', 'available_next_steps',
                  'workflow_step_assignee']
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']

    def get_workflow_progress(self, obj):
        
        """
        Calcula o progresso do workflow - CORRIGIDO para não retornar null quando sem current_workflow_step
        """
        logger.info(f"=== GET_WORKFLOW_PROGRESS PARA TASK {obj.id} ===")
        logger.info(f"Task: {obj.title}")
        logger.info(f"Workflow: {obj.workflow}")
        logger.info(f"Current workflow step: {obj.current_workflow_step}")
        
        if not obj.workflow:
            logger.info(f"Task {obj.id} não tem workflow")
            return None
        
        # CORREÇÃO: Não retornar None se não há current_workflow_step
        # Pode ser que o workflow ainda não foi iniciado ou foi concluído
        
        from .models import WorkflowHistory
        
        # Buscar todos os passos do workflow ordenados
        all_steps = obj.workflow.steps.order_by('order')
        total_steps = all_steps.count()
        
        logger.info(f"Workflow '{obj.workflow.name}' tem {total_steps} passos")
        
        if total_steps == 0:
            logger.warning(f"Workflow sem passos para task {obj.id}")
            return {
                'current_step': 0,
                'completed_steps': 0,
                'total_steps': 0,
                'percentage': 0,
                'is_completed': False
            }
        
        # Log todos os passos
        for step in all_steps:
            logger.info(f"  Passo {step.order}: {step.name} (ID: {step.id})")
        
        # Determinar passos concluídos baseado no histórico
        completed_step_ids = set()
        
        # Buscar histórico de passos concluídos
        completed_histories = WorkflowHistory.objects.filter(
            task=obj,
            action__in=['step_completed', 'step_advanced']
        )
        
        logger.info(f"Encontradas {completed_histories.count()} entradas de histórico")
        
        for history in completed_histories:
            logger.info(f"  História: {history.action} - From: {history.from_step} - To: {history.to_step}")
            if history.from_step_id:
                completed_step_ids.add(history.from_step_id)
        
        # Verificar se workflow foi marcado como completo
        workflow_completed = WorkflowHistory.objects.filter(
            task=obj,
            action='workflow_completed'
        ).exists()
        
        logger.info(f"Workflow marcado como completo: {workflow_completed}")
        
        # NOVA LÓGICA: Calcular progresso baseado no estado atual
        if workflow_completed:
            # Workflow completamente finalizado
            completed_count = total_steps
            current_step_number = total_steps
            percentage = 100.0
            logger.info("Workflow completo - todos os passos concluídos")
            
        elif obj.current_workflow_step:
            # Workflow em progresso com passo atual definido
            current_order = obj.current_workflow_step.order
            logger.info(f"Passo atual tem order: {current_order}")
            
            # Marcar passos anteriores como concluídos
            for step in all_steps:
                if step.order < current_order:
                    completed_step_ids.add(step.id)
                    logger.info(f"  Marcando passo {step.name} (order {step.order}) como concluído")
            
            completed_count = len(completed_step_ids)
            current_step_number = current_order
            percentage = (completed_count / total_steps) * 100 if total_steps > 0 else 0
            
        else:
            # NOVA CONDIÇÃO: Workflow existe mas não há passo atual
            # Isso pode significar que o workflow ainda não foi iniciado
            # OU que foi concluído e o current_workflow_step foi limpo
            
            logger.info("Sem current_workflow_step - analisando histórico")
            
            if completed_step_ids:
                # Há passos concluídos no histórico
                completed_count = len(completed_step_ids)
                
                # Tentar determinar onde estamos baseado no histórico
                last_history = WorkflowHistory.objects.filter(
                    task=obj,
                    action__in=['step_completed', 'step_advanced', 'workflow_assigned']
                ).order_by('-created_at').first()
                
                if last_history and last_history.to_step:
                    current_step_number = last_history.to_step.order
                else:
                    current_step_number = completed_count + 1
                    
                percentage = (completed_count / total_steps) * 100
                
            else:
                # Nenhum histórico - workflow não iniciado
                completed_count = 0
                current_step_number = 1  # Próximo passo seria o primeiro
                percentage = 0.0
                logger.info("Workflow não iniciado - sem histórico")
        
        result = {
            'current_step': current_step_number,
            'completed_steps': completed_count,
            'total_steps': total_steps,
            'percentage': round(percentage, 1),
            'is_completed': workflow_completed
        }
        
        logger.info(f"RESULTADO WORKFLOW PROGRESS: {result}")
        logger.info(f"=== FIM GET_WORKFLOW_PROGRESS ===")
        
        return result

    def get_available_next_steps(self, obj):
        """Retorna os próximos passos disponíveis"""
        if not obj.current_workflow_step:
            return []
            
        try:
            next_step_ids = obj.current_workflow_step.next_steps
            if isinstance(next_step_ids, str):
                next_step_ids = json.loads(next_step_ids)
            
            next_steps = WorkflowStep.objects.filter(id__in=next_step_ids)
            return [{'id': step.id, 'name': step.name, 'assign_to': step.assign_to.username if step.assign_to else None} 
                    for step in next_steps]
        except:
            return []


class TimeEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    client_name = serializers.ReadOnlyField(source='client.name')
    task_title = serializers.ReadOnlyField(source='task.title')
    category_name = serializers.ReadOnlyField(source='category.name')
    workflow_step_name = serializers.ReadOnlyField(source='workflow_step.name')
    
    class Meta:
        model = TimeEntry
        fields = ['id', 'user', 'user_name', 'client', 'client_name', 
                  'task', 'task_title', 'category', 'category_name', 
                  'workflow_step', 'workflow_step_name',
                  'description', 'minutes_spent', 'date', 'start_time', 
                  'end_time', 'created_at', 'original_text', 'task_status_after',
                  'advance_workflow', 'workflow_step_completed'] 
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'user': {'required': False}
        }


class ExpenseSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    
    class Meta:
        model = Expense
        fields = ['id', 'amount', 'description', 'category', 'date', 
                  'client', 'client_name', 'created_by', 'created_by_name', 
                  'created_at', 'is_auto_categorized', 'source']
        read_only_fields = ['id', 'created_at']


class ClientProfitabilitySerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name')
    
    class Meta:
        model = ClientProfitability
        fields = ['id', 'client', 'client_name', 'year', 'month', 
                  'total_time_minutes', 'time_cost', 'total_expenses', 
                  'monthly_fee', 'profit', 'profit_margin', 'is_profitable', 
                  'last_updated']
        read_only_fields = ['id', 'last_updated']
        
class AutoTimeTrackingSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = AutoTimeTracking
        fields = ['id', 'user', 'user_name', 'start_time', 'end_time', 
                  'activity_data', 'processed', 'converted_to_entries']
        read_only_fields = ['id', 'user']
        
class NLPProcessorSerializer(serializers.ModelSerializer):
    class Meta:
        model = NLPProcessor
        fields = ['id', 'pattern', 'entity_type', 'confidence', 
                  'created_at', 'updated_at', 'usage_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'usage_count']


class TaskApprovalSerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='task.title')
    workflow_step_name = serializers.ReadOnlyField(source='workflow_step.name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.username')
    
    class Meta:
        model = TaskApproval
        fields = ['id', 'task', 'task_title', 'workflow_step', 'workflow_step_name',
                  'approved_by', 'approved_by_name', 'approved_at', 'approved', 'comment']
        read_only_fields = ['id', 'approved_at', 'approved_by']
    
    def create(self, validated_data):
        # Set the approved_by field to the current user
        validated_data['approved_by'] = self.context['request'].user
        return super().create(validated_data)


class WorkflowNotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    task_title = serializers.ReadOnlyField(source='task.title')
    workflow_step_name = serializers.ReadOnlyField(source='workflow_step.name')
    
    class Meta:
        model = WorkflowNotification
        fields = ['id', 'user', 'user_name', 'task', 'task_title',
                  'workflow_step', 'workflow_step_name', 'notification_type',
                  'title', 'message', 'is_read', 'email_sent',
                  'created_at', 'read_at']
        read_only_fields = ['id', 'created_at', 'read_at']


class WorkflowHistorySerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='task.title')
    from_step_name = serializers.ReadOnlyField(source='from_step.name')
    to_step_name = serializers.ReadOnlyField(source='to_step.name')
    changed_by_name = serializers.ReadOnlyField(source='changed_by.username')
    
    class Meta:
        model = WorkflowHistory
        fields = ['id', 'task', 'task_title', 'from_step', 'from_step_name',
                  'to_step', 'to_step_name', 'changed_by', 'changed_by_name',
                  'action', 'comment', 'time_spent_minutes', 'created_at']
        read_only_fields = ['id', 'created_at']