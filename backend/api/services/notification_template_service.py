# services/notification_template_service.py
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime # Keep this
from ..models import WorkflowNotification, Task, WorkflowHistory, TaskApproval, Profile, NotificationTemplate, User # Added User
from .notification_service import NotificationService # Circular import potential, let's be careful
import csv # Not used here
import json # Not used here
from io import StringIO # Not used here
import logging

logger = logging.getLogger(__name__)

class NotificationTemplateService:
    """
    Serviço para gestão de templates de notificação
    """
    
    @staticmethod
    def get_template(organization, notification_type):
        """
        Obtém o template ativo para um tipo de notificação
        """
        template = None
        if organization: # Only query for organization if it exists
            template = NotificationTemplate.objects.filter(
                organization=organization,
                notification_type=notification_type,
                is_active=True,
                is_default=True
            ).first()
        
            if not template:
                template = NotificationTemplate.objects.filter(
                    organization=organization,
                    notification_type=notification_type,
                    is_active=True
                ).order_by('-updated_at').first() # Get the most recently updated if multiple non-defaults
        
        if not template:
            # Usar template padrão do sistema
            template = NotificationTemplateService._get_system_default_template(notification_type)
        
        return template
    
    @staticmethod
    def _get_system_default_template(notification_type):
        """
        Templates padrão do sistema quando não há customização
        """
        # Define more comprehensive default templates
        default_templates = {
            'step_ready': {
                'title_template': 'Passo pronto: {step_name} para {task_title}',
                'message_template': 'Olá {user_first_name},\n\nA tarefa "{task_title}" (Cliente: {client_name}) chegou ao passo "{step_name}" e está pronta para ser trabalhada por si.\n\nWorkflow: {workflow_name}\nData: {current_date}',
                'default_priority': 'normal'
            },
            'step_completed': {
                'title_template': 'Passo concluído: {step_name} (Tarefa: {task_title})',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) foi concluído por {changed_by_name}.\n\nData: {current_date}',
                'default_priority': 'normal'
            },
            'approval_needed': {
                'title_template': '{reminder_prefix}Aprovação necessária: {step_name} (Tarefa: {task_title})',
                'message_template': 'Caro {user_first_name},\n\nO passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) precisa da sua aprovação.\n\n{comment}\nData: {current_date} às {current_time}',
                'default_priority': 'high'
            },
            'approval_completed': {
                'title_template': 'Aprovação Concluída: {step_name} ({approval_status})',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) foi {approval_status_text} por {approver_name}.\n\nComentário: {approval_comment}\nData: {current_date}',
                'default_priority': 'normal'
            },
            'manual_advance_needed': {
                'title_template': 'Escolha o próximo passo: {task_title}',
                'message_template': 'A tarefa "{task_title}" completou o passo "{completed_step_name}" e tem múltiplos caminhos possíveis: {next_steps_names_list}. É necessário escolher manualmente o próximo passo.',
                'default_priority': 'high'
            },
            'deadline_approaching': {
                'title_template': 'Prazo próximo ({days_remaining_text}): {task_title}',
                'message_template': 'A tarefa "{task_title}" (Cliente: {client_name}) vence {days_remaining_text} ({deadline_date}).\n\nPasso atual: {step_name}\nPor favor, verifique os detalhes.',
                'default_priority': 'high' # Will be overridden by NotificationService based on days_remaining
            },
            'task_completed': { 
                'title_template': '✅ Tarefa Concluída: {task_title}',
                'message_template': 'A tarefa "{task_title}" (Cliente: {client_name}) foi marcada como concluída por {changed_by_name}.',
                 'default_priority': 'normal'
            },
            'step_overdue': {
                'title_template': 'Passo atrasado: {step_name} (Tarefa: {task_title})',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) está {days_overdue_text} atrasado.\n\nResponsável pelo passo: {step_assignee_name}\nPrazo da tarefa: {deadline_date}',
                'default_priority': 'urgent'
            },
            'workflow_assigned': {
                'title_template': 'Novo Workflow Atribuído: {task_title}',
                'message_template': 'O workflow "{workflow_name}" foi atribuído à tarefa "{task_title}" (Cliente: {client_name}) por {changed_by_name}.\n{first_step_message}Verifique a tarefa.',
                'default_priority': 'normal'
            },
            'step_rejected': {
                'title_template': 'Passo Rejeitado: {step_name} (Tarefa: {task_title})',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) foi REJEITADO por {changed_by_name}.\n\nComentário: {comment}\nData: {current_date}',
                'default_priority': 'high'
            },
            'manual_reminder': { # Generic manual reminder
                'title_template': 'Lembrete: {manual_title}',
                'message_template': 'Olá {user_first_name},\n\nEste é um lembrete sobre: {manual_message}\n\nRelacionado à tarefa: "{task_title}" (Cliente: {client_name})\n\nCriado por: {changed_by_name}\nData: {current_date}',
                'default_priority': 'normal'
            }
        }
        
        template_data = default_templates.get(notification_type)
        
        if not template_data:
            logger.warning(f"Nenhum template padrão do sistema definido para o tipo: {notification_type}. Usando fallback genérico.")
            template_data = {
                'title_template': 'Notificação: {task_title}',
                'message_template': 'Você tem uma nova notificação para a tarefa "{task_title}". Detalhes: {fallback_message}',
                'default_priority': 'normal'
            }
        
        from types import SimpleNamespace
        template = SimpleNamespace()
        template.notification_type = notification_type # Store the type
        template.title_template = template_data['title_template']
        template.message_template = template_data['message_template']
        template.default_priority = template_data['default_priority']
        
        def render_template(context_vars):
            try:
                final_title = template.title_template.format(**context_vars)
                final_message = template.message_template.format(**context_vars)
                return final_title, final_message
            except KeyError as e:
                logger.error(f"Variável ausente ao renderizar template padrão do sistema para '{template.notification_type}': {e}. Contexto: {context_vars}")
                # Fallback rendering with missing keys indicated
                safe_context = {k: context_vars.get(k, f"{{MISSING: {k}}}") for k in template.title_template.replace('{','').replace('}','').split() + template.message_template.replace('{','').replace('}','').split() if '{' in k or '}' in k} # very basic extraction
                final_title = template.title_template.format_map(safe_context)
                final_message = template.message_template.format_map(safe_context)
                return final_title, final_message

        template.render = render_template
        
        return template
    
    @staticmethod
    def create_notification_with_template(
        user_target: User, # Renamed for clarity
        task: Task, 
        notification_type: str, 
        workflow_step: 'WorkflowStep' = None, # Forward reference if WorkflowStep is in models
        created_by: User = None, 
        extra_context: dict = None, 
        priority_override: str = None, # Added priority override
        **kwargs # For other NotificationService.create_notification params like scheduled_for, check_existing_recent
    ):
        """
        Cria notificação usando template.
        Moved from NotificationService to here to avoid circular dependency.
        """
        from .notification_service import NotificationService # Import locally to break cycle

        # Determinar organização
        organization = None
        # Prioritize task's organization, then user's profile organization
        if task and task.client and task.client.organization:
            organization = task.client.organization
        elif hasattr(user_target, 'profile') and user_target.profile and user_target.profile.organization:
            organization = user_target.profile.organization
        
        # If still no organization, it could be a system notification or user without org.
        # In this case, only system default templates will be used by get_template.
        if not organization:
            logger.debug(f"Não foi possível determinar organização para notificação para {user_target.username}, tipo {notification_type}. Usando template padrão do sistema.")
        
        # Obter template
        template = NotificationTemplateService.get_template(organization, notification_type)
        
        context = NotificationTemplate.get_context_variables(task=task, user=user_target, workflow_step=workflow_step)

        if created_by:
            context['changed_by_name'] = created_by.get_full_name() or created_by.username
        else:
            context['changed_by_name'] = "Sistema"

        if extra_context:
            context.update(extra_context)
        
        # Renderizar template
        title, message = template.render(context)
        
        # Usar prioridade do override, then template, then kwargs, then default 'normal'
        priority_to_use = priority_override or template.default_priority or kwargs.get('priority', 'normal')
        
        # Create notification using the main NotificationService method
        # This might seem recursive, but it's calling the core creation logic.
        return NotificationService.create_notification( # Call the original create_notification
            user=user_target,
            task=task,
            workflow_step=workflow_step,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority_to_use, # Use the determined priority
            created_by=created_by,
            metadata=kwargs.get('metadata', context), # Pass full context as metadata
            scheduled_for=kwargs.get('scheduled_for'),
            check_existing_recent=kwargs.get('check_existing_recent', False),
            recent_threshold_hours=kwargs.get('recent_threshold_hours', 24)
        )