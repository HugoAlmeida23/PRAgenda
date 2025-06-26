# serializers.py

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Organization, Client,GeneratedReport,SAFTFile, NotificationSettings,FiscalObligationDefinition, TaskCategory, Task, TimeEntry, NotificationDigest, NotificationTemplate,Expense, ClientProfitability, Profile, AutoTimeTracking, WorkflowDefinition, WorkflowStep, TaskApproval, WorkflowNotification, WorkflowHistory
import json
from django.db import models
from django.db.models import Sum, Exists, OuterRef # Import Exists
import logging
from .models import FiscalSystemSettings
from django.utils import timezone


logger = logging.getLogger(__name__)


class GeneratedReportSerializer(serializers.ModelSerializer):
    organization_name = serializers.ReadOnlyField(source='organization.name', allow_null=True)
    generated_by_username = serializers.ReadOnlyField(source='generated_by.username', allow_null=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    report_format_display = serializers.CharField(source='get_report_format_display', read_only=True)

    class Meta:
        model = GeneratedReport
        fields = [
            'id', 'name', 'report_type', 'report_type_display', 'report_format', 'report_format_display',
            'organization', 'organization_name', 'generated_by', 'generated_by_username',
            'created_at', 'parameters', 'storage_url', 'file_size_kb', 'description',
            'status', # <-- ADD THIS FIELD
        ]
        read_only_fields = [
            'id', 'organization', 'organization_name', 
            'generated_by', 'generated_by_username', 
            'created_at', 'report_type_display', 'report_format_display',
            'storage_url', 'file_size_kb', 'status' # <-- ADD status TO read_only_fields
        ]
    def validate_parameters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Parâmetros devem ser um objeto JSON.")
        return value

class SAFTFileSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.ReadOnlyField(source='uploaded_by.username')
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SAFTFile
        fields = [
            'id', 'organization', 'uploaded_by', 'uploaded_by_username', 
            'file', 'original_filename', 'status', 'status_display', 
            'processing_log', 'fiscal_year', 'start_date', 'end_date', 
            'company_name', 'company_tax_id', 'summary_data', 
            'uploaded_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'organization', 'uploaded_by', 'uploaded_by_username', 
            'status', 'status_display', 'processing_log', 'fiscal_year', 
            'start_date', 'end_date', 'company_name', 'company_tax_id', 
            'summary_data', 'uploaded_at', 'processed_at'
        ]  

class FiscalObligationDefinitionSerializer(serializers.ModelSerializer):
    # These fields are now provided by the optimized queryset, no performance hit.
    organization_name = serializers.ReadOnlyField(source='organization.name', allow_null=True)
    default_task_category_name = serializers.ReadOnlyField(source='default_task_category.name', allow_null=True)
    default_workflow_name = serializers.ReadOnlyField(source='default_workflow.name', allow_null=True)

    class Meta:
        model = FiscalObligationDefinition
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        # Example validation: if periodicity is 'OTHER', custom_rule_trigger_month should be set.
        if data.get('periodicity') == 'OTHER' and not data.get('custom_rule_trigger_month'):
            raise serializers.ValidationError({
                "custom_rule_trigger_month": "Para periodicidade 'Outra', o 'Mês de Gatilho para Regra Customizada' é obrigatório."
            })
        
        # If calculation_basis is 'SPECIFIC_DATE' and periodicity is 'ANNUAL', specific_month_reference is often expected
        if data.get('periodicity') == 'ANNUAL' and \
           data.get('calculation_basis') == 'SPECIFIC_DATE' and \
           not data.get('specific_month_reference'):
            # This might be a warning or an error depending on your rules
            # For now, let's make it a potential validation error, can be relaxed.
             logger.info("Para obrigações anuais com base em data específica, 'Mês de Referência Específico' é recomendado.")
            # raise serializers.ValidationError({
            #     "specific_month_reference": "Para obrigações anuais com base em data específica, 'Mês de Referência Específico' é usualmente necessário."
            # })


        # Ensure organization is handled correctly based on user creating it (handled in ViewSet perform_create)
        # No need to validate organization here if ViewSet handles it.
        return data

class OrganizationSerializer(serializers.ModelSerializer):
    # These are now efficient annotated fields from the queryset.
    member_count = serializers.IntegerField(read_only=True)
    client_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'address', 'phone', 'email', 
                  'logo', 'created_at', 'updated_at', 'is_active', 
                  'subscription_plan', 'max_users', 'settings',
                  'member_count', 'client_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'member_count', 'client_count']
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    # Direct lookups, optimized by `select_related` in the ViewSet.
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    organization_name = serializers.ReadOnlyField(source='organization.name')
    
    # This field now comes from an annotation in the ViewSet.
    unread_notifications_count = serializers.IntegerField(read_only=True)
    
    # This remains a SerializerMethodField because it formats data, 
    # but it's now efficient because the `visible_clients` are prefetched.
    visible_clients_info = serializers.SerializerMethodField()
    
    # This field returns static data, no DB hit, so it's fine.
    notification_settings = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        # Kept the field list as is
        fields = [
            'invitation_code', 'user', 'username', 'email', 'organization', 'organization_name',
            'hourly_rate', 'role', 'access_level', 'phone', 'productivity_metrics',
            'is_org_admin',
            'can_manage_clients', 'can_view_all_clients', 'can_create_clients', 'can_edit_clients', 'can_delete_clients', 'can_change_client_status',
            'visible_clients', 'visible_clients_info',
            'can_assign_tasks', 'can_create_tasks', 'can_edit_all_tasks', 'can_edit_assigned_tasks', 'can_delete_tasks', 'can_view_all_tasks', 'can_approve_tasks',
            'can_log_time', 'can_edit_own_time', 'can_edit_all_time', 'can_view_team_time',
            'can_view_client_fees', 'can_edit_client_fees', 'can_manage_expenses', 'can_view_profitability', 'can_view_team_profitability', 'can_view_organization_profitability',
            'can_view_analytics', 'can_export_reports', 'can_create_custom_reports', 'can_schedule_reports',
            'can_create_workflows', 'can_edit_workflows', 'can_assign_workflows', 'can_manage_workflows',
            'notification_settings', 'unread_notifications_count'
        ]
        read_only_fields = [
            'invitation_code', 'user', 'username', 'email', 'organization_name', 
            'notification_settings', 'unread_notifications_count'
        ]
    
    def get_visible_clients_info(self, obj):
        """Returns basic info about visible clients for display purposes (now efficient)."""
        # The .all() call here does NOT hit the database again because of prefetch_related in the ViewSet
        visible_clients = obj.visible_clients.all()
        return [{'id': client.id, 'name': client.name} for client in visible_clients]

    def get_notification_settings(self, obj):
        """Configurações de notificação do usuário (no DB hit)"""
        return {
            'email_notifications': True, 'workflow_notifications': True,
            'deadline_notifications': True, 'approval_notifications': True,
            'daily_digest': False, 'notification_frequency': 'immediate'
        }

class ClientSerializer(serializers.ModelSerializer):
    account_manager_name = serializers.ReadOnlyField(source='account_manager.username', allow_null=True)
    organization_name = serializers.ReadOnlyField(source='organization.name', allow_null=True)
    
    class Meta:
        model = Client
        fields = ['id', 'name', 'nif', 'email', 'phone', 'address', 
                  'organization', 'organization_name',
                  'account_manager', 'account_manager_name', 'monthly_fee', 
                  'created_at', 'updated_at', 'is_active', 'notes', 'fiscal_tags']
        read_only_fields = ['id', 'created_at', 'updated_at', 'organization_name']
    
    def validate_fiscal_tags(self, value):
        if value is None: return []
        if not isinstance(value, list):
            raise serializers.ValidationError("fiscal_tags must be a list")
        return [str(tag).upper().strip() for tag in value if str(tag).strip()]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not isinstance(data.get('fiscal_tags'), list):
            data['fiscal_tags'] = []
        return data


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = ['id', 'name', 'description', 'color', 'average_time_minutes', 'created_at']
        read_only_fields = ['id', 'created_at']


class WorkflowDefinitionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username', allow_null=True)
    
    class Meta:
        model = WorkflowDefinition
        fields = ['id', 'name', 'description', 'created_by', 'created_by_name',
                  'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']

class MinimalWorkflowStepSerializer(serializers.ModelSerializer): # For nested display of previous steps
    class Meta:
        model = WorkflowStep
        fields = ['id', 'name', 'order']

class WorkflowStepSerializer(serializers.ModelSerializer):
    workflow_name = serializers.ReadOnlyField(source='workflow.name', allow_null=True)
    assign_to_name = serializers.ReadOnlyField(source='assign_to.username', allow_null=True)
    
    time_entries_count = serializers.IntegerField(read_only=True)
    total_time_spent = serializers.IntegerField(read_only=True)
    is_approved = serializers.BooleanField(read_only=True, allow_null=True)
    
    # For ManyToManyField 'next_steps':
    # - On WRITE: Accepts a list of primary keys of WorkflowStep instances.
    # - On READ: Serializes as a list of primary keys by default.
    next_steps = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=WorkflowStep.objects.all(), # Queryset used for validation during deserialization
        required=False # Allow empty list
    )
    
    # For 'previous_steps' (the reverse relation of next_steps):
    # This should be read-only and can provide more info if needed.
    previous_steps_info = MinimalWorkflowStepSerializer(source='previous_steps', many=True, read_only=True)

    class Meta:
        model = WorkflowStep
        fields = [
            'id', 'workflow', 'workflow_name', 'name', 'description', 'order', 
            'assign_to', 'assign_to_name', 'requires_approval', 'approver_role', 
            'next_steps', 
            'previous_steps_info', # Changed from previous_steps
            'time_entries_count', 
            'total_time_spent', 'is_approved'
        ]
        read_only_fields = [
            'id', 'workflow_name', 'assign_to_name', 'time_entries_count', 
            'total_time_spent', 'is_approved', 'previous_steps_info'
        ]
    
