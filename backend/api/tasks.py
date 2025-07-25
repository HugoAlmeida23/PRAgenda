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
from .models import GeneratedReport
from .utils import update_profitability_for_period, update_client_profitability
from dateutil.relativedelta import relativedelta
from .models import Client
from .services.saft_parser import SAFTParser
from .models import SAFTFile
from django.core.files.storage import default_storage
logger = logging.getLogger(__name__)
# In api/tasks.py
from .services.qr_code_parser import QRCodeParser
from .models import ScannedInvoice

# Add this import at the top of tasks.py
from datetime import datetime
import io  # Also needed for process_invoice_file_task

# Replace your existing process_invoice_file_task function with this updated version:
from .qr_processor import EnhancedQRProcessor

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def process_invoice_file_task(self, invoice_id):
    """
    Celery task to process an uploaded invoice file, extract QR code data,
    and handle potential duplicates.
    """
    logger.info(f"Starting invoice processing for ID: {invoice_id}")
    try:
        invoice = ScannedInvoice.objects.get(id=invoice_id)
        invoice.status = 'PROCESSING'
        invoice.save(update_fields=['status'])

        # Read the file content from storage
        if not invoice.original_file:
            raise FileNotFoundError("Original file not associated with the invoice record.")
        
        with default_storage.open(invoice.original_file.name, 'rb') as f:
            file_content = f.read()

        # Process using the enhanced processor
        processor = EnhancedQRProcessor()
        result = processor.process_image(file_content)  # Now properly handles bytes
        
        # Extract the parsed data
        parsed_data = result.get('invoice_data', {})
        processing_log = '\n'.join(result.get('processing_log', []))
        
        # Update processing log first
        invoice.processing_log = processing_log
        
        if not parsed_data or not parsed_data.get('atcud'):
            invoice.status = 'ERROR'
            if not processing_log:
                invoice.processing_log = "Não foi possível encontrar ou ler um QR Code ATCUD válido no ficheiro."
            invoice.save()
            logger.warning(f"No valid ATCUD QR code found for invoice {invoice.id}")
            return {"status": "error", "message": "No valid QR code found."}

        # --- DUPLICATE CHECK LOGIC ---
        atcud_code = parsed_data.get('atcud')
        
        # Check if another invoice in the same organization already has this ATCUD
        existing_invoice = ScannedInvoice.objects.filter(
            batch__organization=invoice.batch.organization,
            atcud=atcud_code,
            status='COMPLETED'  # Only check against successfully completed invoices
        ).exclude(id=invoice.id).first()

        if existing_invoice:
            # Duplicate found! Mark this one as an error and stop.
            invoice.status = 'ERROR'
            invoice.processing_log = f"Fatura duplicada. O ATCUD '{atcud_code}' já existe no sistema (Fatura ID: {existing_invoice.id})."
            invoice.save()
            logger.warning(f"Duplicate invoice detected for ATCUD {atcud_code}. Original: {existing_invoice.id}, New: {invoice.id}")
            return {"status": "duplicate", "invoice_id": invoice.id, "original_invoice_id": existing_invoice.id}
        
        # --- NO DUPLICATE FOUND - PROCEED WITH SAVING ---
        # Map the extracted data to model fields
        if 'nif_emitter' in parsed_data:
            invoice.nif_emitter = parsed_data['nif_emitter']
        if 'nif_acquirer' in parsed_data:
            invoice.nif_acquirer = parsed_data['nif_acquirer']
        if 'country_code' in parsed_data:
            invoice.country_code = parsed_data['country_code']
        if 'doc_type' in parsed_data:
            invoice.doc_type = parsed_data['doc_type']
        if 'doc_date' in parsed_data:
            # Handle date conversion if it's a string
            doc_date = parsed_data['doc_date']
            if isinstance(doc_date, str):
                try:
                    invoice.doc_date = datetime.strptime(doc_date, '%Y-%m-%d').date()
                except ValueError:
                    try:
                        invoice.doc_date = datetime.strptime(doc_date, '%d-%m-%Y').date()
                    except ValueError:
                        logger.warning(f"Could not parse date: {doc_date}")
            else:
                invoice.doc_date = doc_date
        if 'doc_uid' in parsed_data:
            invoice.doc_uid = parsed_data['doc_uid']
        if 'atcud' in parsed_data:
            invoice.atcud = parsed_data['atcud']
        if 'taxable_amount' in parsed_data:
            invoice.taxable_amount = parsed_data['taxable_amount']
        if 'vat_amount' in parsed_data:
            invoice.vat_amount = parsed_data['vat_amount']
        if 'gross_total' in parsed_data:
            invoice.gross_total = parsed_data['gross_total']
        
        # Store raw QR data
        if 'raw_qr_code_data' in parsed_data:
            invoice.raw_qr_code_data = parsed_data['raw_qr_code_data']
        elif result.get('raw_qr_data'):
            invoice.raw_qr_code_data = result['raw_qr_data'][0] if result['raw_qr_data'] else ''
        
        # Set status based on results
        if parsed_data and any(key in parsed_data for key in ['atcud', 'gross_total', 'nif_emitter']):
            invoice.status = 'COMPLETED'
            invoice.processing_log = "Dados extraídos com sucesso do QR Code."
        else:
            invoice.status = 'REVIEW'  # Needs manual review
            invoice.processing_log = "QR Code encontrado mas alguns dados podem precisar de revisão."
        
        invoice.save()
        
        logger.info(f"Finished processing for invoice {invoice_id}. Status: {invoice.status}")

        invoice = ScannedInvoice.objects.get(id=invoice_id)
        if invoice.status == 'COMPLETED':
            try:
                # Step 1: Auto-categorize and create Expense
                category = ExpenseCategorizationService.categorize_from_invoice(invoice)
                client = invoice.batch.organization.clients.filter(nif=invoice.nif_acquirer).first()
                
                Expense.objects.create(
                    organization=invoice.batch.organization,
                    client=client, # Link to client if NIF matches
                    amount=invoice.gross_total,
                    description=f"Fatura de {invoice.original_filename}",
                    category=category,
                    date=invoice.doc_date,
                    is_auto_categorized=True,
                    source_scanned_invoice=invoice
                )
                logger.info(f"Expense created and categorized as '{category}' for invoice {invoice.id}")

                # Step 2: Auto-create a bookkeeping task
                if client:
                    task_title = f"Lançamento Contabilístico - Fatura {invoice.atcud}"
                    task_description = (
                        f"Realizar o lançamento contabilístico da fatura de {invoice.original_filename}.\n"
                        f"Valor: {invoice.gross_total}€\n"
                        f"NIF Emissor: {invoice.nif_emitter}\n"
                        f"Categoria Sugerida: {category}"
                    )
                    
                    # Assign to the client's account manager or a default user
                    assignee = client.account_manager or invoice.batch.uploaded_by

                    Task.objects.create(
                        client=client,
                        title=task_title,
                        description=task_description,
                        assigned_to=assignee,
                        priority=4 # Low priority by default
                    )
                    logger.info(f"Bookkeeping task created for invoice {invoice.id} and client {client.name}")

            except Exception as e:
                logger.error(f"Error in post-processing for invoice {invoice.id}: {e}", exc_info=True)
                # Don't fail the entire task, just log the error. The main invoice data is already saved.
                invoice.processing_log += f"\nErro na automação pós-processamento: {str(e)}"
                invoice.save(update_fields=['processing_log'])
        
        return {"status": "success", "invoice_id": invoice.id}
    except ScannedInvoice.DoesNotExist:
        logger.error(f"Invoice {invoice_id} not found.")
        return {"status": "error", "message": f"Invoice {invoice_id} not found."}
    except Exception as e:
        logger.error(f"Error processing invoice file {invoice_id}: {e}", exc_info=True)
        try:
            invoice = ScannedInvoice.objects.get(id=invoice_id)
            invoice.status = 'ERROR'
            invoice.processing_log = f"Ocorreu um erro inesperado: {str(e)}"
            invoice.save()
        except ScannedInvoice.DoesNotExist:
            pass  # Nothing to do if it's already gone
        self.retry(exc=e)

    
        
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_saft_file_task(self, saft_file_id):
    logger.info(f"TASK STARTED: Processing SAFT file with ID: {saft_file_id}")
    saft_instance = None
    try:
        saft_instance = SAFTFile.objects.get(id=saft_file_id)
        saft_instance.status = 'PROCESSING'
        saft_instance.processing_log = "A iniciar o processamento..."
        saft_instance.save(update_fields=['status', 'processing_log'])

        with default_storage.open(saft_instance.file.name, 'rb') as f:
            parser = SAFTParser(f)
            parsed_data = parser.parse()

        logger.info(f"TASK INFO: Parsed data for {saft_file_id}: {parsed_data}")

        header = parsed_data.get('header', {})
        summary = parsed_data.get('summary', {})
        
        # Safely assign values and handle potential type errors
        saft_instance.fiscal_year = int(header.get('fiscal_year')) if header.get('fiscal_year') else None
        
        start_date_str = header.get('start_date')
        saft_instance.start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        
        end_date_str = header.get('end_date')
        saft_instance.end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None
        
        saft_instance.company_name = header.get('company_name')
        saft_instance.company_tax_id = header.get('company_tax_id')
        saft_instance.summary_data = summary

        saft_instance.status = 'COMPLETED'
        saft_instance.processed_at = timezone.now()
        saft_instance.processing_log = "Ficheiro processado com sucesso."
        
        saft_instance.save()

        logger.info(f"TASK SUCCESS: Successfully processed and saved SAFT file {saft_file_id}")
        
    except SAFTFile.DoesNotExist:
        logger.error(f"TASK FAILED: SAFTFile with id {saft_file_id} does not exist.")
        # No retry needed if the object is gone
        return

    except Exception as e:
        logger.error(f"TASK FAILED: Unhandled exception while processing SAFT file {saft_file_id}: {e}", exc_info=True)
        if saft_instance:
            saft_instance.status = 'ERROR'
            saft_instance.processing_log = f"Ocorreu um erro inesperado: {str(e)}"
            saft_instance.save(update_fields=['status', 'processing_log'])
        
        # Retry the task with exponential backoff
        self.retry(exc=e)

