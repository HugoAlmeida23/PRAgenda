from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from ..models import WorkflowNotification, Task, WorkflowHistory, TaskApproval, Profile
import csv
import json
from io import StringIO
import logging

logger = logging.getLogger(__name__)

class NotificationEscalationService:
    """
    Sistema de escalação automática de notificações
    """
    
    @staticmethod
    def check_and_escalate_overdue_notifications():
        """
        Verifica e escala notificações que não foram atendidas
        """
        now = timezone.now()
        escalation_rules = [
            {'hours': 24, 'escalate_to': 'supervisor'},
            {'hours': 48, 'escalate_to': 'manager'},
            {'hours': 72, 'escalate_to': 'admin'}
        ]
        
        escalated_count = 0
        
        for rule in escalation_rules:
            cutoff_time = now - timedelta(hours=rule['hours'])
            
            # Notificações urgentes não lidas
            overdue_notifications = WorkflowNotification.objects.filter(
                priority='urgent',
                is_read=False,
                created_at__lte=cutoff_time,
                metadata__escalated_to__isnull=True  # Ainda não foi escalada
            )
            
            for notification in overdue_notifications:
                escalated = NotificationEscalationService._escalate_notification(
                    notification, rule['escalate_to']
                )
                if escalated:
                    escalated_count += 1
        
        return escalated_count
    
    @staticmethod
    def _escalate_notification(notification, escalate_to):
        """
        Escala uma notificação específica
        """
        try:
            # Determinar para quem escalar
            escalation_user = NotificationEscalationService._find_escalation_target(
                notification.user, escalate_to
            )
            
            if not escalation_user:
                logger.warning(f"Não foi possível encontrar alvo de escalação '{escalate_to}' para usuário {notification.user.username}")
                return False
            
            # Criar nova notificação escalada
            escalated_notification = WorkflowNotification.objects.create(
                user=escalation_user,
                task=notification.task,
                workflow_step=notification.workflow_step,
                notification_type='manual_reminder',
                priority='urgent',
                title=f"ESCALAÇÃO: {notification.title}",
                message=f"Esta notificação foi escalada pois não houve resposta em tempo hábil.\n\n"
                       f"Notificação original para: {notification.user.username}\n"
                       f"Criada em: {notification.created_at.strftime('%d/%m/%Y %H:%M')}\n\n"
                       f"Mensagem original: {notification.message}",
                metadata={
                    'is_escalation': True,
                    'original_notification_id': str(notification.id),
                    'original_user': notification.user.username,
                    'escalation_level': escalate_to
                }
            )
            
            # Marcar a notificação original como escalada
            notification.metadata = notification.metadata or {}
            notification.metadata['escalated_to'] = escalation_user.username
            notification.metadata['escalated_at'] = timezone.now().isoformat()
            notification.save()
            
            logger.info(f"Notificação {notification.id} escalada para {escalation_user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao escalar notificação {notification.id}: {e}")
            return False
    
    @staticmethod
    def _find_escalation_target(user, escalate_to):
        """
        Encontra o usuário alvo para escalação
        """
        try:
            profile = Profile.objects.get(user=user)
            organization = profile.organization
            
            if not organization:
                return None
            
            if escalate_to == 'supervisor':
                # Buscar supervisor do usuário (simplificado)
                # Em um sistema real, haveria uma hierarquia definida
                return NotificationEscalationService._find_user_supervisor(profile)
            
            elif escalate_to == 'manager':
                # Buscar gerente da área
                return NotificationEscalationService._find_area_manager(profile)
            
            elif escalate_to == 'admin':
                # Buscar administrador da organização
                admin_profile = Profile.objects.filter(
                    organization=organization,
                    is_org_admin=True,
                    user__is_active=True
                ).first()
                return admin_profile.user if admin_profile else None
            
        except Profile.DoesNotExist:
            return None
        
        return None
    
    @staticmethod
    def _find_user_supervisor(profile):
        """
        Encontra o supervisor de um usuário (implementação simplificada)
        """
        # Em um sistema real, isso seria baseado em hierarquia organizacional
        # Por enquanto, buscar alguém com permissões de gestão na mesma organização
        supervisor_profile = Profile.objects.filter(
            organization=profile.organization,
            can_edit_all_tasks=True,
            user__is_active=True
        ).exclude(user=profile.user).first()
        
        return supervisor_profile.user if supervisor_profile else None
    
    @staticmethod
    def _find_area_manager(profile):
        """
        Encontra o gerente da área (implementação simplificada)
        """
        # Buscar alguém com permissões mais amplas
        manager_profile = Profile.objects.filter(
            organization=profile.organization,
            can_view_all_tasks=True,
            can_manage_workflows=True,
            user__is_active=True
        ).exclude(user=profile.user).first()
        
        return manager_profile.user if manager_profile else None