class TaskSerializer(serializers.ModelSerializer):
    # Direct lookups, made efficient by `select_related` in the ViewSet.
    client_name = serializers.CharField(source='client.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True, allow_null=True)
    current_workflow_step_name = serializers.CharField(source='current_workflow_step.name', read_only=True, allow_null=True)
    workflow_step_assignee = serializers.CharField(source='current_workflow_step.assign_to.username', read_only=True, allow_null=True)

    # ENHANCED: Multi-user assignment fields
    collaborators = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.all(), 
        required=False
    )
    collaborators_info = serializers.SerializerMethodField()
    all_assigned_users = serializers.SerializerMethodField()
    assignment_summary = serializers.SerializerMethodField()

    # Workflow and notification fields
    workflow_progress = serializers.SerializerMethodField()
    available_next_steps = serializers.SerializerMethodField()
    has_pending_notifications = serializers.BooleanField(read_only=True)
    notifications_count = serializers.IntegerField(read_only=True)
    latest_notification = serializers.SerializerMethodField()
    workflow_step_assignments = serializers.JSONField(required=False)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'client', 'client_name', 
            'category', 'category_name', 'assigned_to', 'assigned_to_name',
            'collaborators', 'collaborators_info', 'all_assigned_users', 'assignment_summary',
            'created_by', 'created_by_name', 'status', 'priority', 
            'deadline', 'estimated_time_minutes', 'created_at', 
            'updated_at', 'completed_at','workflow', 'workflow_name', 
            'current_workflow_step', 'current_workflow_step_name', 
            'workflow_comment', 'workflow_progress', 'available_next_steps',
            'workflow_step_assignments', 'workflow_step_assignee', 
            'has_pending_notifications', 'notifications_count', 'latest_notification'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'completed_at', 
            'has_pending_notifications', 'notifications_count', 'latest_notification'
        ]

    def get_collaborators_info(self, obj):
        """Returns detailed info about collaborators (efficient with prefetch)."""
        try:
            # If collaborators are prefetched, this won't hit the database
            collaborators = obj.collaborators.all()
            return [
                {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email
                }
                for user in collaborators
            ]
        except:
            return []

    def get_all_assigned_users(self, obj):
        """Returns all users assigned to this task in any capacity."""
        try:
            all_users = obj.get_all_assigned_users()
            return [
                {
                    'id': user.id,
                    'username': user.username,
                    'role': obj.get_user_role_in_task(user),
                    'is_primary': user == obj.assigned_to
                }
                for user in all_users
            ]
        except:
            return []

    def get_assignment_summary(self, obj):
        """Provides a summary of task assignments for UI display."""
        try:
            summary = {
                'primary_assignee': None,
                'collaborators_count': 0,
                'workflow_assignees_count': 0,
                'total_assigned_users': 0,
                'has_multiple_assignees': False
            }

            # Primary assignee
            if obj.assigned_to:
                summary['primary_assignee'] = {
                    'id': obj.assigned_to.id,
                    'username': obj.assigned_to.username
                }

            # Collaborators count
            summary['collaborators_count'] = obj.collaborators.count()

            # Workflow assignees count
            if obj.workflow_step_assignments:
                unique_workflow_users = set(
                    str(user_id) for user_id in obj.workflow_step_assignments.values()
                    if user_id and str(user_id).isdigit()
                )
                summary['workflow_assignees_count'] = len(unique_workflow_users)

            # Total count
            all_users = obj.get_all_assigned_users()
            summary['total_assigned_users'] = len(all_users)
            summary['has_multiple_assignees'] = len(all_users) > 1

            return summary
        except:
            return {
                'primary_assignee': None,
                'collaborators_count': 0,
                'workflow_assignees_count': 0,
                'total_assigned_users': 0,
                'has_multiple_assignees': False
            }

    def get_workflow_progress(self, obj):
        """Calls the optimized model method."""
        return obj.get_workflow_progress_data()

    def get_available_next_steps(self, obj):
        """Calls the optimized model method."""
        return obj.get_available_next_steps()

    def get_latest_notification(self, obj):
        """Gets the latest notification from the prefetched set (efficient)."""
        if hasattr(obj, 'workflow_notifications') and obj.workflow_notifications.all():
            latest = obj.workflow_notifications.all()[0]
            return {
                'id': latest.id, 'type': latest.notification_type,
                'title': latest.title, 'created_at': latest.created_at,
                'is_read': latest.is_read
            }
        return None

    def validate(self, data):
        """Enhanced validation for multi-user assignments."""
        request = self.context.get('request')
        user = request.user if request else None
        
        # Validate that collaborators don't include the primary assignee
        assigned_to = data.get('assigned_to')
        collaborators = data.get('collaborators', [])
        
        if assigned_to and assigned_to in collaborators:
            raise serializers.ValidationError({
                'collaborators': 'O responsável principal não pode ser incluído como colaborador.'
            })

        # Validate that all collaborators belong to the same organization
        if user and collaborators:
            try:
                user_profile = user.profile
                if user_profile.organization:
                    # Check if all collaborators belong to the same organization
                    collaborator_profiles = Profile.objects.filter(
                        user__in=collaborators,
                        organization=user_profile.organization
                    )
                    if len(collaborator_profiles) != len(collaborators):
                        raise serializers.ValidationError({
                            'collaborators': 'Todos os colaboradores devem pertencer à mesma organização.'
                        })
            except Profile.DoesNotExist:
                pass  # Handle superuser case

        return data

    def create(self, validated_data):
        """Enhanced create method to handle collaborators."""
        collaborators_data = validated_data.pop('collaborators', [])
        task = super().create(validated_data)
        if collaborators_data: # Only set collaborators if provided (multiple mode)
            task.collaborators.set(collaborators_data)
        return task

    def update(self, instance, validated_data):
        collaborators_data = validated_data.pop('collaborators', None) 
        # If 'multiple' mode, frontend should send assigned_to as null
        # If 'single' mode, frontend sends assigned_to value and collaborators as empty array
        
        instance = super().update(instance, validated_data)

        if collaborators_data is not None: # If collaborators key was in request.data
            instance.collaborators.set(collaborators_data)
        elif 'collaborators' in validated_data and not collaborators_data: # Explicit empty list means clear them
            instance.collaborators.clear()
        # If 'collaborators' key is not in validated_data at all, don't touch them.
        
        return instance