@shared_task(bind=True, max_retries=3)
def generate_report_task(self, report_id):
    """
    Asynchronous task to generate a report, save it to storage,
    and update the GeneratedReport model instance.
    """
    logger.info(f"Starting report generation task for Report ID: {report_id}")
    try:
        # Get the report instance and mark it as in-progress
        report = GeneratedReport.objects.select_related('organization', 'generated_by').get(id=report_id)
        report.status = 'IN_PROGRESS'
        report.save(update_fields=['status'])

        organization = report.organization
        params = report.parameters
        report_format = report.report_format
        
        # --- Call the existing ReportGenerationService ---
        file_buffer, content_type = (None, None)

        if report.report_type == 'client_summary':
            file_buffer, content_type = ReportGenerationService.generate_client_summary_report(
                organization=organization, client_ids=params.get('client_ids'),
                date_from=params.get('date_from'), date_to=params.get('date_to'),
                format_type=report_format
            )
        elif report.report_type == 'profitability_analysis':
            file_buffer, content_type = ReportGenerationService.generate_profitability_analysis_report(
                organization=organization, client_ids=params.get('client_ids'),
                year=params.get('year'), month=params.get('month'),
                format_type=report_format
            )
        # ... Add other report types here ...
        else:
            raise ValueError(f"Report type '{report.report_type}' not implemented for async generation.")

        if not file_buffer:
            raise ValueError("Report generation service returned an empty file buffer.")

        # --- Save the generated file to storage ---
        file_extension = report_format
        filename = f"reports/{organization.id}/{uuid.uuid4()}.{file_extension}"
        
        file_content = ContentFile(file_buffer.getvalue())
        saved_file_path = default_storage.save(filename, file_content)
        storage_url = default_storage.url(saved_file_path)

        # --- Update the report instance with the final details ---
        report.storage_url = storage_url
        report.file_size_kb = len(file_buffer.getvalue()) // 1024
        report.status = 'COMPLETED'
        report.save()

        logger.info(f"Successfully generated and saved report {report_id} to {storage_url}")

        # --- Notify the user who requested the report ---
        if report.generated_by:
            NotificationService.create_notification(
                user=report.generated_by,
                task=None, # Not related to a specific task
                notification_type='report_generated',
                title=f"O seu relatório está pronto: {report.name}",
                message=f"O relatório '{report.name}' que solicitou foi gerado com sucesso e está pronto para download.",
                priority='normal',
                metadata={'report_id': str(report.id), 'download_url': report.storage_url}
            )

        return {"status": "success", "report_id": report_id, "url": storage_url}

    except GeneratedReport.DoesNotExist:
        logger.error(f"Report with ID {report_id} not found for generation task.")
        return {"status": "error", "message": "Report not found"}
    except Exception as e:
        logger.error(f"Failed to generate report {report_id}: {e}", exc_info=True)
        # Update the report status to FAILED
        try:
            report = GeneratedReport.objects.get(id=report_id)
            report.status = 'FAILED'
            # You could also add an error message field to the model
            report.save(update_fields=['status'])
        except GeneratedReport.DoesNotExist:
            pass # Nothing to update if it doesn't exist
        
        # Retry the task with exponential backoff
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


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

