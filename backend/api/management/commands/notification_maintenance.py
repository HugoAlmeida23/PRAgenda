# management/commands/notification_maintenance.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from ...models import WorkflowNotification, NotificationDigest
from ...services.notification_service import NotificationService
from ...services.notification_digest_service import NotificationDigestService
from ...services.notification_escalation import NotificationEscalationService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Manutenção automática do sistema de notificações'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=['cleanup', 'generate_digests', 'send_digests', 'escalate', 'all'],
            default='all',
            help='Ação específica a executar'
        )
        
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Dias para limpeza de notificações antigas (padrão: 90)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Executar sem fazer alterações (apenas relatório)'
        )
    
    def handle(self, *args, **options):
        action = options['action']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('MODO DRY-RUN: Nenhuma alteração será feita')
            )
        
        if action in ['cleanup', 'all']:
            self.cleanup_old_notifications(options['days'], dry_run)
        
        if action in ['generate_digests', 'all']:
            self.generate_digests(dry_run)
        
        if action in ['send_digests', 'all']:
            self.send_digests(dry_run)
        
        if action in ['escalate', 'all']:
            self.escalate_notifications(dry_run)
        
        self.stdout.write(
            self.style.SUCCESS('✅ Manutenção de notificações concluída')
        )
    
    def cleanup_old_notifications(self, days, dry_run):
        """Limpa notificações antigas"""
        self.stdout.write('🧹 Iniciando limpeza de notificações antigas...')
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Notificações para arquivar (lidas e antigas)
        to_archive = WorkflowNotification.objects.filter(
            is_read=True,
            is_archived=False,
            created_at__lt=cutoff_date
        )
        
        # Notificações para deletar (arquivadas há muito tempo)
        very_old_cutoff = timezone.now() - timedelta(days=days * 2)
        to_delete = WorkflowNotification.objects.filter(
            is_archived=True,
            created_at__lt=very_old_cutoff
        )
        
        self.stdout.write(f'📋 Encontradas:')
        self.stdout.write(f'  - {to_archive.count()} notificações para arquivar')
        self.stdout.write(f'  - {to_delete.count()} notificações para deletar')
        
        if not dry_run:
            # Arquivar notificações antigas lidas
            archived_count = to_archive.update(is_archived=True)
            self.stdout.write(
                self.style.SUCCESS(f'✅ {archived_count} notificações arquivadas')
            )
            
            # Deletar notificações muito antigas
            deleted_count, _ = to_delete.delete()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {deleted_count} notificações deletadas')
            )
            
            # Limpar digests antigos
            old_digests = NotificationDigest.objects.filter(
                created_at__lt=very_old_cutoff
            )
            digest_deleted_count, _ = old_digests.delete()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {digest_deleted_count} digests antigos deletados')
            )
    
    def generate_digests(self, dry_run):
        """Gera digests pendentes"""
        self.stdout.write('📊 Gerando digests diários...')
        
        if not dry_run:
            generated_count = NotificationDigestService.generate_daily_digests()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {generated_count} digests gerados')
            )
        else:
            self.stdout.write('🔍 Modo dry-run: digests não foram gerados')
    
    def send_digests(self, dry_run):
        """Envia digests pendentes"""
        self.stdout.write('📤 Enviando digests pendentes...')
        
        pending_count = NotificationDigest.objects.filter(is_sent=False).count()
        self.stdout.write(f'📋 {pending_count} digests pendentes')
        
        if not dry_run and pending_count > 0:
            sent_count = NotificationDigestService.send_pending_digests()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {sent_count} digests enviados')
            )
        else:
            self.stdout.write('🔍 Modo dry-run: digests não foram enviados')
    
    def escalate_notifications(self, dry_run):
        """Processa escalações de notificações"""
        self.stdout.write('⚠️ Verificando notificações para escalação...')
        
        # Contar notificações que precisam ser escaladas
        now = timezone.now()
        urgent_overdue = WorkflowNotification.objects.filter(
            priority='urgent',
            is_read=False,
            created_at__lt=now - timedelta(hours=24),
            metadata__escalated_to__isnull=True
        ).count()
        
        self.stdout.write(f'📋 {urgent_overdue} notificações urgentes não lidas há 24h+')
        
        if not dry_run:
            escalated_count = NotificationEscalationService.check_and_escalate_overdue_notifications()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {escalated_count} notificações escaladas')
            )
        else:
            self.stdout.write('🔍 Modo dry-run: escalações não foram processadas')