# your_app/management/commands/generate_fiscal_tasks.py
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from datetime import date, datetime, timedelta
from django.db.models import Q # Ensure Q is imported

# Adjust the import path for your models as necessary.
# This assumes your management command is in app_name/management/commands/
# and models.py is in app_name/models.py
from ...models import Organization, Client, FiscalObligationDefinition, Task, TaskCategory, WorkflowDefinition

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Gera tarefas fiscais para organizações baseadas nas definições de obrigações.'

    months_pt = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    def add_arguments(self, parser):
        parser.add_argument(
            '--organization_id',
            type=str,
            help='ID da Organização para processar (opcional, processa todas se omitido).',
        )
        parser.add_argument(
            '--lookahead_months',
            type=int,
            default=3, # Gerar tarefas para os próximos X meses
            help='Número de meses no futuro para gerar tarefas.'
        )
        parser.add_argument(
            '--force_past_generation_days',
            type=int,
            default=0, # Não gerar para o passado por defeito
            help='Número de dias no passado para forçar a geração (para setup inicial).'
        )

    def get_period_description_and_key(self, definition_name, periodicity, ref_date):
        """Gera descrição e chave do período."""
                
        if periodicity == 'MONTHLY':
            month_name = self.months_pt[ref_date.month - 1]  # Usar self.months_pt
            description = f"{month_name} {ref_date.year}"
            key_suffix = f"{ref_date.year}-M{ref_date.month:02d}"
        elif periodicity == 'QUARTERLY':
            quarter = (ref_date.month - 1) // 3 + 1
            description = f"T{quarter} {ref_date.year}"
            key_suffix = f"{ref_date.year}-Q{quarter}"
        elif periodicity == 'ANNUAL':
            description = f"Ano {ref_date.year}"
            key_suffix = f"{ref_date.year}-A"
        elif periodicity == 'BIANNUAL':
            semester = 1 if ref_date.month <= 6 else 2
            description = f"S{semester} {ref_date.year}"
            key_suffix = f"{ref_date.year}-S{semester}"
        else:
            description = f"{ref_date.strftime('%Y-%m-%d')}"
            key_suffix = ref_date.strftime('%Y%m%d')
        
        simple_obligation_name = "".join(filter(str.isalnum, definition_name)).lower()[:15]
        return description, f"{simple_obligation_name}_{key_suffix}"

    def calculate_deadline(self, definition, period_end_date_for_calc):
        """Calcula o deadline com base na definição e na data de fim do período de referência."""
        base_date_for_offset = period_end_date_for_calc

        if definition.calculation_basis == 'SPECIFIC_DATE' and definition.specific_month_reference:
            year_for_specific_month = period_end_date_for_calc.year
            
            # If the specific month reference is in the past relative to the period_end_date_for_calc's month
            # (e.g., period ends Dec 2023, specific_month is July), assume it's for the following year.
            # This logic might need adjustment based on specific rules (e.g., IES is for year N, due July N+1)
            # A common scenario is that specific_month_reference refers to a month *after* the fiscal period ends.
            # If `period_end_date_for_calc` is Dec 31, 2023, and `specific_month_reference` is July (7),
            # the deadline will be July of 2024.
            # If `specific_month_reference` is January (1), the deadline will be January of 2024.
            
            # The key is: `base_date_for_offset` should be the date from which the `deadline_month_offset` starts.
            # For IES (July for year N): period_end is 31/12/N. base_date_for_offset becomes 01/07/N. Offset then applies.
            # Correction: If specific_month_reference is used, it often means the deadline is in year N+1.
            # The year_for_specific_month should usually be period_end_date_for_calc.year *if* the specific_month_reference
            # itself is not meant to imply the next year directly for the base calculation.
            # The deadline_month_offset will handle pushing it to the next year if needed.

            try:
                # The base_date_for_offset for SPECIFIC_DATE is the 1st of the specific_month_reference
                # in the year of the period_end_date_for_calc. The deadline_month_offset then applies.
                # Example: Mod10 (Jan) for Year 2023 (period_end 31/12/2023).
                # specific_month_reference = 1. base_date_for_offset = 01/01/2023.
                # If deadline_month_offset = 12 (to push to Jan of next year), and deadline_day = 31.
                # Then it becomes 31/01/2024.
                # Simpler: If specific_month_reference is given, form that date in the year of the period end.
                base_date_for_offset = date(period_end_date_for_calc.year, definition.specific_month_reference, 1)

            except ValueError:
                logger.error(f"Mês de referência inválido {definition.specific_month_reference} para obrigação {definition.name}")
                return None

        deadline_month_numeric = base_date_for_offset.month + definition.deadline_month_offset
        deadline_year = base_date_for_offset.year

        # Adjust year if month offset crosses to a new year
        quotient, remainder = divmod(deadline_month_numeric -1, 12)
        deadline_year += quotient
        deadline_month_numeric = remainder + 1
        
        try:
            deadline_dt = date(deadline_year, deadline_month_numeric, definition.deadline_day)
        except ValueError: # Invalid day for month (e.g., 31 in Feb)
            if deadline_month_numeric == 12:
                last_day_dt = date(deadline_year + 1, 1, 1) - timedelta(days=1)
            else:
                last_day_dt = date(deadline_year, deadline_month_numeric + 1, 1) - timedelta(days=1)
            deadline_dt = date(deadline_year, deadline_month_numeric, last_day_dt.day)
            logger.warning(f"Dia {definition.deadline_day} inválido para {deadline_month_numeric}/{deadline_year}, usando último dia: {last_day_dt.day} para obrigação {definition.name}")

        return deadline_dt

    def get_reference_periods_and_deadlines(self, definition, today, lookahead_end_date, force_past_start_date):
        periods = []
        
        # --- REPLACED match...case ---
        if definition.periodicity == 'MONTHLY':
            num_periods_to_check = self.options['lookahead_months'] + (12 if self.options['force_past_generation_days'] > 300 else 3)
        elif definition.periodicity == 'QUARTERLY':
            num_periods_to_check = (self.options['lookahead_months'] // 3) + 2 + (4 if self.options['force_past_generation_days'] > 300 else 1)
        elif definition.periodicity == 'BIANNUAL':
            num_periods_to_check = (self.options['lookahead_months'] // 6) + 2 + (2 if self.options['force_past_generation_days'] > 300 else 1)
        elif definition.periodicity == 'ANNUAL':
            num_periods_to_check = (self.options['lookahead_months'] // 12) + 2 + (1 if self.options['force_past_generation_days'] > 300 else 0)
        else: # Corresponds to 'case _:' or 'OTHER'
            num_periods_to_check = 1
        # --- END OF REPLACEMENT ---

        iteration_start_year = force_past_start_date.year if force_past_start_date else today.year
        iteration_start_month = force_past_start_date.month if force_past_start_date else today.month
        
        current_ref_date = date(iteration_start_year, iteration_start_month, 1) # Default to start of month

        if definition.periodicity == 'MONTHLY':
            # Start from the 1st of the (forced past or current) month
            current_ref_date = date(iteration_start_year, iteration_start_month, 1)
        elif definition.periodicity == 'QUARTERLY':
            current_quarter_start_month = ((iteration_start_month - 1) // 3 * 3) + 1
            current_ref_date = date(iteration_start_year, current_quarter_start_month, 1)
        elif definition.periodicity == 'BIANNUAL':
            current_semester_start_month = 1 if iteration_start_month <=6 else 7
            current_ref_date = date(iteration_start_year, current_semester_start_month, 1)
        elif definition.periodicity == 'ANNUAL':
            # For annual, the reference year is the iteration_start_year
            # The period_end_for_deadline_calc will be set correctly below.
            # current_ref_date here signifies the start of the year for iteration purposes.
            current_ref_date = date(iteration_start_year, 1, 1)
        else: # OTHER
            current_ref_date = today

        for i in range(num_periods_to_check):
            period_start = None
            period_end = None
            period_end_for_deadline_calc = None

            if definition.periodicity == 'MONTHLY':
                period_start = current_ref_date
                period_end = (current_ref_date + relativedelta(months=1)) - relativedelta(days=1)
                period_end_for_deadline_calc = period_end
            elif definition.periodicity == 'QUARTERLY':
                period_start = current_ref_date
                period_end = (current_ref_date + relativedelta(months=3)) - relativedelta(days=1)
                period_end_for_deadline_calc = period_end
            elif definition.periodicity == 'BIANNUAL':
                period_start = current_ref_date
                period_end = (current_ref_date + relativedelta(months=6)) - relativedelta(days=1)
                period_end_for_deadline_calc = period_end
            elif definition.periodicity == 'ANNUAL':
                # The fiscal year itself
                period_start = date(current_ref_date.year, 1, 1)
                period_end = date(current_ref_date.year, 12, 31)
                
                if definition.calculation_basis == 'SPECIFIC_DATE' and definition.specific_month_reference:
                    # The deadline is calculated from a specific month, likely in year N or N+1.
                    # The period this obligation *refers to* is `period_end`.
                    # The `period_end_for_deadline_calc` should be the date from which offset is counted.
                    # This should be the 1st of the specific_month_reference in the year of `period_end`.
                    # The calculate_deadline function will then use this with deadline_month_offset.
                    period_end_for_deadline_calc = date(period_end.year, definition.specific_month_reference, 1)
                else: # Based on the end of the fiscal year
                    period_end_for_deadline_calc = period_end
            else: # OTHER
                period_start = current_ref_date # Assume period starts and ends today for "OTHER"
                period_end = current_ref_date
                period_end_for_deadline_calc = period_end

            if not period_end_for_deadline_calc: continue

            deadline_date = self.calculate_deadline(definition, period_end_for_deadline_calc)
            if not deadline_date: continue

            generation_trigger_date = deadline_date - relativedelta(days=definition.generation_trigger_offset_days)
            
            # Check if the task should be generated:
            # 1. Its deadline is within the processing window (past_forced_start to lookahead_end)
            # 2. The trigger date for generation has passed or is today.
            is_within_lookahead = deadline_date <= lookahead_end_date
            is_within_forced_past = force_past_start_date and deadline_date >= force_past_start_date
            
            if (is_within_lookahead and (is_within_forced_past or deadline_date >= today)) and \
               generation_trigger_date <= today:
                desc, key_suffix = self.get_period_description_and_key(definition.name, definition.periodicity, period_start)
                periods.append((period_start, period_end, deadline_date, desc, key_suffix))

            # Advance current_ref_date for the next iteration
            if definition.periodicity == 'MONTHLY':
                current_ref_date += relativedelta(months=1)
            elif definition.periodicity == 'QUARTERLY':
                current_ref_date += relativedelta(months=3)
            elif definition.periodicity == 'BIANNUAL':
                 current_ref_date += relativedelta(months=6)
            elif definition.periodicity == 'ANNUAL':
                current_ref_date += relativedelta(years=1)
            else: # OTHER - process only once
                break 
            
            if current_ref_date.year > lookahead_end_date.year + 2: # Safety break for very long lookaheads or past
                break
        
        return periods

    def handle(self, *args, **options):
        self.options = options
        organization_id = options['organization_id']
        lookahead_months = options['lookahead_months']
        force_past_days = options['force_past_generation_days']

        today = timezone.now().date()
        lookahead_end_date = today + relativedelta(months=lookahead_months, day=31) # Ensure we cover full months
        force_past_start_date = today - relativedelta(days=force_past_days) if force_past_days > 0 else None

        if organization_id:
            organizations = Organization.objects.filter(id=organization_id, is_active=True)
            if not organizations.exists():
                self.stderr.write(self.style.ERROR(f"Organização com ID {organization_id} não encontrada ou inativa."))
                return
        else:
            organizations = Organization.objects.filter(is_active=True)

        self.stdout.write(f"A processar obrigações fiscais com deadline até {lookahead_end_date.isoformat()}.")
        if force_past_start_date:
            self.stdout.write(f"Também a gerar para o passado com deadline desde {force_past_start_date.isoformat()} devido a --force_past_generation_days.")

        for org in organizations:
            self.stdout.write(self.style.SUCCESS(f"\nProcessando Organização: {org.name}"))
            
            definitions = FiscalObligationDefinition.objects.filter(
                Q(organization=org) | Q(organization__isnull=True),
                is_active=True
            ).prefetch_related('default_task_category', 'default_workflow')


            clients_in_org = Client.objects.filter(organization=org, is_active=True)

            for definition in definitions:
                self.stdout.write(f"  Avaliando obrigação: {definition.name} ({definition.get_periodicity_display()})")

                applicable_clients = []
                if not definition.applies_to_client_tags or 'ALL' in definition.applies_to_client_tags:
                    applicable_clients = list(clients_in_org)
                else:
                    for client in clients_in_org:
                        client_tags = set(client.fiscal_tags or [])
                        required_tags = set(definition.applies_to_client_tags)
                        if required_tags.issubset(client_tags):
                            applicable_clients.append(client)
                
                if not applicable_clients:
                    self.stdout.write(f"    -> Sem clientes aplicáveis para esta definição ({definition.name}) nesta organização.")
                    continue

                reference_periods = self.get_reference_periods_and_deadlines(definition, today, lookahead_end_date, force_past_start_date)

                if not reference_periods:
                    # self.stdout.write(f"    -> Sem períodos de referência válidos para gerar tarefas para {definition.name}.")
                    pass # Continue to next definition if no periods found for this one

                for client in applicable_clients:
                    for period_start, period_end, deadline_date, period_desc, period_key_suffix in reference_periods:
                        
                        # Use a simpler obligation_period_key that doesn't include client/definition UUIDs if not strictly necessary
                        # The uniqueness is enforced by (client, source_fiscal_obligation, obligation_period_key)
                        # So period_key_suffix (e.g., "2024-M01") should be enough for the key part.
                        # The `Task.Meta.unique_together` will handle the rest.
                        task_obligation_period_key = period_key_suffix # Example: "ivq_2024-Q1" from get_period_description_and_key

                        task_title = definition.default_task_title_template.format(
                            obligation_name=definition.name,
                            client_name=client.name,
                            period_description=period_desc,
                            year=period_start.year, 
                            month_name=self.months_pt[period_start.month - 1],
                            quarter=(period_start.month - 1) // 3 + 1
                        )

                        if Task.objects.filter(
                            client=client,
                            source_fiscal_obligation=definition,
                            obligation_period_key=task_obligation_period_key # Use the generated key
                        ).exists():
                            # self.stdout.write(f"    SKIP: Tarefa para {client.name} - {definition.name} ({period_desc}) já existe.")
                            continue

                        try:
                            new_task_data = {
                                'title': task_title,
                                'description': definition.description or f"Cumprir {definition.name} para o período {period_desc}.",
                                'client': client,
                                'category': definition.default_task_category,
                                'status': 'pending',
                                'priority': definition.default_priority,
                                'deadline': datetime.combine(deadline_date, datetime.min.time(), tzinfo=timezone.get_current_timezone()), # Ensure deadline is datetime
                                'created_by': None,
                                'assigned_to': client.account_manager,
                                'workflow': definition.default_workflow,
                                'source_fiscal_obligation': definition,
                                'obligation_period_key': task_obligation_period_key
                            }
                            
                            if definition.default_workflow:
                                first_step = definition.default_workflow.steps.order_by('order').first()
                                if first_step: # Make sure a step exists
                                    new_task_data['current_workflow_step'] = first_step
                            
                            Task.objects.create(**new_task_data)
                            self.stdout.write(self.style.SUCCESS(f"    CRIADA: {client.name} - {task_title} (Deadline: {deadline_date})"))
                        except Exception as e:
                            self.stderr.write(self.style.ERROR(f"    ERRO ao criar tarefa para {client.name} - {definition.name} ({period_desc}): {e}"))
                            logger.error(f"Falha ao criar tarefa fiscal para cliente {client.id}, obrigação {definition.id}, período {period_desc}: {e}", exc_info=True)
        
        self.stdout.write(self.style.SUCCESS("\nProcesso de geração de tarefas fiscais concluído."))