@shared_task
def check_client_health_scores_and_notify():
    """
    Calculates health scores and churn risk for all active clients, notifies if risk is high or medium.
    """
    from .services.financial_health_service import FinancialHealthService
    from .models import Client, Profile
    updated_count = 0
    for client in Client.objects.filter(is_active=True):
        score = FinancialHealthService.calculate_for_client(client)
        churn_risk = FinancialHealthService.calculate_churn_risk(client)
        client.financial_health_score = score
        client.churn_risk = churn_risk
        client.save(update_fields=['financial_health_score', 'churn_risk'])
        updated_count += 1
        if churn_risk in ['HIGH', 'MEDIUM']:
            # Prefer account manager, fallback to org admins
            notified = False
            if client.account_manager and client.account_manager.is_active:
                NotificationService.create_notification(
                    user=client.account_manager,
                    task=None,
                    notification_type='client_churn_risk',
                    title=f"Alerta: Risco de churn {churn_risk.lower()} para {client.name}",
                    message=f"O cliente {client.name} apresenta risco {churn_risk.lower()} de churn.",
                    check_existing_recent=True,
                    recent_threshold_hours=24
                )
                notified = True
            if not notified and client.organization:
                org_admins = Profile.objects.filter(organization=client.organization, is_org_admin=True, user__is_active=True)
                for admin in org_admins:
                    NotificationService.create_notification(
                        user=admin.user,
                        task=None,
                        notification_type='client_churn_risk',
                        title=f"Alerta: Risco de churn {churn_risk.lower()} para {client.name}",
                        message=f"O cliente {client.name} apresenta risco {churn_risk.lower()} de churn.",
                        check_existing_recent=True,
                        recent_threshold_hours=24
                    )

