from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from ..models import WorkflowNotification, Task, WorkflowHistory, TaskApproval, Profile, NotificationTemplate
from .notification_service import NotificationService
import csv
import json
from io import StringIO
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
        # Buscar template padrão da organização
        template = NotificationTemplate.objects.filter(
            organization=organization,
            notification_type=notification_type,
            is_active=True,
            is_default=True
        ).first()
        
        if not template:
            # Buscar qualquer template ativo do tipo
            template = NotificationTemplate.objects.filter(
                organization=organization,
                notification_type=notification_type,
                is_active=True
            ).first()
        
        if not template:
            # Usar template padrão do sistema
            template = NotificationTemplateService._get_system_default_template(notification_type)
        
        return template
    
    @staticmethod
    def _get_system_default_template(notification_type):
        """
        Templates padrão do sistema quando não há customização
        """
        default_templates = {
            'step_ready': {
                'title_template': 'Passo pronto: {step_name}',
                'message_template': 'A tarefa "{task_title}" chegou ao passo "{step_name}" e está pronta para ser trabalhada.',
                'default_priority': 'normal'
            },
            'step_completed': {
                'title_template': 'Passo concluído: {step_name}',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" foi concluído.',
                'default_priority': 'normal'
            },
            'approval_needed': {
                'title_template': 'Aprovação necessária: {step_name}',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" precisa de sua aprovação.',
                'default_priority': 'high'
            },
            'deadline_approaching': {
                'title_template': 'Prazo próximo: {task_title}',
                'message_template': 'A tarefa "{task_title}" tem prazo próximo. Verifique os detalhes.',
                'default_priority': 'high'
            },
            'step_overdue': {
                'title_template': 'Passo atrasado: {step_name}',
                'message_template': 'O passo "{step_name}" da tarefa "{task_title}" está atrasado.',
                'default_priority': 'urgent'
            },
            'workflow_completed': {
                'title_template': 'Workflow concluído: {task_title}',
                'message_template': 'O workflow da tarefa "{task_title}" foi concluído com sucesso.',
                'default_priority': 'normal'
            },
        }
        
        template_data = default_templates.get(notification_type, {
            'title_template': 'Notificação',
            'message_template': 'Você tem uma nova notificação.',
            'default_priority': 'normal'
        })
        
        # Criar objeto template temporário (não salvo no BD)
        from types import SimpleNamespace
        template = SimpleNamespace()
        template.title_template = template_data['title_template']
        template.message_template = template_data['message_template']
        template.default_priority = template_data['default_priority']
        template.render = lambda context: (
            template.title_template.format(**context),
            template.message_template.format(**context)
        )
        template.get_context_variables = NotificationTemplate.get_context_variables.__func__
        
        return template
    
    @staticmethod
    def create_notification_with_template(
        user, task, notification_type, workflow_step=None, 
        created_by=None, extra_context=None, **kwargs
    ):
        """
        Cria notificação usando template
        """
        # Determinar organização
        organization = None
        if hasattr(user, 'profile') and user.profile.organization:
            organization = user.profile.organization
        elif task and task.client and task.client.organization:
            organization = task.client.organization
        
        if not organization:
            logger.warning(f"Não foi possível determinar organização para notificação de {user.username}")
            return None
        
        # Obter template
        template = NotificationTemplateService.get_template(organization, notification_type)
        
        # Gerar contexto
        context = template.get_context_variables(
            template, task=task, user=user, workflow_step=workflow_step
        )
        
        if extra_context:
            context.update(extra_context)
        
        # Renderizar template
        title, message = template.render(context)
        
        # Usar prioridade do template ou fornecida
        priority = kwargs.get('priority', template.default_priority)
        
        # Criar notificação
        return NotificationService.create_notification(
            user=user,
            task=task,
            workflow_step=workflow_step,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            created_by=created_by,
            **kwargs
        )
