from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
from django.conf import settings # Moved up

from .models import (
    Organization, Task, Profile, WorkflowHistory, TaskApproval, 
    NotificationDigest, WorkflowNotification, FiscalObligationDefinition,
    FiscalSystemSettings
)

from .services.notification_service import NotificationService
from .services.notification_digest_service import NotificationDigestService
from .services.notification_escalation import NotificationEscalationService
from .services.fiscal_obligation_service import FiscalObligationGenerator
from .services.fiscal_notification_service import FiscalNotificationService

from .utils import update_profitability_for_period, update_client_profitability
from dateutil.relativedelta import relativedelta
from .models import Client


logger = logging.getLogger(__name__)

@shared_task
def update_profitability_for_single_organization_task(organization_id, months_to_update_list):
    """
    Updates client profitability for a specific organization for specified months.
    
    Args:
        organization_id: The ID of the organization to process.
        months_to_update_list: A list of tuples, e.g., [(year1, month1), (year2, month2)].
    """
    try:
        organization = Organization.objects.get(id=organization_id)
        logger.info(f"Starting profitability update task for organization: {organization.name} ({organization_id})")
        
        total_clients_processed_overall = 0
        
        for year, month in months_to_update_list:
            org_clients = Client.objects.filter(organization=organization, is_active=True)
            clients_updated_this_period = 0
            logger.info(f"Processing period: {month:02d}/{year} for org: {organization.name}")
            
            for client_instance in org_clients:
                try:
                    result = update_client_profitability(client_instance.id, year, month)
                    if result:
                        clients_updated_this_period += 1
                except Exception as e:
                    logger.error(f"Error updating profitability for client {client_instance.id} "
                                 f"in org {organization.id} for period {month}/{year}: {e}", exc_info=True)
            
            logger.info(f"Profitability updated for {clients_updated_this_period} clients in org {organization.name} for period {month:02d}/{year}.")
            total_clients_processed_overall += clients_updated_this_period

        logger.info(f"Finished profitability update task for organization: {organization.name}. Total client-month records updated: {total_clients_processed_overall}")
        return {
            "status": "success", 
            "organization_id": organization_id,
            "organization_name": organization.name,
            "total_client_month_records_updated": total_clients_processed_overall,
            "processed_periods": months_to_update_list
        }

    except Organization.DoesNotExist:
        logger.error(f"Organization with ID {organization_id} not found for profitability update.")
        return {"status": "error", "message": f"Organization {organization_id} not found."}
    except Exception as e:
        logger.error(f"General error in update_profitability_for_single_organization_task for org {organization_id}: {e}", exc_info=True)
        return {"status": "error", "message": str(e), "organization_id": organization_id}
    
@shared_task
def update_client_profitability_globally_task():
    logger.info("Starting global client profitability update task.")
    now = timezone.now()
    current_month_year = now.year
    current_month_month = now.month
    
    # Update for current month
    updated_current = update_profitability_for_period(current_month_year, current_month_month)
    logger.info(f"Updated profitability for {updated_current} client-month records for {current_month_month}/{current_month_year}.")

    # Optionally, update for previous month to catch late entries
    prev_month_date = now - relativedelta(months=1)
    prev_month_year = prev_month_date.year
    prev_month_month = prev_month_date.month
    updated_prev = update_profitability_for_period(prev_month_year, prev_month_month)
    logger.info(f"Updated profitability for {updated_prev} client-month records for {prev_month_month}/{prev_month_year}.")
    logger.info("Finished global client profitability update task.")
    return {"current_month_updated": updated_current, "previous_month_updated": updated_prev}


