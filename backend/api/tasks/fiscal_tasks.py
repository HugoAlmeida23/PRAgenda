from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
from ..models import Organization, Task, FiscalObligationDefinition
from ..services.fiscal_obligation_service import FiscalObligationGenerator
from ..services.fiscal_notification_service import FiscalNotificationService
from ..models import FiscalSystemSettings
from django.conf import settings



logger = logging.getLogger(__name__)


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