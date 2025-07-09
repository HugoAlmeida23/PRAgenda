# api/services/notification_template_service.py
import logging
from typing import Optional

from django.utils import timezone
from datetime import datetime

from ..models import NotificationTemplate, Task, User, WorkflowStep, GeneratedReport, Organization

logger = logging.getLogger(__name__)

class NotificationTemplateService:
    """
    Serviço para gestão e renderização de templates de notificação.
    """

    @staticmethod
    def get_template(organization: Optional[Organization], notification_type: str) -> 'Template':
        """
        Obtém o template de notificação apropriado.
        Busca primeiro um template customizado e ativo para a organização.
        Se não encontrar, retorna um template padrão do sistema.
        """
        template = None
        if organization:
            # Tenta encontrar um template customizado que seja o padrão para este tipo
            template = NotificationTemplate.objects.filter(
                organization=organization,
                notification_type=notification_type,
                is_active=True,
                is_default=True
            ).first()
        
            # Se não houver padrão, pega o mais recente ativo
            if not template:
                template = NotificationTemplate.objects.filter(
                    organization=organization,
                    notification_type=notification_type,
                    is_active=True
                ).order_by('-updated_at').first()
        
        # Se ainda não encontrou template (sem organização ou sem customização), usa o padrão do sistema
        if not template:
            template = NotificationTemplateService._get_system_default_template(notification_type)
        
        return template

    @staticmethod
    def _get_system_default_template(notification_type: str) -> 'Template':
        """
        Retorna um objeto de template padrão do sistema para um tipo de notificação.
        Isso serve como fallback se nenhum template customizado for encontrado.
        """
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
                'message_template': 'A tarefa "{task_title}" completou o passo "{completed_step_name}" e tem múltiplos caminhos possíveis: {next_steps_names_list}. É necessário escolher manually o próximo passo.',
                'default_priority': 'high'
            },
            'deadline_approaching': {
                'title_template': 'Prazo próximo ({days_remaining_text}): {task_title}',
                'message_template': 'A tarefa "{task_title}" (Cliente: {client_name}) vence {days_remaining_text} ({deadline_date}).\n\nPasso atual: {step_name}\nPor favor, verifique os detalhes.',
                'default_priority': 'high'
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
            'manual_reminder': {
                'title_template': 'Lembrete: {manual_title}',
                'message_template': 'Olá {user_first_name},\n\nEste é um lembrete sobre: {manual_message}\n\nRelacionado à tarefa: "{task_title}" (Cliente: {client_name})\n\nCriado por: {changed_by_name}\nData: {current_date}',
                'default_priority': 'normal'
            },
            'task_assigned_to_you': {
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
            'report_generated': {
                'title_template': '📊 Relatório Gerado: {report_name}',
                'message_template': (
                    'Olá {user_first_name},\n\n'
                    'O relatório "{report_name}" ({report_type_display}) foi gerado com sucesso por {changed_by_name}.\n'
                    'Formato: {report_format_display}\n'
                    'Pode aceder ao relatório na Central de Relatórios}'
                ),
                'default_priority': 'low'
            }
        }
        
        template_data = default_templates.get(notification_type)
        if not template_data:
            logger.warning(f"Nenhum template padrão do sistema definido para o tipo: {notification_type}. Usando fallback genérico.")
            template_data = {
                'title_template': 'Notificação do Sistema: {task_title}',
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
            safe_context = context_vars.copy()
            expected_keys = [
                'user_first_name', 'task_title', 'client_name', 'step_name', 'workflow_name',
                'organization_name', 'current_date', 'current_time', 'changed_by_name',
                'deadline_date', 'priority_label', 'fallback_message', 'reminder_prefix',
                'comment', 'approval_status', 'approval_status_text', 'approver_name',
                'approval_comment', 'completed_step_name', 'next_steps_names_list',
                'days_remaining_text', 'days_overdue_text', 'step_assignee_name',
                'manual_title', 'manual_message', 'report_name', 'report_type_display',
                'report_format_display', 'report_file_size_kb', 'report_download_url'
            ]
            for key in expected_keys:
                if key not in safe_context:
                    safe_context[key] = f"{{Informação em falta: {key}}}"
            
            try:
                final_title = template.title_template.format_map(safe_context)
                final_message = template.message_template.format_map(safe_context)
                return final_title, final_message
            except KeyError as e:
                logger.error(f"Erro de chave ausente ao renderizar template padrão '{template.notification_type}': {e}. Contexto: {safe_context}")
                final_title = template.title_template.format_map(safe_context)
                final_message = template.message_template.format_map(safe_context)
                return final_title, final_message

        template.render = render_template
        return template
    
    @staticmethod
    def get_rendered_notification_content(
        user_target: User,
        notification_type: str,
        task: Optional[Task] = None,
        workflow_step: Optional[WorkflowStep] = None,
        created_by: Optional[User] = None,
        extra_context: Optional[dict] = None,
        priority_override: Optional[str] = None,
        report: Optional[GeneratedReport] = None,
        **kwargs
    ):
        """
        Prepara e renderiza o conteúdo para uma notificação.

        Returns:
            dict: Um dicionário contendo 'title', 'message', 'priority', e 'context'.
        """
        organization = None
        if report and hasattr(report, 'organization'):
            organization = report.organization
        elif task and hasattr(task, 'client') and hasattr(task.client, 'organization'):
            organization = task.client.organization
        elif hasattr(user_target, 'profile') and hasattr(user_target.profile, 'organization'):
            organization = user_target.profile.organization

        template = NotificationTemplateService.get_template(organization, notification_type)
        
        context = NotificationTemplate.get_context_variables(
            task=task, user=user_target, workflow_step=workflow_step
        )

        if created_by:
            context['changed_by_name'] = created_by.get_full_name() or created_by.username
        else:
            context['changed_by_name'] = "Sistema TarefAI"

        if report:
            context['report_name'] = report.name
            context['report_type_display'] = report.get_report_type_display()
            context['report_format_display'] = report.get_report_format_display()
            context['report_file_size_kb'] = report.file_size_kb or "N/A"
            context['report_download_url'] = report.storage_url or "Link não disponível"

        if extra_context:
            context.update(extra_context)

        title, message = template.render(context)
        
        priority_to_use = priority_override or template.default_priority or kwargs.get('priority', 'normal')

        return {
            "title": title,
            "message": message,
            "priority": priority_to_use,
            "context": context,
        }