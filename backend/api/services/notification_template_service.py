# services/notification_template_service.py
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime # Keep this
from ..models import WorkflowNotification, Task, WorkflowHistory, TaskApproval, Profile, NotificationTemplate, User, GeneratedReport # Added User
from .notification_service import NotificationService # Circular import potential, let's be careful
import csv # Not used here
import json # Not used here
from io import StringIO # Not used here
import logging
from typing import Optional



logger = logging.getLogger(__name__)

class NotificationTemplateService:
    """
    Serviço para gestão de templates de notificação
    """

    @staticmethod
    def _get_system_default_template(notification_type):
        # Define more comprehensive default templates
        default_templates = {
            # ... (outros templates existentes) ...
            'task_assigned_to_you': { # NOVO TEMPLATE
                'title_template': '🚀 Nova Tarefa: {task_title}',
                'message_template': (
                    'Olá {user_first_name},\n\n'
                    'Você foi atribuído(a) à tarefa "{task_title}" para o cliente "{client_name}".\n'
                    'Criada por: {changed_by_name}.\n\n'
                    'Prazo: {deadline_date}\n'
                    'Prioridade: {priority_label}\n\n'
                    'Por favor, verifique os detalhes da tarefa.'
                ),
                'default_priority': 'normal'
            },
        }
        # ... (resto da lógica para obter e renderizar template) ...
        # Adicionar as novas variáveis ao contexto se necessário
        # Exemplo, ao criar o context em NotificationTemplate.get_context_variables:
        # if task:
        #     context['deadline_date'] = task.deadline.strftime('%d/%m/%Y') if task.deadline else "Não definido"
        #     context['priority_label'] = task.get_priority_display() # Supondo que tem este método no modelo Task

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
        template.notification_type = notification_type
        template.title_template = template_data['title_template']
        template.message_template = template_data['message_template']
        template.default_priority = template_data['default_priority']
        
        def render_template(context_vars):
            safe_context = context_vars.copy() # Create a mutable copy
            
            # Define default values for keys that might be missing
            expected_keys = [
                            'user_first_name', 'task_title', 'client_name', 'step_name', 
                            'workflow_name', 'organization_name', 'current_date', 'current_time',
                            'changed_by_name', 'deadline_date', 'priority_label', 'fallback_message',
                            'reminder_prefix', 'comment', 'approval_status', 'approval_status_text',
                            'approver_name', 'approval_comment', 'completed_step_name', 'next_steps_names_list',
                            'days_remaining_text', 'days_overdue_text', 'step_assignee_name',
                            'manual_title', 'manual_message', 
                            'report_name', 'report_type_display', 'report_format_display', 
                            'report_file_size_kb', 'report_download_url' # New for reports
                        ]            
            for key in expected_keys:
                if key not in safe_context:
                    safe_context[key] = f"{{Informação em falta: {key}}}" # Placeholder
            
            try:
                final_title = template.title_template.format_map(safe_context)
                final_message = template.message_template.format_map(safe_context)
                return final_title, final_message
            except KeyError as e:
                logger.error(f"Variável ausente ao renderizar template padrão do sistema para '{template.notification_type}': {e}. Contexto: {safe_context}")
                # Fallback rendering with missing keys indicated
                final_title = template.title_template.format_map(safe_context) # Use format_map for safety
                final_message = template.message_template.format_map(safe_context)
                return final_title, final_message

        template.render = render_template
        return template
    
    
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
            },
            'report_generated': { # NEW DEFAULT TEMPLATE
                'title_template': '📊 Relatório Gerado: {report_name}',
                'message_template': (
                    'Olá {user_first_name},\n\n'
                    'O relatório "{report_name}" ({report_type_display}) foi gerado com sucesso por {changed_by_name}.\n'
                    'Formato: {report_format_display}\n'
                    'Tamanho: {report_file_size_kb} KB\n\n'
                    'Pode aceder ao relatório na Central de Relatórios ou através do link (se disponível): {report_download_url}'
                ),
                'default_priority': 'low' # Reports are usually less urgent than task notifications
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
        user_target: User,
        notification_type: str, 
        task: Optional[Task] = None,  # Task is now optional
        workflow_step: Optional['WorkflowStep'] = None,
        created_by: Optional[User] = None, 
        extra_context: Optional[dict] = None, 
        priority_override: Optional[str] = None,
        report: Optional[GeneratedReport] = None, # NEW: Pass the report object
        **kwargs 
    ):
        from .notification_service import NotificationService 

        organization = None
        if report and report.organization:
            organization = report.organization
        elif task and task.client and task.client.organization:
            organization = task.client.organization
        elif hasattr(user_target, 'profile') and user_target.profile and user_target.profile.organization:
            organization = user_target.profile.organization
        
        if not organization:
            logger.debug(f"Não foi possível determinar organização para notificação ({notification_type}) para {user_target.username}. Usando template padrão do sistema.")
        
        template = NotificationTemplateService.get_template(organization, notification_type)
        
        # Use the more robust get_context_variables from NotificationTemplate model
        context = NotificationTemplate.get_context_variables(
            task=task, user=user_target, workflow_step=workflow_step
        )

        if created_by:
            context['changed_by_name'] = created_by.get_full_name() or created_by.username
        else:
            context['changed_by_name'] = "Sistema" # Or "TarefAI" or similar

        # Add report-specific context if a report is provided
        if report:
            context['report_name'] = report.name
            context['report_type_display'] = report.get_report_type_display()
            context['report_format_display'] = report.get_report_format_display()
            context['report_file_size_kb'] = report.file_size_kb or "N/A"
            context['report_download_url'] = report.storage_url or "Link não disponível"
            # If the notification is for a report, metadata should include report_id
            if 'metadata' not in kwargs or not isinstance(kwargs['metadata'], dict):
                kwargs['metadata'] = {}
            kwargs['metadata']['report_id'] = str(report.id)


        if extra_context:
            context.update(extra_context)
        
        title, message = template.render(context)
        
        priority_to_use = priority_override or template.default_priority or kwargs.get('priority', 'normal')
        
        # For report_generated, task and workflow_step will be None
        task_for_notification = task if notification_type != 'report_generated' else None
        step_for_notification = workflow_step if notification_type != 'report_generated' else None

        return NotificationService.create_notification( 
            user=user_target,
            task=task_for_notification, 
            workflow_step=step_for_notification,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority_to_use,
            created_by=created_by,
            metadata=kwargs.get('metadata', context),
            scheduled_for=kwargs.get('scheduled_for'),
            check_existing_recent=kwargs.get('check_existing_recent', False),
            recent_threshold_hours=kwargs.get('recent_threshold_hours', 24)
        )