@shared_task(bind=True, max_retries=3)
def generate_fiscal_obligations_task(self, organization_id=None, months_ahead=3):
    """
    Task para geração automática de obrigações fiscais.
    """
    try:
        organization = None
        if organization_id:
            organization = Organization.objects.get(id=organization_id)
            
            # Verificar se geração automática está habilitada
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            if not fiscal_settings.auto_generation_enabled:
                logger.info(f"Geração automática desabilitada para {organization.name}")
                return {'skipped': True, 'reason': 'Auto generation disabled'}
        
        logger.info(f"Iniciando geração automática de obrigações - Org: {organization.name if organization else 'Todas'}")
        
        # Gerar obrigações
        results = FiscalObligationGenerator.generate_for_next_months(
            months_ahead=months_ahead,
            organization=organization
        )
        
        # Calcular estatísticas totais
        total_stats = {
            'months_processed': len(results),
            'tasks_created': sum(r['tasks_created'] for r in results),
            'tasks_skipped': sum(r['tasks_skipped'] for r in results),
            'definitions_processed': sum(r['definitions_processed'] for r in results),
            'clients_processed': sum(r['clients_processed'] for r in results),
            'errors': []
        }
        
        # Consolidar erros
        for result in results:
            total_stats['errors'].extend(result.get('errors', []))
        
        # Atualizar timestamp da última geração
        if organization:
            fiscal_settings.update_last_generation()
        
        # Enviar notificações
        if organization:
            FiscalNotificationService.notify_generation_completed(organization, total_stats)
        
        logger.info(f"Geração automática concluída: {total_stats['tasks_created']} tarefas criadas")
        
        return {
            'success': True,
            'organization': organization.name if organization else 'All',
            'stats': total_stats,
            'detailed_results': results
        }
        
    except Exception as e:
        error_msg = f"Erro na geração automática de obrigações: {str(e)}"
        logger.error(error_msg)
        
        # Notificar erro
        if organization_id:
            try:
                organization = Organization.objects.get(id=organization_id)
                FiscalNotificationService.notify_generation_error(organization, error_msg)
            except:
                pass
        
        # Retry com backoff exponencial
        raise self.retry(countdown=60 * (2 ** self.request.retries), exc=e)


