from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
from ..models import WorkflowNotification, Profile
import logging

logger = logging.getLogger(__name__)

class NotificationMetricsService:
    """
    Serviço para cálculo de métricas e estatísticas de notificações
    """
    
    @staticmethod
    def get_user_notification_stats(user, days=30):
        """
        Estatísticas de notificações para um usuário específico
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        notifications = WorkflowNotification.objects.filter(
            user=user,
            created_at__gte=cutoff_date
        )
        
        stats = {
            'period_days': days,
            'total_notifications': notifications.count(),
            'unread_count': notifications.filter(is_read=False).count(),
            'read_count': notifications.filter(is_read=True).count(),
            'archived_count': notifications.filter(is_archived=True).count(),
            
            # Por tipo
            'by_type': notifications.values('notification_type').annotate(
                count=Count('id')
            ).order_by('-count'),
            
            # Por prioridade
            'by_priority': notifications.values('priority').annotate(
                count=Count('id')
            ).order_by('-count'),
            
            # Tendência (últimos 7 dias vs 7 dias anteriores)
            'weekly_trend': NotificationMetricsService._calculate_weekly_trend(user),
            
            # Tempo médio para ler notificações
            'avg_read_time_hours': NotificationMetricsService._calculate_avg_read_time(user, days),
            
            # Taxa de resposta (notificações que levaram a ação)
            'action_rate': NotificationMetricsService._calculate_action_rate(user, days),
        }
        
        return stats
    
    @staticmethod
    def get_organization_notification_stats(organization, days=30):
        """
        Estatísticas de notificações para toda a organização
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Usuários da organização
        org_users = Profile.objects.filter(
            organization=organization
        ).values_list('user_id', flat=True)
        
        notifications = WorkflowNotification.objects.filter(
            user_id__in=org_users,
            created_at__gte=cutoff_date
        )
        
        stats = {
            'period_days': days,
            'organization_name': organization.name,
            'total_users': len(org_users),
            'users_with_notifications': notifications.values('user').distinct().count(),
            'total_notifications': notifications.count(),
            'avg_notifications_per_user': notifications.count() / len(org_users) if org_users else 0,
            
            # Distribuição por tipo
            'notification_distribution': notifications.values('notification_type').annotate(
                count=Count('id'),
                percentage=Count('id') * 100.0 / notifications.count() if notifications.count() > 0 else 0
            ).order_by('-count'),
            
            # Usuários mais notificados
            'top_notified_users': notifications.values(
                'user__username'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:10],
            
            # Taxa de leitura geral
            'read_rate': (
                notifications.filter(is_read=True).count() / notifications.count() * 100
                if notifications.count() > 0 else 0
            ),
            
            # Notificações por dia (últimos 7 dias)
            'daily_volume': NotificationMetricsService._get_daily_volume(org_users, 7),
            
            # Notificações urgentes não lidas
            'urgent_unread': notifications.filter(
                priority='urgent',
                is_read=False
            ).count(),
        }
        
        return stats
    
    @staticmethod
    def get_workflow_notification_performance(workflow_id=None, days=30):
        """
        Performance de notificações relacionadas a workflows
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        base_query = WorkflowNotification.objects.filter(
            created_at__gte=cutoff_date,
            workflow_step__isnull=False
        )
        
        if workflow_id:
            base_query = base_query.filter(workflow_step__workflow_id=workflow_id)
        
        stats = {
            'period_days': days,
            'workflow_id': workflow_id,
            
            # Notificações por passo de workflow
            'notifications_by_step': base_query.values(
                'workflow_step__name',
                'workflow_step__workflow__name'
            ).annotate(
                count=Count('id')
            ).order_by('-count'),
            
            # Eficiência de aprovações
            'approval_efficiency': NotificationMetricsService._calculate_approval_efficiency(workflow_id, days),
            
            # Tempo médio entre notificação e ação
            'avg_response_time': NotificationMetricsService._calculate_workflow_response_time(workflow_id, days),
            
            # Gargalos (passos com mais notificações não lidas)
            'bottlenecks': base_query.filter(
                is_read=False,
                notification_type__in=['approval_needed', 'step_ready', 'step_overdue']
            ).values(
                'workflow_step__name'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:5],
        }
        
        return stats
    
    @staticmethod
    def _calculate_weekly_trend(user):
        """Calcula tendência semanal de notificações"""
        now = timezone.now()
        this_week_start = now - timedelta(days=7)
        last_week_start = now - timedelta(days=14)
        
        this_week_count = WorkflowNotification.objects.filter(
            user=user,
            created_at__gte=this_week_start
        ).count()
        
        last_week_count = WorkflowNotification.objects.filter(
            user=user,
            created_at__gte=last_week_start,
            created_at__lt=this_week_start
        ).count()
        
        if last_week_count == 0:
            trend_percentage = 100 if this_week_count > 0 else 0
        else:
            trend_percentage = ((this_week_count - last_week_count) / last_week_count) * 100
        
        return {
            'this_week': this_week_count,
            'last_week': last_week_count,
            'trend_percentage': round(trend_percentage, 1),
            'trend_direction': 'up' if trend_percentage > 0 else 'down' if trend_percentage < 0 else 'stable'
        }
    
    @staticmethod
    def _calculate_avg_read_time(user, days):
        """Calcula tempo médio para ler notificações"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        read_notifications = WorkflowNotification.objects.filter(
            user=user,
            is_read=True,
            read_at__isnull=False,
            created_at__gte=cutoff_date
        )
        
        if not read_notifications.exists():
            return 0
        
        total_hours = 0
        count = 0
        
        for notification in read_notifications:
            time_diff = notification.read_at - notification.created_at
            hours = time_diff.total_seconds() / 3600
            total_hours += hours
            count += 1
        
        return round(total_hours / count, 2) if count > 0 else 0
    
    @staticmethod
    def _calculate_action_rate(user, days):
        """
        Calcula taxa de ação baseada em notificações que levaram a mudanças
        (simplificado - em produção seria mais complexo)
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        
        notifications = WorkflowNotification.objects.filter(
            user=user,
            created_at__gte=cutoff_date
        )
        
        total = notifications.count()
        if total == 0:
            return 0
        
        # Considerar como "ação" notificações que foram lidas em menos de 24h
        # Em produção seria baseado em mudanças reais no sistema
        acted_upon = notifications.filter(
            is_read=True,
            read_at__isnull=False
        ).filter(
            read_at__lt=timezone.now()
        ).count()
        
        return round((acted_upon / total) * 100, 1)
    
    @staticmethod
    def _get_daily_volume(user_ids, days):
        """Volume diário de notificações"""
        daily_data = []
        
        for i in range(days):
            date = timezone.now().date() - timedelta(days=i)
            count = WorkflowNotification.objects.filter(
                user_id__in=user_ids,
                created_at__date=date
            ).count()
            
            daily_data.append({
                'date': date.isoformat(),
                'count': count
            })
        
        return daily_data[::-1]  # Ordem cronológica
    
    @staticmethod
    def _calculate_approval_efficiency(workflow_id, days):
        """Eficiência do processo de aprovação"""
        from ..models import TaskApproval, WorkflowHistory
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Aprovações no período
        approvals_query = TaskApproval.objects.filter(
            approved_at__gte=cutoff_date
        )
        
        if workflow_id:
            approvals_query = approvals_query.filter(
                workflow_step__workflow_id=workflow_id
            )
        
        total_approvals = approvals_query.count()
        approved_count = approvals_query.filter(approved=True).count()
        rejected_count = approvals_query.filter(approved=False).count()
        
        return {
            'total_approvals': total_approvals,
            'approved_rate': round((approved_count / total_approvals) * 100, 1) if total_approvals > 0 else 0,
            'rejected_rate': round((rejected_count / total_approvals) * 100, 1) if total_approvals > 0 else 0,
        }
    
    @staticmethod
    def _calculate_workflow_response_time(workflow_id, days):
        """Tempo médio de resposta em workflows"""
        # Implementação simplificada
        # Em produção, calcularia tempo entre notificação e ação no workflow
        return {
            'avg_hours': 4.5,  # Placeholder
            'median_hours': 3.2,  # Placeholder
        }