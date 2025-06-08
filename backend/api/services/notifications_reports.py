from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from ..models import WorkflowNotification, Task, WorkflowHistory, TaskApproval, Profile
import csv
import json
from io import StringIO
import logging

logger = logging.getLogger(__name__)

class NotificationReportsService:
    """
    Serviço para geração de relatórios detalhados de notificações
    """
    
    @staticmethod
    def generate_notification_report(organization, start_date, end_date, format='json'):
        """
        Gera relatório completo de notificações para uma organização
        """
        org_users = Profile.objects.filter(
            organization=organization
        ).values_list('user_id', flat=True)
        
        notifications = WorkflowNotification.objects.filter(
            user_id__in=org_users,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related(
            'user', 'task', 'workflow_step', 'created_by'
        ).order_by('-created_at')
        
        report_data = {
            'metadata': {
                'organization': organization.name,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'generated_at': timezone.now().isoformat(),
                'total_notifications': notifications.count(),
            },
            'summary': {
                'by_type': list(notifications.values('notification_type').annotate(
                    count=Count('id')
                ).order_by('-count')),
                'by_priority': list(notifications.values('priority').annotate(
                    count=Count('id')
                ).order_by('-count')),
                'by_user': list(notifications.values(
                    'user__username'
                ).annotate(
                    count=Count('id'),
                    unread_count=Count('id', filter=Q(is_read=False))
                ).order_by('-count')),
                'read_rate': round(
                    notifications.filter(is_read=True).count() / notifications.count() * 100, 2
                ) if notifications.count() > 0 else 0,
            },
            'details': []
        }
        
        # Adicionar detalhes se formato JSON
        if format == 'json':
            for notification in notifications[:1000]:  # Limitar para performance
                report_data['details'].append({
                    'id': str(notification.id),
                    'user': notification.user.username,
                    'task_title': notification.task.title if notification.task else None,
                    'client_name': notification.task.client.name if notification.task and notification.task.client else None,
                    'notification_type': notification.notification_type,
                    'priority': notification.priority,
                    'title': notification.title,
                    'message': notification.message,
                    'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat(),
                    'read_at': notification.read_at.isoformat() if notification.read_at else None,
                    'workflow_step': notification.workflow_step.name if notification.workflow_step else None,
                })
        
        if format == 'csv':
            return NotificationReportsService._generate_csv_report(notifications)
        
        return report_data
    
    @staticmethod
    def _generate_csv_report(notifications):
        """Gera relatório em formato CSV"""
        output = StringIO()
        writer = csv.writer(output)
        
        # Cabeçalho
        writer.writerow([
            'ID', 'Usuário', 'Tarefa', 'Cliente', 'Tipo', 'Prioridade',
            'Título', 'Lida', 'Criada em', 'Lida em', 'Passo Workflow'
        ])
        
        # Dados
        for notification in notifications:
            writer.writerow([
                str(notification.id),
                notification.user.username,
                notification.task.title if notification.task else '',
                notification.task.client.name if notification.task and notification.task.client else '',
                notification.notification_type,
                notification.priority,
                notification.title,
                'Sim' if notification.is_read else 'Não',
                notification.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                notification.read_at.strftime('%Y-%m-%d %H:%M:%S') if notification.read_at else '',
                notification.workflow_step.name if notification.workflow_step else '',
            ])
        
        return output.getvalue()
    
    @staticmethod
    def generate_workflow_efficiency_report(organization, start_date, end_date):
        """
        Relatório de eficiência de workflows
        """
        org_users = Profile.objects.filter(
            organization=organization
        ).values_list('user_id', flat=True)
        
        # Tarefas com workflow no período
        tasks_with_workflow = Task.objects.filter(
            client__organization=organization,
            workflow__isnull=False,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related('workflow', 'client')
        
        report = {
            'metadata': {
                'organization': organization.name,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_workflow_tasks': tasks_with_workflow.count(),
            },
            'workflow_performance': [],
            'bottlenecks': [],
            'recommendations': []
        }
        
        # Análise por workflow
        for workflow in set(task.workflow for task in tasks_with_workflow):
            workflow_tasks = tasks_with_workflow.filter(workflow=workflow)
            
            # Calcular métricas
            completed_tasks = workflow_tasks.filter(status='completed')
            avg_completion_time = NotificationReportsService._calculate_avg_completion_time(workflow_tasks)
            
            # Notificações relacionadas
            workflow_notifications = WorkflowNotification.objects.filter(
                user_id__in=org_users,
                task__in=workflow_tasks,
                created_at__gte=start_date,
                created_at__lte=end_date
            )
            
            workflow_data = {
                'workflow_name': workflow.name,
                'total_tasks': workflow_tasks.count(),
                'completed_tasks': completed_tasks.count(),
                'completion_rate': round(completed_tasks.count() / workflow_tasks.count() * 100, 2) if workflow_tasks.count() > 0 else 0,
                'avg_completion_days': avg_completion_time,
                'total_notifications': workflow_notifications.count(),
                'urgent_notifications': workflow_notifications.filter(priority='urgent').count(),
                'overdue_notifications': workflow_notifications.filter(notification_type='step_overdue').count(),
                'step_performance': NotificationReportsService._analyze_step_performance(workflow, workflow_tasks)
            }
            
            report['workflow_performance'].append(workflow_data)
        
        # Identificar gargalos
        report['bottlenecks'] = NotificationReportsService._identify_bottlenecks(organization, start_date, end_date)
        
        # Gerar recomendações
        report['recommendations'] = NotificationReportsService._generate_recommendations(report)
        
        return report
    
    @staticmethod
    def _calculate_avg_completion_time(tasks):
        """Calcula tempo médio de conclusão de tarefas"""
        completed_tasks = tasks.filter(status='completed', completed_at__isnull=False)
        
        if not completed_tasks.exists():
            return None
        
        total_days = 0
        count = 0
        
        for task in completed_tasks:
            completion_time = task.completed_at - task.created_at
            total_days += completion_time.days
            count += 1
        
        return round(total_days / count, 1) if count > 0 else None
    
    @staticmethod
    def _analyze_step_performance(workflow, tasks):
        """Analisa performance de cada passo do workflow"""
        steps_performance = []
        
        for step in workflow.steps.order_by('order'):
            # Notificações deste passo
            step_notifications = WorkflowNotification.objects.filter(
                workflow_step=step,
                task__in=tasks
            )
            
            # Tempo médio no passo
            avg_time_in_step = NotificationReportsService._calculate_avg_time_in_step(step, tasks)
            
            steps_performance.append({
                'step_name': step.name,
                'order': step.order,
                'notifications_count': step_notifications.count(),
                'overdue_count': step_notifications.filter(notification_type='step_overdue').count(),
                'avg_time_days': avg_time_in_step,
                'requires_approval': step.requires_approval,
                'assigned_to': step.assign_to.username if step.assign_to else None,
            })
        
        return steps_performance
    
    @staticmethod
    def _calculate_avg_time_in_step(step, tasks):
        """Calcula tempo médio gasto em um passo específico"""
        # Buscar histórico de entrada e saída do passo
        histories = WorkflowHistory.objects.filter(
            task__in=tasks,
            to_step=step,
            action__in=['step_advanced', 'workflow_assigned']
        )
        
        total_hours = 0
        count = 0
        
        for history in histories:
            # Buscar quando saiu deste passo
            exit_history = WorkflowHistory.objects.filter(
                task=history.task,
                from_step=step,
                created_at__gt=history.created_at,
                action__in=['step_advanced', 'step_completed', 'workflow_completed']
            ).first()
            
            if exit_history:
                time_in_step = exit_history.created_at - history.created_at
                total_hours += time_in_step.total_seconds() / 3600
                count += 1
        
        return round(total_hours / 24 / count, 1) if count > 0 else None  # Converter para dias
    
    @staticmethod
    def _identify_bottlenecks(organization, start_date, end_date):
        """Identifica gargalos no sistema"""
        org_users = Profile.objects.filter(
            organization=organization
        ).values_list('user_id', flat=True)
        
        # Passos com mais notificações de atraso
        overdue_steps = WorkflowNotification.objects.filter(
            user_id__in=org_users,
            notification_type='step_overdue',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).values(
            'workflow_step__name',
            'workflow_step__workflow__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Usuários com mais notificações não lidas
        users_with_backlog = WorkflowNotification.objects.filter(
            user_id__in=org_users,
            is_read=False,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).values(
            'user__username'
        ).annotate(
            unread_count=Count('id')
        ).order_by('-unread_count')[:5]
        
        return {
            'overdue_steps': list(overdue_steps),
            'users_with_backlog': list(users_with_backlog),
        }
    
    @staticmethod
    def _generate_recommendations(report_data):
        """Gera recomendações baseadas no relatório"""
        recommendations = []
        
        # Analisar workflows com baixa eficiência
        for workflow in report_data['workflow_performance']:
            if workflow['completion_rate'] < 70:
                recommendations.append({
                    'type': 'workflow_efficiency',
                    'priority': 'high',
                    'title': f"Workflow '{workflow['workflow_name']}' com baixa taxa de conclusão",
                    'description': f"Taxa de conclusão de {workflow['completion_rate']}% está abaixo do ideal (70%+)",
                    'suggestions': [
                        "Revisar passos que podem estar causando gargalos",
                        "Verificar se os responsáveis têm capacidade adequada",
                        "Considerar simplificar o workflow"
                    ]
                })
            
            if workflow['avg_completion_days'] and workflow['avg_completion_days'] > 30:
                recommendations.append({
                    'type': 'completion_time',
                    'priority': 'medium',
                    'title': f"Workflow '{workflow['workflow_name']}' com tempo de conclusão elevado",
                    'description': f"Tempo médio de {workflow['avg_completion_days']} dias pode ser otimizado",
                    'suggestions': [
                        "Analisar passos que consomem mais tempo",
                        "Implementar paralelização onde possível",
                        "Revisar prazos e expectativas"
                    ]
                })
        
        # Analisar gargalos
        if report_data['bottlenecks']['overdue_steps']:
            top_bottleneck = report_data['bottlenecks']['overdue_steps'][0]
            recommendations.append({
                'type': 'bottleneck',
                'priority': 'urgent',
                'title': f"Gargalo identificado no passo '{top_bottleneck['workflow_step__name']}'",
                'description': f"{top_bottleneck['count']} notificações de atraso registradas",
                'suggestions': [
                    "Aumentar recursos para este passo",
                    "Revisar complexidade do passo",
                    "Considerar treinamento adicional para responsáveis"
                ]
            })
        
        return recommendations