class NotificationStatsSerializer(serializers.Serializer):
    total_notifications = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    urgent_count = serializers.IntegerField()
    by_type = serializers.DictField()
    by_priority = serializers.DictField()
    recent_activity = serializers.ListField()


class NotificationSummarySerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='task.title')
    time_ago = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowNotification
        fields = [
            'id', 'title', 'message', 'notification_type', 'priority',
            'task_title', 'is_read', 'created_at', 'time_ago', 'icon', 'color'
        ]
    
    def get_time_ago(self, obj):
        from django.utils import timezone, timesince
        return timesince.timesince(obj.created_at, now=timezone.now()).split(',')[0] + " ago"
    
    def get_icon(self, obj):
        icon_map = {
            'step_ready': 'play-circle', 'step_completed': 'check-circle',
            'approval_needed': 'alert-circle', 'approval_completed': 'check-circle-2',
            'workflow_completed': 'flag', 'deadline_approaching': 'clock',
            'step_overdue': 'alert-triangle', 'manual_reminder': 'bell',
            'workflow_assigned': 'git-branch', 'step_rejected': 'x-circle',
            'manual_advance_needed': 'help-circle'
        }
        return icon_map.get(obj.notification_type, 'bell')
    
    def get_color(self, obj):
        if obj.priority == 'urgent': return 'red'
        if obj.priority == 'high': return 'orange'
        if obj.notification_type in ['step_completed', 'workflow_completed', 'approval_completed']: return 'green'
        if obj.notification_type in ['approval_needed', 'deadline_approaching']: return 'yellow'
        return 'blue'


class TimeEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    client_name = serializers.ReadOnlyField(source='client.name')
    task_title = serializers.ReadOnlyField(source='task.title', allow_null=True)
    category_name = serializers.ReadOnlyField(source='category.name', allow_null=True)
    workflow_step_name = serializers.ReadOnlyField(source='workflow_step.name', allow_null=True)
    
    class Meta:
        model = TimeEntry
        fields = ['id', 'user', 'user_name', 'client', 'client_name', 
                  'task', 'task_title', 'category', 'category_name', 
                  'workflow_step', 'workflow_step_name',
                  'description', 'minutes_spent', 'date', 'start_time', 
                  'end_time', 'created_at', 'original_text', 'task_status_after',
                  'advance_workflow', 'workflow_step_completed'] 
        read_only_fields = ['id', 'created_at', 'user']


class ExpenseSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name', allow_null=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.username', allow_null=True)
    
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

class TaskApprovalSerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='task.title')
    workflow_step_name = serializers.ReadOnlyField(source='workflow_step.name')
    approved_by_name = serializers.ReadOnlyField(source='approved_by.username', allow_null=True)
    
    class Meta:
        model = TaskApproval
        fields = ['id', 'task', 'task_title', 'workflow_step', 'workflow_step_name',
                  'approved_by', 'approved_by_name', 'approved_at', 'approved', 'comment']
        read_only_fields = ['id', 'approved_at', 'approved_by']
    
    def create(self, validated_data):
        validated_data['approved_by'] = self.context['request'].user
        return super().create(validated_data)