@shared_task
def check_compliance_risks_and_notify():
    """
    Checks compliance risks for all active clients and notifies account manager or org admins if high severity risks are found.
    """
    from .services.compliance_monitor_service import ComplianceMonitor
    from .models import Client, Profile
    for client in Client.objects.filter(is_active=True):
        risks = ComplianceMonitor.check_for_client(client)
        for risk in risks:
            if risk.get('severity') == 'high':
                notified = False
                if client.account_manager and client.account_manager.is_active:
                    NotificationService.create_notification(
                        user=client.account_manager,
                        task=None,
                        notification_type='client_compliance_risk',
                        title=risk.get('title', f"Risco de compliance para {client.name}"),
                        message=risk.get('details', ''),
                        check_existing_recent=True,
                        recent_threshold_hours=24
                    )
                    notified = True
                if not notified and client.organization:
                    org_admins = Profile.objects.filter(organization=client.organization, is_org_admin=True, user__is_active=True)
                    for admin in org_admins:
                        NotificationService.create_notification(
                            user=admin.user,
                            task=None,
                            notification_type='client_compliance_risk',
                            title=risk.get('title', f"Risco de compliance para {client.name}"),
                            message=risk.get('details', ''),
                            check_existing_recent=True,
                            recent_threshold_hours=24
                        )