@shared_task
def clean_old_fiscal_obligations_task(days_old=30):
    """
    Task para limpeza automática de obrigações obsoletas.
    """
    try:
        logger.info(f"Iniciando limpeza de obrigações obsoletas (>{days_old} dias)")
        
        total_cleaned = 0
        
        # Processar cada organização separadamente
        for organization in Organization.objects.filter(is_active=True):
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            
            if not fiscal_settings.auto_cleanup_enabled:
                continue
            
            # Usar configuração específica da organização para dias
            org_days_old = fiscal_settings.cleanup_days_threshold
            
            cleaned_count = FiscalObligationGenerator.clean_old_pending_obligations(
                days_old=org_days_old,
                organization=organization
            )
            
            total_cleaned += cleaned_count
            
            if cleaned_count > 0:
                logger.info(f"Limpeza: {cleaned_count} tarefas removidas para {organization.name}")
        
        logger.info(f"Limpeza concluída: {total_cleaned} tarefas removidas no total")
        
        return {
            'success': True,
            'total_cleaned': total_cleaned
        }
        
    except Exception as e:
        logger.error(f"Erro na limpeza de obrigações obsoletas: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def check_fiscal_deadlines_task():
    """
    Task para verificar prazos de obrigações fiscais se aproximando.
    """
    try:
        logger.info("Verificando prazos de obrigações fiscais")
        
        today = timezone.now().date()
        warning_days = [1, 3, 7]  # Alertar com 1, 3 e 7 dias de antecedência
        
        total_notifications = 0
        
        for organization in Organization.objects.filter(is_active=True):
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            
            if not fiscal_settings.email_notifications_enabled:
                continue
            
            # Buscar tarefas de obrigações fiscais com prazos próximos
            for days_ahead in warning_days:
                target_date = today + timedelta(days=days_ahead)
                
                tasks_with_deadline = Task.objects.filter(
                    client__organization=organization,
                    source_fiscal_obligation__isnull=False,
                    deadline=target_date,
                    status__in=['pending', 'in_progress']
                ).select_related('client', 'source_fiscal_obligation')
                
                if tasks_with_deadline.exists():
                    FiscalNotificationService.notify_deadlines_approaching(
                        organization, 
                        list(tasks_with_deadline)
                    )
                    total_notifications += 1
        
        logger.info(f"Verificação de prazos concluída: {total_notifications} notificações enviadas")
        
        return {
            'success': True,
            'notifications_sent': total_notifications
        }
        
    except Exception as e:
        logger.error(f"Erro na verificação de prazos: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def generate_weekly_fiscal_report_task():
    """
    Task para gerar relatório semanal de obrigações fiscais.
    """
    try:
        logger.info("Gerando relatórios semanais de obrigações fiscais")
        
        week_ago = timezone.now() - timedelta(days=7)
        reports_sent = 0
        
        for organization in Organization.objects.filter(is_active=True):
            fiscal_settings = FiscalSystemSettings.get_for_organization(organization)
            
            if not fiscal_settings.email_notifications_enabled:
                continue
            
            # Obter estatísticas da semana
            stats = FiscalObligationGenerator.get_generation_stats(organization)
            
            # Tarefas criadas na semana
            weekly_tasks = Task.objects.filter(
                client__organization=organization,
                source_fiscal_obligation__isnull=False,
                created_at__gte=week_ago
            )
            
            # Tarefas concluídas na semana
            completed_tasks = weekly_tasks.filter(
                status='completed',
                completed_at__gte=week_ago
            )
            
            # Tarefas em atraso
            overdue_tasks = Task.objects.filter(
                client__organization=organization,
                source_fiscal_obligation__isnull=False,
                deadline__lt=timezone.now().date(),
                status__in=['pending', 'in_progress']
            )
            
            weekly_stats = {
                'organization': organization.name,
                'period': f"{week_ago.strftime('%d/%m/%Y')} - {timezone.now().strftime('%d/%m/%Y')}",
                'tasks_created_week': weekly_tasks.count(),
                'tasks_completed_week': completed_tasks.count(),
                'tasks_overdue': overdue_tasks.count(),
                'overall_stats': stats
            }
            
            # Enviar relatório por email
            try:
                from django.core.mail import send_mail
                from django.template.loader import render_to_string
                
                subject = f"[{organization.name}] Relatório Semanal - Obrigações Fiscais"
                
                html_content = render_to_string('fiscal/emails/weekly_report.html', {
                    'organization': organization.name,
                    'stats': weekly_stats,
                    'week_start': week_ago.strftime('%d/%m/%Y'),
                    'week_end': timezone.now().strftime('%d/%m/%Y')
                })
                
                text_content = f"""
                Relatório Semanal de Obrigações Fiscais
                Organização: {organization.name}
                Período: {weekly_stats['period']}
                
                Resumo da Semana:
                - Tarefas criadas: {weekly_stats['tasks_created_week']}
                - Tarefas concluídas: {weekly_stats['tasks_completed_week']}
                - Tarefas em atraso: {weekly_stats['tasks_overdue']}
                
                Estatísticas Gerais:
                - Total gerado: {stats['total_generated']}
                - Taxa de conclusão: {stats['completion_rate']:.1f}%
                """
                
                send_mail(
                    subject=subject,
                    message=text_content,
                    html_message=html_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=fiscal_settings.get_notification_recipients(),
                    fail_silently=False
                )
                
                reports_sent += 1
                
            except Exception as e:
                logger.error(f"Erro ao enviar relatório semanal para {organization.name}: {e}")
        
        logger.info(f"Relatórios semanais enviados: {reports_sent}")
        
        return {
            'success': True,
            'reports_sent': reports_sent
        }
        
    except Exception as e:
        logger.error(f"Erro na geração de relatórios semanais: {e}")
        return {
            'success': False,
            'error': str(e)
        }


# Para organizações específicas
@shared_task
def generate_fiscal_obligations_for_organization_task(organization_id, months_ahead=3):
    
    """
    Task para gerar obrigações para uma organização específica.
    """
    return generate_fiscal_obligations_task(organization_id=organization_id, months_ahead=months_ahead)

@shared_task
def check_upcoming_deadlines_and_notify_task():
    logger.info("Starting task: check_upcoming_deadlines_and_notify_task")
    now = timezone.now()
    thresholds_days = [7, 3, 1, 0]  # Notify 7, 3, 1 day(s) before, and on the day of deadline
    organizations_processed = 0
    notifications_created_total = 0
    tasks_checked_total = 0

    for org in Organization.objects.filter(is_active=True):
        organizations_processed += 1
        logger.debug(f"Processing deadlines for organization: {org.name} ({org.id})")
        for days_ahead in thresholds_days:
            target_deadline_date = (now + timedelta(days=days_ahead)).date()
            
            tasks_with_near_deadline = Task.objects.filter(
                deadline__date=target_deadline_date,
                status__in=['pending', 'in_progress'],
                client__organization=org 
            ).select_related('assigned_to', 'current_workflow_step__assign_to', 'created_by', 'client')
            
            count_for_day = tasks_with_near_deadline.count()
            tasks_checked_total += count_for_day
            if count_for_day > 0:
                logger.debug(f"Found {count_for_day} tasks with deadline on {target_deadline_date} for org {org.name}")

            for task_item in tasks_with_near_deadline: # Renamed to avoid conflict
                # NotificationService.notify_deadline_approaching will handle user preferences
                notifications = NotificationService.notify_deadline_approaching(task_item, days_ahead)
                if notifications:
                     notifications_created_total += len(notifications)
        
    logger.info(f"Finished task: check_upcoming_deadlines_and_notify_task. Orgs processed: {organizations_processed}. Tasks checked: {tasks_checked_total}. Notifications created: {notifications_created_total}.")
    return {
        'status': 'success',
        'organizations_processed': organizations_processed,
        'tasks_checked': tasks_checked_total,
        'notifications_created': notifications_created_total
    }

@shared_task
def check_overdue_steps_and_notify_task(default_overdue_threshold_days=3):
    logger.info(f"Starting task: check_overdue_steps_and_notify_task (threshold: {default_overdue_threshold_days} days)")
    now = timezone.now()
    notifications_created_total = 0
    tasks_processed_total = 0
    organizations_processed = 0

    for org in Organization.objects.filter(is_active=True):
        organizations_processed += 1
        logger.debug(f"Processing overdue steps for organization: {org.name} ({org.id})")
        
        # In a real system, overdue_threshold_days might come from Organization settings
        # For now, we use the task parameter.
        overdue_threshold_days = default_overdue_threshold_days 

        active_workflow_tasks = Task.objects.filter(
            client__organization=org,
            status__in=['pending', 'in_progress'],
            workflow__isnull=False,
            current_workflow_step__isnull=False
        ).select_related(
            'current_workflow_step', 
            'current_workflow_step__assign_to', 
            'assigned_to', 
            'created_by', 
            'client', 
            'client__account_manager'
        )

        for task_item in active_workflow_tasks: # Renamed to avoid conflict
            tasks_processed_total += 1
            
            last_significant_history = WorkflowHistory.objects.filter(
                task=task_item, 
                to_step=task_item.current_workflow_step,
                action__in=['step_advanced', 'workflow_assigned'] 
            ).order_by('-created_at').first()

            step_became_current_at = task_item.updated_at 
            if last_significant_history:
                step_became_current_at = last_significant_history.created_at
            
            days_on_current_step = (now - step_became_current_at).days

            if days_on_current_step >= overdue_threshold_days:
                logger.debug(f"Task {task_item.id} ({task_item.title}) step '{task_item.current_workflow_step.name}' is {days_on_current_step} days overdue (threshold: {overdue_threshold_days}). Notifying.")
                notifications = NotificationService.notify_step_overdue(task_item, task_item.current_workflow_step, days_on_current_step)
                if notifications:
                    notifications_created_total += len(notifications)
        
    logger.info(f"Finished task: check_overdue_steps_and_notify_task. Orgs processed: {organizations_processed}. Tasks checked: {tasks_processed_total}. Notifications created: {notifications_created_total}.")
    return {
        'status': 'success',
        'organizations_processed': organizations_processed,
        'tasks_with_active_workflow_step_checked': tasks_processed_total,
        'overdue_step_notifications_created': notifications_created_total
    }

@shared_task
def check_pending_approvals_and_remind_task(default_reminder_threshold_days=2):
    logger.info(f"Starting task: check_pending_approvals_and_remind_task (reminder threshold: {default_reminder_threshold_days} days)")
    now = timezone.now()
    notifications_sent_total = 0
    tasks_checked_count = 0
    organizations_processed = 0

    for org in Organization.objects.filter(is_active=True):
        organizations_processed += 1
        logger.debug(f"Processing pending approvals for organization: {org.name} ({org.id})")
        
        reminder_threshold_days = default_reminder_threshold_days

        candidate_tasks = Task.objects.filter(
            client__organization=org,
            status__in=['pending', 'in_progress'],
            current_workflow_step__requires_approval=True
        ).select_related(
            'current_workflow_step', 
            'client', 
            'client__organization' 
        ).prefetch_related('approvals') 

        for task_item in candidate_tasks: # Renamed
            tasks_checked_count += 1
            
            is_current_step_approved = any(
                app.workflow_step_id == task_item.current_workflow_step_id and app.approved
                for app in task_item.approvals.all() 
            )

            if is_current_step_approved:
                continue

            step_became_current_history = WorkflowHistory.objects.filter(
                task=task_item, to_step=task_item.current_workflow_step,
                action__in=['step_advanced', 'workflow_assigned']
            ).order_by('-created_at').first()

            if step_became_current_history:
                days_pending_approval = (now - step_became_current_history.created_at).days
                if days_pending_approval >= reminder_threshold_days:
                    logger.debug(f"Task {task_item.id} ({task_item.title}) step '{task_item.current_workflow_step.name}' pending approval for {days_pending_approval} days. Sending reminder.")
                    reminders = NotificationService.notify_approval_needed(
                        task_item, task_item.current_workflow_step, 
                        approvers=None, 
                        is_reminder=True
                    )
                    if reminders:
                        notifications_sent_total += len(reminders)
            else:
                logger.warning(f"Task {task_item.id} has current_workflow_step {task_item.current_workflow_step.id} requiring approval, but no history record of it becoming current.")

    logger.info(f"Finished task: check_pending_approvals_and_remind_task. Orgs processed: {organizations_processed}. Tasks checked: {tasks_checked_count}. Reminders sent: {notifications_sent_total}.")
    return {
        'status': 'success',
        'organizations_processed': organizations_processed,
        'tasks_checked_for_pending_approval': tasks_checked_count,
        'approval_reminder_notifications_sent': notifications_sent_total
    }

# === Notification Maintenance Tasks (from management command logic) ===

@shared_task
def notification_cleanup_task(days=90):
    logger.info(f"Starting task: notification_cleanup_task (older than {days} days)")
    cutoff_date = timezone.now() - timedelta(days=days)
    archived_count = 0
    deleted_notifications_count = 0
    deleted_digests_count = 0
    
    try:
        to_archive = WorkflowNotification.objects.filter(
            is_read=True,
            is_archived=False,
            created_at__lt=cutoff_date
        )
        archived_count = to_archive.update(is_archived=True)
        logger.info(f"Archived {archived_count} read notifications older than {days} days.")

        very_old_cutoff = timezone.now() - timedelta(days=days * 2) # e.g., 180 days
        to_delete_notifications = WorkflowNotification.objects.filter(
            is_archived=True,
            created_at__lt=very_old_cutoff
        )
        deleted_notifications_count, _ = to_delete_notifications.delete()
        logger.info(f"Deleted {deleted_notifications_count} archived notifications older than {days * 2} days.")

        old_digests = NotificationDigest.objects.filter(
            created_at__lt=very_old_cutoff 
        )
        deleted_digests_count, _ = old_digests.delete()
        logger.info(f"Deleted {deleted_digests_count} old notification digests.")
    except Exception as e:
        logger.error(f"Error in notification_cleanup_task: {e}", exc_info=True)
        return {'status': 'error', 'message': str(e)}
    
    logger.info("Finished task: notification_cleanup_task.")
    return {
        'status': 'success',
        'archived_count': archived_count,
        'deleted_notifications_count': deleted_notifications_count,
        'deleted_digests_count': deleted_digests_count
    }

@shared_task
def notification_generate_digests_task():
    logger.info("Starting task: notification_generate_digests_task")
    generated_count = 0
    try:
        generated_count = NotificationDigestService.generate_daily_digests() # Assuming daily for now
        # Add logic for weekly/hourly if NotificationSettings support it and are checked by the service
        logger.info(f"Finished task: notification_generate_digests_task. Daily digests generated: {generated_count}.")
    except Exception as e:
        logger.error(f"Error in notification_generate_digests_task: {e}", exc_info=True)
        return {'status': 'error', 'message': str(e)}
    return {'status': 'success', 'daily_digests_generated': generated_count}

@shared_task
def notification_send_digests_task():
    logger.info("Starting task: notification_send_digests_task")
    sent_count = 0
    try:
        sent_count = NotificationDigestService.send_pending_digests()
        logger.info(f"Finished task: notification_send_digests_task. Digests sent: {sent_count}.")
    except Exception as e:
        logger.error(f"Error in notification_send_digests_task: {e}", exc_info=True)
        return {'status': 'error', 'message': str(e)}
    return {'status': 'success', 'digests_sent': sent_count}

@shared_task
def notification_escalate_task():
    logger.info("Starting task: notification_escalate_task")
    escalated_count = 0
    try:
        escalated_count = NotificationEscalationService.check_and_escalate_overdue_notifications()
        logger.info(f"Finished task: notification_escalate_task. Notifications escalated: {escalated_count}.")
    except Exception as e:
        logger.error(f"Error in notification_escalate_task: {e}", exc_info=True)
        return {'status': 'error', 'message': str(e)}
    return {'status': 'success', 'notifications_escalated': escalated_count}


# Re-export all tasks for Celery worker and beat to find easily
__all__ = [
    'check_upcoming_deadlines_and_notify_task',
    'check_overdue_steps_and_notify_task',
    'check_pending_approvals_and_remind_task',
    'notification_cleanup_task',
    'notification_generate_digests_task',
    'notification_send_digests_task',
    'notification_escalate_task',
    # Fiscal tasks re-exported from fiscal_tasks.py
    'generate_fiscal_obligations_task',
    'clean_old_fiscal_obligations_task',
    'check_fiscal_deadlines_task', 
    'generate_weekly_fiscal_report_task',
    'generate_fiscal_obligations_for_organization_task'
]