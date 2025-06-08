from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from ..models import WorkflowNotification, Task, WorkflowHistory, TaskApproval, Profile, NotificationTemplate, User, NotificationDigest
from .notification_service import NotificationService
import csv
import json
from io import StringIO
import logging

logger = logging.getLogger(__name__)

class NotificationDigestService:
    """
    Serviço para gestão de digests de notificação
    """
    
    @staticmethod
    def generate_daily_digests():
        """
        Gera digests diários para usuários configurados
        """
        # Usuários com digest diário habilitado
        users_with_daily_digest = User.objects.filter(
            notification_settings__digest_frequency='daily',
            is_active=True
        )
        
        generated_count = 0
        
        for user in users_with_daily_digest:
            try:
                digest = NotificationDigestService._create_daily_digest(user)
                if digest:
                    generated_count += 1
            except Exception as e:
                logger.error(f"Erro ao gerar digest diário para {user.username}: {e}")
        
        return generated_count
    
    @staticmethod
    def _create_daily_digest(user):
        """
        Cria digest diário para um usuário
        """
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        
        # Buscar notificações do período
        notifications = WorkflowNotification.objects.filter(
            user=user,
            created_at__gte=yesterday,
            created_at__lt=now,
            is_archived=False
        ).order_by('-created_at')
        
        if not notifications.exists():
            return None  # Não criar digest vazio
        
        # Verificar se já existe digest para este período
        existing_digest = NotificationDigest.objects.filter(
            user=user,
            digest_type='daily',
            period_start__date=yesterday.date()
        ).first()
        
        if existing_digest:
            return existing_digest
        
        # Gerar conteúdo do digest
        content = NotificationDigestService._generate_digest_content(notifications)
        
        # Criar digest
        digest = NotificationDigest.objects.create(
            user=user,
            digest_type='daily',
            period_start=yesterday,
            period_end=now,
            title=f"Resumo diário de {yesterday.strftime('%d/%m/%Y')}",
            content=content
        )
        
        # Associar notificações
        digest.notifications.set(notifications)
        
        return digest
    
    @staticmethod
    def _generate_digest_content(notifications):
        """
        Gera conteúdo HTML/texto do digest
        """
        total = notifications.count()
        unread = notifications.filter(is_read=False).count()
        urgent = notifications.filter(priority='urgent').count()
        
        # Agrupar por tipo
        by_type = {}
        for notification in notifications:
            type_name = notification.get_notification_type_display()
            if type_name not in by_type:
                by_type[type_name] = []
            by_type[type_name].append(notification)
        
        # Gerar conteúdo
        content_parts = [
            f"📊 **Resumo**: {total} notificações ({unread} não lidas, {urgent} urgentes)",
            "",
        ]
        
        if urgent > 0:
            content_parts.extend([
                "🚨 **Notificações Urgentes:**",
                ""
            ])
            urgent_notifications = notifications.filter(priority='urgent')[:5]
            for notif in urgent_notifications:
                content_parts.append(f"• {notif.title}")
            content_parts.append("")
        
        content_parts.extend([
            "📋 **Por Tipo:**",
            ""
        ])
        
        for type_name, type_notifications in by_type.items():
            content_parts.append(f"**{type_name}** ({len(type_notifications)})")
            for notif in type_notifications[:3]:  # Máximo 3 por tipo
                status = "🔴" if not notif.is_read else "✅"
                content_parts.append(f"  {status} {notif.title}")
            if len(type_notifications) > 3:
                content_parts.append(f"  ... e mais {len(type_notifications) - 3}")
            content_parts.append("")
        
        return "\n".join(content_parts)
    
    @staticmethod
    def send_pending_digests():
        """
        Envia digests pendentes
        """
        pending_digests = NotificationDigest.objects.filter(
            is_sent=False,
            created_at__lte=timezone.now() - timedelta(minutes=5)  # Aguardar 5 min antes de enviar
        )
        
        sent_count = 0
        
        for digest in pending_digests:
            try:
                # Aqui seria integração com sistema de email
                # Por enquanto, apenas marcar como enviado
                digest.is_sent = True
                digest.sent_at = timezone.now()
                digest.save()
                sent_count += 1
                
                logger.info(f"Digest enviado para {digest.user.username}")
                
            except Exception as e:
                logger.error(f"Erro ao enviar digest {digest.id}: {e}")
        
        return sent_count