@shared_task
def check_revenue_opportunities_and_notify():
    """
    Identifies revenue opportunities for all active clients and notifies account manager or org admins if found.
    """
    from .services.revenue_service import RevenueService
    from .models import Client, Profile
    for client in Client.objects.filter(is_active=True):
        opportunities = RevenueService.identify_for_client(client)
        for opp in opportunities:
            notified = False
            if client.account_manager and client.account_manager.is_active:
                NotificationService.create_notification(
                    user=client.account_manager,
                    task=None,
                    notification_type='client_revenue_opportunity',
                    title=opp.get('title', f"Oportunidade de receita para {client.name}"),
                    message=opp.get('details', ''),
                    check_existing_recent=True,
                    recent_threshold_hours=24
                )
                notified = True
            if not notified and client.organization:
                org_admins = Profile.objects.filter(organization=client.organization, is_org_admin=True, user__is_active=True)
                for admin in org_admins:
                    NotificationService.create_notification(
                        user=admin.user,
                        task=None,
                        notification_type='client_revenue_opportunity',
                        title=opp.get('title', f"Oportunidade de receita para {client.name}"),
                        message=opp.get('details', ''),
                        check_existing_recent=True,
                        recent_threshold_hours=24
                    )

@shared_task
def send_smart_daily_digest():
    """
    Sends a daily digest notification to each user summarizing all relevant unread notifications from the last 24h.
    """
    from .models import Profile, WorkflowNotification
    from django.utils import timezone
    from datetime import timedelta
    from collections import defaultdict

    since = timezone.now() - timedelta(hours=24)
    for profile in Profile.objects.filter(user__is_active=True):
        user = profile.user
        notifications = WorkflowNotification.objects.filter(
            user=user, is_read=False, created_at__gte=since, is_archived=False
        ).order_by('priority', '-created_at')
        if notifications.exists():
            grouped = defaultdict(list)
            for n in notifications:
                grouped[n.notification_type].append(n)
            summary_lines = []
            for notif_type, notifs in grouped.items():
                count = len(notifs)
                titles = ', '.join([n.title for n in notifs[:3]])
                more = f" (+{count-3} mais)" if count > 3 else ""
                summary_lines.append(f"[{notif_type}] {titles}{more}")
            summary = "\n".join(summary_lines)
            NotificationService.create_notification(
                user=user,
                task=None,
                notification_type='daily_digest',
                title="Resumo Diário de Alertas",
                message=summary,
                check_existing_recent=True,
                recent_threshold_hours=20
            )

@shared_task
def escalate_unread_urgent_notifications():
    """
    Escalates urgent notifications that remain unread for over 24h to org admins (except the original user), with anti-spam logic.
    """
    from .models import WorkflowNotification, Profile
    from django.utils import timezone
    from datetime import timedelta

    threshold = timezone.now() - timedelta(hours=24)
    for notif in WorkflowNotification.objects.filter(priority='urgent', is_read=False, created_at__lt=threshold, is_archived=False):
        user = notif.user
        # Escalate to org admin if not already done
        if hasattr(user, 'profile') and user.profile.organization:
            org_admins = Profile.objects.filter(organization=user.profile.organization, is_org_admin=True, user__is_active=True).exclude(user=user)
            for admin in org_admins:
                NotificationService.create_notification(
                    user=admin.user,
                    task=notif.task,
                    notification_type='escalated_urgent',
                    title=f"Escalado: {notif.title}",
                    message=f"O alerta urgente para {user.username} não foi lido em 24h: {notif.message}",
                    check_existing_recent=True,
                    recent_threshold_hours=24
                )