class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = [
            'email_notifications_enabled', 'push_notifications_enabled',
            'notify_step_ready', 'notify_step_completed', 'notify_approval_needed',
            'notify_approval_completed', 'notify_task_completed', 
            'notify_deadline_approaching', 'notify_step_overdue',
            'notify_workflow_assigned', 'notify_step_rejected', 'notify_manual_reminders',
            'notify_task_assigned_to_you',
            'notify_report_generated',
            'digest_frequency', 'digest_time', 'deadline_days_notice',
            'overdue_threshold_days', 'approval_reminder_days',
            'quiet_start_time', 'quiet_end_time'
        ]


class WorkflowNotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    task_title = serializers.ReadOnlyField(source='task.title')
    task_client_name = serializers.ReadOnlyField(source='task.client.name')
    workflow_step_name = serializers.ReadOnlyField(source='workflow_step.name', allow_null=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.username', allow_null=True)
    
    time_since_created = serializers.SerializerMethodField()
    is_urgent = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowNotification
        fields = [
            'id', 'user', 'user_name', 'task', 'task_title', 'task_client_name',
            'workflow_step', 'workflow_step_name', 'notification_type',
            'priority', 'title', 'message', 'is_read', 'is_archived',
            'email_sent', 'created_at', 'read_at', 'scheduled_for',
            'metadata', 'created_by', 'created_by_name',
            'time_since_created', 'is_urgent'
        ]
        read_only_fields = [
            'id', 'created_at', 'read_at', 'time_since_created', 'is_urgent'
        ]
    
    def get_time_since_created(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)

    def get_is_urgent(self, obj):
        urgent_types = ['deadline_approaching', 'step_overdue', 'approval_needed']
        return obj.priority in ['high', 'urgent'] or obj.notification_type in urgent_types


class WorkflowHistorySerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='task.title')
    from_step_name = serializers.ReadOnlyField(source='from_step.name', allow_null=True)
    to_step_name = serializers.ReadOnlyField(source='to_step.name', allow_null=True)
    changed_by_name = serializers.ReadOnlyField(source='changed_by.username', allow_null=True)
    
    class Meta:
        model = WorkflowHistory
        fields = ['id', 'task', 'task_title', 'from_step', 'from_step_name',
                  'to_step', 'to_step_name', 'changed_by', 'changed_by_name',
                  'action', 'comment', 'time_spent_minutes', 'created_at']
        read_only_fields = ['id', 'created_at']

