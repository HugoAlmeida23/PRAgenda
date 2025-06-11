"""
Serviço específico para notificações do sistema fiscal.
"""

import logging
import requests
import hashlib
import hmac
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from ..models import FiscalSystemSettings

logger = logging.getLogger(__name__)


class FiscalNotificationService:
    """
    Serviço para envio de notificações específicas do sistema fiscal.
    """
    
    @classmethod
    def notify_generation_completed(cls, organization, stats):
        """
        Notifica sobre conclusão da geração de obrigações.
        
        Args:
            organization: Organização
            stats: Estatísticas da geração
        """
        try:
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            
            if not fiscal_settings.notify_on_generation:
                return
            
            # Preparar dados da notificação
            notification_data = {
                'type': 'generation_completed',
                'organization': organization.name,
                'stats': stats,
                'timestamp': timezone.now().isoformat(),
                'success': stats.get('tasks_created', 0) > 0 or len(stats.get('errors', [])) == 0
            }
            
            # Enviar email se habilitado
            if fiscal_settings.email_notifications_enabled:
                cls._send_generation_email(fiscal_settings, notification_data)
            
            # Enviar webhook se configurado
            if fiscal_settings.webhook_url:
                cls._send_webhook(fiscal_settings, notification_data)
                
        except Exception as e:
            logger.error(f"Erro ao notificar geração concluída para {organization.name}: {e}")
    
    @classmethod
    def notify_generation_error(cls, organization, error_details):
        """
        Notifica sobre erros na geração de obrigações.
        """
        try:
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            
            if not fiscal_settings.notify_on_errors:
                return
            
            notification_data = {
                'type': 'generation_error',
                'organization': organization.name,
                'error_details': error_details,
                'timestamp': timezone.now().isoformat(),
                'success': False
            }
            
            # Sempre enviar email para erros (se email habilitado)
            if fiscal_settings.email_notifications_enabled:
                cls._send_error_email(fiscal_settings, notification_data)
            
            # Webhook para erros
            if fiscal_settings.webhook_url:
                cls._send_webhook(fiscal_settings, notification_data)
                
        except Exception as e:
            logger.error(f"Erro ao notificar erro de geração para {organization.name}: {e}")
    
    @classmethod
    def notify_deadlines_approaching(cls, organization, tasks_with_deadlines):
        """
        Notifica sobre prazos que se aproximam.
        """
        try:
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            
            notification_data = {
                'type': 'deadlines_approaching',
                'organization': organization.name,
                'tasks_count': len(tasks_with_deadlines),
                'tasks': [
                    {
                        'title': task.title,
                        'client': task.client.name,
                        'deadline': task.deadline.isoformat(),
                        'days_remaining': (task.deadline - timezone.now().date()).days
                    }
                    for task in tasks_with_deadlines[:10]  # Limitar a 10 para email
                ],
                'timestamp': timezone.now().isoformat()
            }
            
            if fiscal_settings.email_notifications_enabled:
                cls._send_deadlines_email(fiscal_settings, notification_data)
            
            if fiscal_settings.webhook_url:
                cls._send_webhook(fiscal_settings, notification_data)
                
        except Exception as e:
            logger.error(f"Erro ao notificar prazos para {organization.name}: {e}")
    
    @classmethod
    def _send_generation_email(cls, fiscal_settings, data):
        """Envia email sobre geração concluída."""
        try:
            stats = data['stats']
            subject = f"[{fiscal_settings.organization.name}] Geração de Obrigações Fiscais Concluída"
            
            # Determinar se foi sucesso ou teve problemas
            has_errors = len(stats.get('errors', [])) > 0
            tasks_created = stats.get('tasks_created', 0)
            
            if has_errors:
                subject = f"[{fiscal_settings.organization.name}] Geração de Obrigações - Com Erros"
            
            # Renderizar template de email
            html_content = render_to_string('fiscal/emails/generation_completed.html', {
                'organization': fiscal_settings.organization.name,
                'stats': stats,
                'has_errors': has_errors,
                'success': not has_errors and tasks_created > 0
            })
            
            text_content = f"""
            Geração de Obrigações Fiscais - {fiscal_settings.organization.name}
            
            Tarefas criadas: {tasks_created}
            Tarefas ignoradas: {stats.get('tasks_skipped', 0)}
            Erros: {len(stats.get('errors', []))}
            
            {'Status: Concluída com sucesso' if not has_errors else 'Status: Concluída com erros'}
            
            Data: {data['timestamp']}
            """
            
            send_mail(
                subject=subject,
                message=text_content,
                html_message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=fiscal_settings.get_notification_recipients(),
                fail_silently=False
            )
            
        except Exception as e:
            logger.error(f"Erro ao enviar email de geração: {e}")
    
    @classmethod
    def _send_error_email(cls, fiscal_settings, data):
        """Envia email sobre erro na geração."""
        try:
            subject = f"[ERRO] [{fiscal_settings.organization.name}] Falha na Geração de Obrigações Fiscais"
            
            html_content = render_to_string('fiscal/emails/generation_error.html', {
                'organization': fiscal_settings.organization.name,
                'error_details': data['error_details'],
                'timestamp': data['timestamp']
            })
            
            text_content = f"""
            ERRO na Geração de Obrigações Fiscais
            Organização: {fiscal_settings.organization.name}
            
            Detalhes do erro:
            {data['error_details']}
            
            Data: {data['timestamp']}
            
            Por favor, verifique o sistema e tente novamente.
            """
            
            send_mail(
                subject=subject,
                message=text_content,
                html_message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=fiscal_settings.get_notification_recipients(),
                fail_silently=False
            )
            
        except Exception as e:
            logger.error(f"Erro ao enviar email de erro: {e}")
    
    @classmethod
    def _send_deadlines_email(cls, fiscal_settings, data):
        """Envia email sobre prazos próximos."""
        try:
            tasks_count = data['tasks_count']
            subject = f"[{fiscal_settings.organization.name}] {tasks_count} Obrigações com Prazo Próximo"
            
            html_content = render_to_string('fiscal/emails/deadlines_approaching.html', {
                'organization': fiscal_settings.organization.name,
                'tasks_count': tasks_count,
                'tasks': data['tasks'],
                'timestamp': data['timestamp']
            })
            
            text_content = f"""
            Prazos de Obrigações Fiscais se Aproximando
            Organização: {fiscal_settings.organization.name}
            
            {tasks_count} obrigações com prazo próximo:
            
            """
            
            for task in data['tasks']:
                text_content += f"- {task['title']} ({task['client']}) - Prazo: {task['deadline']} ({task['days_remaining']} dias)\n"
            
            text_content += f"\nData: {data['timestamp']}"
            
            send_mail(
                subject=subject,
                message=text_content,
                html_message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=fiscal_settings.get_notification_recipients(),
                fail_silently=False
            )
            
        except Exception as e:
            logger.error(f"Erro ao enviar email de prazos: {e}")
    
    @classmethod
    def _send_webhook(cls, fiscal_settings, data):
        """Envia notificação via webhook."""
        try:
            if not fiscal_settings.webhook_url:
                return
            
            # Preparar payload
            payload = {
                'event': data['type'],
                'organization': data['organization'],
                'data': data,
                'timestamp': data['timestamp']
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'FiscalSystem/1.0'
            }
            
            # Adicionar assinatura HMAC se segredo configurado
            if fiscal_settings.webhook_secret:
                import json
                payload_json = json.dumps(payload, sort_keys=True)
                signature = hmac.new(
                    fiscal_settings.webhook_secret.encode('utf-8'),
                    payload_json.encode('utf-8'),
                    hashlib.sha256
                ).hexdigest()
                headers['X-Fiscal-Signature'] = f'sha256={signature}'
            
            # Enviar webhook
            response = requests.post(
                fiscal_settings.webhook_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code >= 400:
                logger.warning(f"Webhook retornou status {response.status_code}: {response.text}")
            else:
                logger.info(f"Webhook enviado com sucesso para {fiscal_settings.organization.name}")
                
        except Exception as e:
            logger.error(f"Erro ao enviar webhook: {e}")