@shared_task
def detect_anomalies_and_notify():
    """
    Detects anomalies in client metrics (e.g., sudden drop in profit margin, spike in overdue tasks) and notifies account manager or org admins.
    """
    from .models import Client, Profile, ClientProfitability, Task
    from django.utils import timezone
    from datetime import timedelta
    import statistics

    for client in Client.objects.filter(is_active=True):
        # --- Profit Margin Anomaly ---
        profit_margins = list(ClientProfitability.objects.filter(client=client).order_by('-year', '-month').values_list('profit_margin', flat=True)[:12])
        if len(profit_margins) >= 6:
            recent = profit_margins[:3]
            past = profit_margins[3:]
            if past:
                avg_past = statistics.mean(past)
                avg_recent = statistics.mean(recent)
                if avg_past > 0 and avg_recent < avg_past * 0.7:  # >30% drop
                    message = f"A margem de lucro média caiu de {avg_past:.1f}% para {avg_recent:.1f}% nos últimos meses para o cliente {client.name}."
                    notified = False
                    if client.account_manager and client.account_manager.is_active:
                        NotificationService.create_notification(
                            user=client.account_manager,
                            task=None,
                            notification_type='client_anomaly_detected',
                            title=f"Alerta preditivo: Queda de margem de lucro em {client.name}",
                            message=message,
                            check_existing_recent=True,
                            recent_threshold_hours=24
                        )
                        notified = True
                    if not notified and client.organization:
                        org_admins = Profile.objects.filter(organization=client.organization, is_org_admin=True, user__is_active=True)
                        for admin in org_admins:
                            NotificationService.create_notification(
                                user=admin.user,
                                task=None,
                                notification_type='client_anomaly_detected',
                                title=f"Alerta preditivo: Queda de margem de lucro em {client.name}",
                                message=message,
                                check_existing_recent=True,
                                recent_threshold_hours=24
                            )
        # --- Overdue Tasks Spike ---
        now = timezone.now()
        overdue_counts = []
        for weeks_ago in range(1, 5):
            week_start = now - timedelta(weeks=weeks_ago)
            week_end = week_start + timedelta(days=7)
            count = Task.objects.filter(
                client=client,
                status__in=['pending', 'in_progress'],
                deadline__lt=week_end,
                deadline__gte=week_start
            ).count()
            overdue_counts.append(count)
        if len(overdue_counts) >= 3:
            avg_past = statistics.mean(overdue_counts[1:])
            recent = overdue_counts[0]
            if avg_past > 0 and recent > avg_past * 2:  # Spike: more than double
                message = f"O número de tarefas atrasadas para {client.name} subiu de média {avg_past:.1f} para {recent} na última semana."
                notified = False
                if client.account_manager and client.account_manager.is_active:
                    NotificationService.create_notification(
                        user=client.account_manager,
                        task=None,
                        notification_type='client_anomaly_detected',
                        title=f"Alerta preditivo: Pico de tarefas atrasadas em {client.name}",
                        message=message,
                        check_existing_recent=True,
                        recent_threshold_hours=24
                    )
                    notified = True
                if not notified and client.organization:
                    org_admins = Profile.objects.filter(organization=client.organization, is_org_admin=True, user__is_active=True)
                    for admin in org_admins:
                        NotificationService.create_notification(
                            user=admin.user,
                            task=None,
                            notification_type='client_anomaly_detected',
                            title=f"Alerta preditivo: Pico de tarefas atrasadas em {client.name}",
                            message=message,
                            check_existing_recent=True,
                            recent_threshold_hours=24
                        )

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
    'generate_fiscal_obligations_for_organization_task',
    'check_client_health_scores_and_notify',
    'check_compliance_risks_and_notify',
    'check_revenue_opportunities_and_notify',
    'send_smart_daily_digest',
    'escalate_unread_urgent_notifications',
    'detect_anomalies_and_notify'
]