class NotificationTemplateSerializer(serializers.ModelSerializer):
    organization_name = serializers.ReadOnlyField(source='organization.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username', allow_null=True)
    notification_type_display = serializers.ReadOnlyField(source='get_notification_type_display')
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'organization', 'organization_name', 'notification_type', 
            'notification_type_display', 'name', 'title_template', 
            'message_template', 'default_priority', 'is_active', 'is_default',
            'available_variables', 'created_by', 'created_by_name', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        if data.get('is_default'):
            existing_default = NotificationTemplate.objects.filter(
                organization=data['organization'],
                notification_type=data['notification_type'],
                is_default=True
            )
            if self.instance:
                existing_default = existing_default.exclude(id=self.instance.id)
            if existing_default.exists():
                raise serializers.ValidationError("Já existe um template padrão para este tipo de notificação")
        return data


class NotificationDigestSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    notifications_count = serializers.IntegerField(source='notifications.count', read_only=True)
    
    class Meta:
        model = NotificationDigest
        fields = [
            'id', 'user', 'user_name', 'digest_type', 'period_start', 
            'period_end', 'notifications_count', 'is_sent', 'sent_at',
            'title', 'content', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FiscalSystemSettingsSerializer(serializers.ModelSerializer):
    organization_name = serializers.ReadOnlyField(source='organization.name')
    notification_recipients_count = serializers.SerializerMethodField()
    last_generation_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = FiscalSystemSettings
        fields = [
            'id', 'organization', 'organization_name',
            'auto_generation_enabled', 'generation_time', 'months_ahead_generation',
            'auto_cleanup_enabled', 'cleanup_days_threshold',
            'notify_on_generation', 'notify_on_errors', 'email_notifications_enabled',
            'notification_recipients', 'notification_recipients_count',
            'webhook_url', 'webhook_secret', 'advanced_settings',
            'created_at', 'updated_at', 'last_generation', 'last_generation_formatted'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at', 'last_generation']
        extra_kwargs = { 'webhook_secret': {'write_only': True} }
    
    def get_notification_recipients_count(self, obj):
        return len(obj.get_notification_recipients())
    
    def get_last_generation_formatted(self, obj):
        if obj.last_generation:
            return obj.last_generation.strftime('%d/%m/%Y às %H:%M')
        return 'Nunca executada'
    
    def validate_notification_recipients(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("notification_recipients deve ser uma lista")
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        for email in value:
            if not re.match(email_pattern, email):
                raise serializers.ValidationError(f"Email inválido: {email}")
        return value
    
    def validate_months_ahead_generation(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Meses futuros deve estar entre 1 e 12")
        return value
    
    def validate_cleanup_days_threshold(self, value):
        if not 1 <= value <= 365:
            raise serializers.ValidationError("Dias para limpeza deve estar entre 1 e 365")
        return value
    
class FiscalObligationTestSerializer(serializers.Serializer):
    client_id = serializers.UUIDField(required=True)
    year = serializers.IntegerField(required=False, default=timezone.now().year)
    month = serializers.IntegerField(required=False, default=timezone.now().month)
    
    def validate_year(self, value):
        current_year = timezone.now().year
        if not (current_year - 1) <= value <= (current_year + 5):
            raise serializers.ValidationError("Ano deve estar entre o ano passado e 5 anos no futuro")
        return value
    
    def validate_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Mês deve estar entre 1 e 12")
        return value
    
class FiscalGenerationRequestSerializer(serializers.Serializer):
    months_ahead = serializers.IntegerField(default=3, min_value=1, max_value=12)
    clean_old = serializers.BooleanField(default=False)
    days_old = serializers.IntegerField(default=30, min_value=1, max_value=365)
    
    def validate(self, data):
        if data['clean_old'] and data['days_old'] < 7:
            raise serializers.ValidationError("Para limpeza automática, mínimo de 7 dias")
        return data


class FiscalStatsSerializer(serializers.Serializer):
    total_generated = serializers.IntegerField()
    pending = serializers.IntegerField()
    completed = serializers.IntegerField()
    overdue = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    organization = serializers.CharField()
    by_definition = serializers.DictField()
    by_month = serializers.DictField()
    organization_info = serializers.DictField(required=False)