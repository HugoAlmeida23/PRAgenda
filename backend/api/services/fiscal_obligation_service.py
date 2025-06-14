# services/fiscal_obligation_generator.py
from django.utils import timezone
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.db.models import Q
import logging
from typing import List, Dict, Any, Optional
from calendar import monthrange

from ..models import (
    FiscalObligationDefinition, 
    Task, 
    Client, 
    Profile,
    Organization,
    WorkflowHistory
)
from .notification_service import NotificationService

logger = logging.getLogger(__name__)


class FiscalObligationGenerator:
    """
    Serviço responsável por gerar automaticamente tarefas de obrigações fiscais
    baseadas nas definições criadas e nas tags dos clientes.
    """
    
    @classmethod
    def generate_obligations_for_period(cls, year: int, month: int, organization: Optional[Organization] = None) -> Dict[str, Any]:
        """
        Gera obrigações para um período específico.
        
        Args:
            year: Ano para gerar obrigações
            month: Mês para gerar obrigações
            organization: Organização específica (None para todas)
        
        Returns:
            Dict com estatísticas da geração
        """
        logger.info(f"Iniciando geração de obrigações para {month:02d}/{year} - Org: {organization.name if organization else 'Todas'}")
        
        stats = {
            'period': f"{month:02d}/{year}",
            'organization': organization.name if organization else 'Todas',
            'definitions_processed': 0,
            'clients_processed': 0,
            'tasks_created': 0,
            'tasks_skipped': 0,
            'errors': []
        }
        
        try:
            # Buscar definições ativas
            definitions_query = FiscalObligationDefinition.objects.filter(is_active=True)
            if organization:
                # Incluir definições globais (sem organização) e da organização específica
                definitions_query = definitions_query.filter(
                    Q(organization__isnull=True) | Q(organization=organization)
                )
            
            definitions = definitions_query.select_related('default_task_category', 'default_workflow')
            
            for definition in definitions:
                stats['definitions_processed'] += 1
                
                try:
                    # Verificar se a definição se aplica a este período
                    if not cls._should_generate_for_period(definition, year, month):
                        logger.debug(f"Definição {definition.name} não se aplica ao período {month:02d}/{year}")
                        continue
                    
                    # Buscar clientes elegíveis
                    eligible_clients = cls._get_eligible_clients(definition, organization)
                    
                    for client in eligible_clients:
                        stats['clients_processed'] += 1
                        
                        try:
                            # Calcular deadline e verificar se deve gerar
                            deadline_info = cls._calculate_deadline(definition, year, month)
                            if not deadline_info:
                                stats['tasks_skipped'] += 1
                                continue
                            
                            # Verificar se já existe tarefa para este período
                            period_key = cls._generate_period_key(definition, year, month)
                            existing_task = Task.objects.filter(
                                client=client,
                                source_fiscal_obligation=definition,
                                obligation_period_key=period_key
                            ).first()
                            
                            if existing_task:
                                logger.debug(f"Tarefa já existe para {client.name} - {definition.name} - {period_key}")
                                stats['tasks_skipped'] += 1
                                continue
                            
                            # Verificar se está dentro do período de geração
                            if not cls._should_generate_now(deadline_info['deadline'], definition.generation_trigger_offset_days):
                                stats['tasks_skipped'] += 1
                                continue
                            
                            # Criar a tarefa
                            task = cls._create_obligation_task(
                                definition=definition,
                                client=client,
                                deadline_info=deadline_info,
                                period_key=period_key,
                                year=year,
                                month=month
                            )
                            
                            if task:
                                stats['tasks_created'] += 1
                                logger.info(f"Tarefa criada: {task.title} para {client.name}")
                                
                                # Notificar se aplicável
                                try:
                                    cls._notify_task_creation(task, definition)
                                except Exception as e:
                                    logger.error(f"Erro ao notificar criação da tarefa {task.id}: {e}")
                            
                        except Exception as e:
                            error_msg = f"Erro ao processar cliente {client.name} para definição {definition.name}: {e}"
                            logger.error(error_msg)
                            stats['errors'].append(error_msg)
                            
                except Exception as e:
                    error_msg = f"Erro ao processar definição {definition.name}: {e}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)
            
            logger.info(f"Geração concluída: {stats['tasks_created']} tarefas criadas, {stats['tasks_skipped']} ignoradas")
            
        except Exception as e:
            error_msg = f"Erro geral na geração de obrigações: {e}"
            logger.error(error_msg)
            stats['errors'].append(error_msg)
        
        return stats
    
    @classmethod
    def generate_for_current_period(cls, organization: Optional[Organization] = None) -> Dict[str, Any]:
        """Gera obrigações para o período atual."""
        now = timezone.now()
        return cls.generate_obligations_for_period(now.year, now.month, organization)
    
    @classmethod
    def generate_for_next_months(cls, months_ahead: int = 3, organization: Optional[Organization] = None) -> List[Dict[str, Any]]:
        """
        Gera obrigações para os próximos N meses.
        
        Args:
            months_ahead: Quantidade de meses futuros para gerar
            organization: Organização específica
        
        Returns:
            Lista com estatísticas de cada mês processado
        """
        results = []
        now = timezone.now()
        
        for i in range(months_ahead + 1):  # +1 para incluir o mês atual
            target_date = now + relativedelta(months=i)
            result = cls.generate_obligations_for_period(target_date.year, target_date.month, organization)
            results.append(result)
        
        return results
    
    @classmethod
    def _should_generate_for_period(cls, definition: FiscalObligationDefinition, year: int, month: int) -> bool:
        """
        Verifica se uma definição deve gerar obrigação para o período (mês/ano) de geração.
        'year' and 'month' here are the target generation period (e.g., when the cron job runs for).
        The deadline calculation will look at reference periods based on this.
        """
        
        if definition.periodicity == 'MONTHLY':
            return True
        
        elif definition.periodicity == 'QUARTERLY':
            # Example: If we are in April (month=4), this is Q2.
            # A quarterly obligation might have its deadline in April, referring to Q1.
            # This function checks if the definition *could* have a task generated *during* this month.
            # The actual deadline calculation then determines the reference period.
            # For QUARTERLY, it means a task related to a quarter *could* be generated every month,
            # but the deadline calc & trigger offset will filter it.
            # A more precise check: a quarterly task is typically due in the month *after* the quarter ends.
            # e.g., Q1 (Jan-Mar) due in April. Q2 (Apr-Jun) due in July.
            # So, we should consider generating if 'month' is 1 (for Q4 prev year), 4 (for Q1), 7 (for Q2), 10 (for Q3).
            # These are the months when deadlines for quarterly tasks typically fall.
            return month in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] # Let deadline calculation handle specifics for now
                                                               # Or, more strictly:
                                                               # return month in [1, 4, 7, 10] # Typical months when quarterly payments/declarations are due.


        elif definition.periodicity == 'ANNUAL':
            # For annual obligations, they are generally considered once a year.
            # If specific_month_reference is set (e.g., IES in July for previous year),
            # this means the task generation cycle should consider it when 'month' is July.
            if definition.calculation_basis == 'SPECIFIC_DATE' and definition.specific_month_reference:
                # The task for an annual obligation with a specific reference month (e.g. IES due July for year N)
                # should be considered for generation when the current processing month aligns with that reference,
                # or more commonly, when the current processing month is when its *deadline* typically falls.
                # Let's assume `specific_month_reference` is the month the DEADLINE is in, or related to it.
                # Example: IES for year 2023 (ends Dec 2023) is due July 2024.
                # If specific_month_reference is 7 (July), we should check it when 'month' is 7.
                # The current logic of `_calculate_deadline` for ANNUAL + SPECIFIC_DATE + specific_month_reference
                # uses `year` (the processing year) and `definition.specific_month_reference`.
                # `ref_date = datetime(year, definition.specific_month_reference, 1)`
                # `deadline_date = ref_date + relativedelta(months=definition.deadline_month_offset)`
                # So, if we are processing for July (month=7), and IES has specific_month_reference=7, offset=0, day=15,
                # it would calculate deadline as July 15th of the processing year. This is correct if IES for *current year* is due.
                # If IES for *previous year* is due (e.g. processing July 2024 for IES of year 2023),
                # the `_calculate_deadline` needs to be robust to this.
                # The `_should_generate_for_period` should return true if this definition *might* have a deadline in the current processing `month`.
                # This is hard to determine without calculating the deadline.
                # For simplicity here: an ANNUAL task is considered for generation *every month*,
                # and the `_calculate_deadline` + `_should_generate_now` will filter it.
                return True # Let deadline calc and trigger offset handle it.
            else: # Annual, end of period (e.g. Mod22 for year N, due May N+1)
                return True # Consider it every month.

        elif definition.periodicity == 'BIANNUAL':
            # Similar to QUARTERLY, consider it every month and let deadline logic filter.
            # Or more strictly: return month in [1, 7] (typical months for bi-annual deadlines)
            return True

        elif definition.periodicity == 'OTHER':
            # NEW LOGIC: Use custom_rule_trigger_month
            if definition.custom_rule_trigger_month:
                return month == definition.custom_rule_trigger_month
            else:
                # If 'OTHER' has no custom_rule_trigger_month, it won't be generated by this rule.
                # You might want a fallback or to log a warning for misconfigured 'OTHER' types.
                logger.warning(f"Definição '{definition.name}' com periodicidade 'Outra' não tem 'Mês de Gatilho' configurado. Não será gerada.")
                return False
        
        return False # Should not be reached if all periodicities are handled
    
    @classmethod
    def _get_eligible_clients(cls, definition: FiscalObligationDefinition, organization: Optional[Organization] = None) -> List[Client]:
        """
        Busca clientes elegíveis para uma definição fiscal.
        """
        # Filtro base: clientes ativos
        clients_query = Client.objects.filter(is_active=True)
        
        # Filtro por organização
        if organization:
            clients_query = clients_query.filter(organization=organization)
        elif definition.organization:
            clients_query = clients_query.filter(organization=definition.organization)
        
        if definition.applies_to_client_tags:
            if not definition.applies_to_client_tags or 'ALL' in definition.applies_to_client_tags:
                # If 'ALL' is present or list is empty, it applies to all clients within the organization scope.
                return list(clients_query.select_related('organization', 'account_manager'))
            
            eligible_clients = []
            # Pre-fetch fiscal_tags if it becomes a performance issue, though JSONField is generally okay for moderate use.
            for client in clients_query.select_related('organization', 'account_manager'):
                client_tags = client.fiscal_tags or [] # Ensure it's a list
                # Check if *any* of the definition's required tags are present in the client's tags.
                # Or should it be *all* required tags? The help text "Lista de tags que o cliente DEVE ter"
                # implies an AND condition (client must have ALL listed tags).
                # Current logic is OR (client must have AT LEAST ONE of the listed tags).
                # Let's assume it's "client must have ALL tags from applies_to_client_tags"
                if all(tag in client_tags for tag in definition.applies_to_client_tags):
                    eligible_clients.append(client)
            
            return eligible_clients
        
        # No tags specified on definition, applies to all clients in scope
        return list(clients_query.select_related('organization', 'account_manager'))
    
    @classmethod
    def _calculate_deadline(cls, definition: FiscalObligationDefinition, year: int, month: int) -> Optional[Dict[str, Any]]:
        """
        Calcula o deadline para uma obrigação.
        'year' e 'month' são o período de GERAÇÃO (e.g. cron job run date).
        O período de REFERÊNCIA da obrigação é calculado internamente.
        """
        try:
            reference_period_start_date = None # Start of the period the obligation refers to
            # period_description will describe this reference_period_start_date
            
            # --- Determine reference_period_start_date based on periodicity and current generation month/year ---
            if definition.periodicity == 'MONTHLY':
                # Refers to the previous month from the generation month.
                reference_period_start_date = (datetime(year, month, 1) - relativedelta(months=1)).replace(day=1)
            elif definition.periodicity == 'QUARTERLY':
                # Refers to the quarter that ended *before* the start of the current generation quarter.
                # Example: if generating in April (Q2), ref is Q1 (Jan-Mar).
                current_gen_month_date = datetime(year, month, 1)
                current_quarter_start_month = ((current_gen_month_date.month - 1) // 3 * 3) + 1
                # The reference quarter ends just before this current_quarter_start_month
                reference_quarter_end_date = current_gen_month_date.replace(month=current_quarter_start_month, day=1) - relativedelta(days=1)
                reference_period_start_date = (reference_quarter_end_date - relativedelta(months=2)).replace(day=1) # Start of that reference quarter
            elif definition.periodicity == 'ANNUAL':
                # Typically refers to the previous calendar year if calculation_basis is END_OF_PERIOD
                # Or, if calculation_basis is SPECIFIC_DATE, it refers to the 'year' of generation or year-1.
                if definition.calculation_basis == 'SPECIFIC_DATE' and definition.specific_month_reference:
                    # Example: IES for year N (ref period is Jan 1 N to Dec 31 N) due in July N+1.
                    # If we are in July YYYY (year=YYYY, month=7), specific_month_reference=7.
                    # The obligation is for year YYYY-1.
                    # So, reference_period_start_date should be Jan 1 of (year - 1)
                    reference_period_start_date = datetime(year -1 , 1, 1) # Default to previous year for annual specific date
                                                                        # This needs careful thought. If IES for 2023 is due July 2024,
                                                                        # when processing July 2024 (year=2024, month=7), ref period is 2023.
                else: # END_OF_PERIOD for ANNUAL
                    reference_period_start_date = datetime(year - 1, 1, 1)
            elif definition.periodicity == 'BIANNUAL':
                # Refers to the semester that ended *before* the current generation semester.
                current_gen_month_date = datetime(year, month, 1)
                is_first_half_generation = current_gen_month_date.month <= 6
                if is_first_half_generation: # Gen in H1, ref is H2 of prev year
                    reference_period_start_date = datetime(year - 1, 7, 1)
                else: # Gen in H2, ref is H1 of current year
                    reference_period_start_date = datetime(year, 1, 1)
            elif definition.periodicity == 'OTHER':
                if definition.custom_rule_trigger_month:
                    # For 'OTHER', the reference period might be the year of the trigger month, or year-1.
                    # Let's assume it refers to the calendar year containing the trigger month, or previous year
                    # if the trigger month is early in the year for a late-year obligation.
                    # This is complex. A simpler 'OTHER' might assume the reference period is the current year of generation.
                    # For IRS (trigger June for year N-1), IES (trigger July for year N-1).
                    # So, if month == custom_rule_trigger_month, the reference year is (year -1)
                    reference_period_start_date = datetime(year -1, 1, 1) # Assume 'OTHER' triggered in M refers to Y-1
                else:
                    return None # Cannot determine reference for OTHER without trigger month

            if not reference_period_start_date:
                logger.warning(f"Could not determine reference_period_start_date for {definition.name} ({definition.periodicity}) in {month}/{year}")
                return None

            # --- Calculate period_end_for_deadline_calc from reference_period_start_date ---
            # This is the date from which deadline_day and deadline_month_offset are applied.
            period_end_for_deadline_calc = None
            period_description = ""

            if definition.calculation_basis == 'END_OF_PERIOD':
                if definition.periodicity == 'MONTHLY':
                    period_end_for_deadline_calc = reference_period_start_date + relativedelta(months=1) - relativedelta(days=1)
                    period_description = f"{reference_period_start_date.strftime('%B %Y')}"
                elif definition.periodicity == 'QUARTERLY':
                    period_end_for_deadline_calc = reference_period_start_date + relativedelta(months=3) - relativedelta(days=1)
                    quarter_num = (reference_period_start_date.month - 1) // 3 + 1
                    period_description = f"{quarter_num}º Trimestre {reference_period_start_date.year}"
                elif definition.periodicity == 'ANNUAL':
                    period_end_for_deadline_calc = reference_period_start_date + relativedelta(years=1) - relativedelta(days=1)
                    period_description = f"Ano {reference_period_start_date.year}"
                elif definition.periodicity == 'BIANNUAL':
                    period_end_for_deadline_calc = reference_period_start_date + relativedelta(months=6) - relativedelta(days=1)
                    semester_num = 1 if reference_period_start_date.month <=6 else 2
                    period_description = f"{semester_num}º Semestre {reference_period_start_date.year}"
                elif definition.periodicity == 'OTHER': # For OTHER, END_OF_PERIOD might mean end of custom_rule_trigger_month of ref year
                    if definition.custom_rule_trigger_month:
                        # Assume end of the custom_rule_trigger_month in the reference year
                        ref_year_of_trigger = reference_period_start_date.year # Since OTHER refers to Y-1
                        # If custom_rule_trigger_month is late (e.g. Dec) for something due early next year.
                        # This needs careful definition. For simplicity, assume it's the trigger month of *current generation year*.
                        # This part is tricky. Let's assume for OTHER, calculation_basis 'END_OF_PERIOD'
                        # means end of the trigger month in the *year of generation*.
                        # NO, this is wrong. period_end_for_deadline_calc must be based on reference_period_start_date.
                        # If 'OTHER' refers to year Y-1, and trigger is June Y, basis END_OF_PERIOD
                        # should be relative to Y-1. This implies OTHER + END_OF_PERIOD is unusual.
                        # Let's assume OTHER + END_OF_PERIOD uses the end of the reference_period_start_date's year.
                        period_end_for_deadline_calc = datetime(reference_period_start_date.year, 12, 31)
                        period_description = f"Ref. {definition.custom_rule_trigger_month}/{reference_period_start_date.year}"
                    else: return None
            
            elif definition.calculation_basis == 'SPECIFIC_DATE':
                # The deadline is based on a specific month/day, often in the year *following* the reference period for annual.
                # `specific_month_reference` or `custom_rule_trigger_month` indicates this target month.
                # The `deadline_month_offset` then applies from the 1st of this target month.
                
                target_month_for_basis = None
                base_year_for_specific_date = None

                if definition.periodicity == 'ANNUAL' and definition.specific_month_reference:
                    target_month_for_basis = definition.specific_month_reference
                    # For annual, specific_month_reference usually implies the deadline year.
                    # If ref period is 2023, and specific_month_reference is July (7),
                    # this July is in 2024. So, base_year is ref_period_start_date.year + 1.
                    base_year_for_specific_date = reference_period_start_date.year + 1
                    period_description = f"Ano {reference_period_start_date.year}"
                elif definition.periodicity == 'OTHER' and definition.custom_rule_trigger_month:
                    target_month_for_basis = definition.custom_rule_trigger_month
                    # For OTHER, if trigger is June for Year Y-1, this June is in Year Y.
                    base_year_for_specific_date = reference_period_start_date.year + 1 # e.g. IRS for 2023, trigger June 2024
                    period_description = f"Ref. {definition.name} {reference_period_start_date.year}"
                else:
                    # This case (SPECIFIC_DATE without specific_month_reference for ANNUAL or custom_rule_trigger_month for OTHER)
                    # is underspecified for calculating the base date.
                    logger.warning(f"Definição '{definition.name}' é SPECIFIC_DATE mas falta specific_month_reference (para Anual) ou custom_rule_trigger_month (para Outra).")
                    return None

                period_end_for_deadline_calc = datetime(base_year_for_specific_date, target_month_for_basis, 1)


            if not period_end_for_deadline_calc:
                logger.warning(f"Could not determine period_end_for_deadline_calc for {definition.name}")
                return None

            # Calculate the final deadline date
            # The deadline_month_offset is from the period_end_for_deadline_calc
            deadline_date_intermediate = period_end_for_deadline_calc + relativedelta(months=definition.deadline_month_offset)
            
            # Adjust to the specific day, ensuring it's valid for the month
            try:
                final_deadline_day = min(definition.deadline_day, monthrange(deadline_date_intermediate.year, deadline_date_intermediate.month)[1])
                final_deadline = deadline_date_intermediate.replace(day=final_deadline_day)
            except ValueError: # Should be caught by min with monthrange
                 logger.error(f"Internal error calculating deadline day for {definition.name}")
                 return None

            return {
                'deadline': final_deadline.date(),
                'period_description': period_description,
                'reference_period_start': reference_period_start_date.date() 
            }
            
        except Exception as e:
            logger.error(f"Erro ao calcular deadline para {definition.name} (Gen: {month}/{year}): {e}", exc_info=True)
        
        return None
    
    @classmethod
    def _should_generate_now(cls, deadline_date, trigger_offset_days: int) -> bool:
        """
        Verifica se a tarefa deve ser gerada agora baseada no offset de antecedência.
        """
        today = timezone.now().date()
        trigger_date = deadline_date - timedelta(days=trigger_offset_days)
        
        # Gera se hoje >= data de gatilho e deadline ainda não passou
        return trigger_date <= today <= deadline_date
    
    @classmethod
    def _generate_period_key(cls, definition: FiscalObligationDefinition, year: int, month: int) -> str:
        """
        Gera uma chave única para o período da obrigação.
        """
        if definition.periodicity == 'MONTHLY':
            return f"{year}-M{month:02d}"
        elif definition.periodicity == 'QUARTERLY':
            quarter = (month - 1) // 3 + 1
            return f"{year}-Q{quarter}"
        elif definition.periodicity == 'ANNUAL':
            return f"{year}-ANNUAL"
        elif definition.periodicity == 'BIANNUAL':
            semester = 1 if month <= 6 else 2
            return f"{year}-S{semester}"
        else:
            return f"{year}-{month:02d}-OTHER"
    
    @classmethod
    @transaction.atomic
    def _create_obligation_task(
        cls, 
        definition: FiscalObligationDefinition,
        client: Client,
        deadline_info: Dict[str, Any],
        period_key: str,
        year: int,
        month: int
    ) -> Optional[Task]:
        """
        Cria uma tarefa de obrigação fiscal.
        """
        try:
            # Gerar título da tarefa usando o template
            task_title = cls._generate_task_title(
                definition, client, deadline_info, year, month
            )
            
            # Descrição da tarefa
            task_description = cls._generate_task_description(
                definition, client, deadline_info, period_key
            )
            
            # Determinar quem será atribuído
            assigned_to = client.account_manager  # Usar gestor de conta do cliente
            
            # Criar a tarefa
            task = Task.objects.create(
                title=task_title,
                description=task_description,
                client=client,
                category=definition.default_task_category,
                assigned_to=assigned_to,
                status='pending',
                priority=definition.default_priority,
                deadline=deadline_info['deadline'],
                source_fiscal_obligation=definition,
                obligation_period_key=period_key,
                created_by=None  # Sistema automático
            )
            
            # Atribuir workflow se definido
            if definition.default_workflow and definition.default_workflow.is_active:
                first_step = definition.default_workflow.steps.order_by('order').first()
                if first_step:
                    task.workflow = definition.default_workflow
                    task.current_workflow_step = first_step
                    task.save(update_fields=['workflow', 'current_workflow_step'])
                    
                    # Registrar no histórico
                    WorkflowHistory.objects.create(
                        task=task,
                        from_step=None,
                        to_step=first_step,
                        changed_by=None,  # Sistema
                        action='workflow_assigned',
                        comment=f"Workflow '{definition.default_workflow.name}' atribuído automaticamente pela obrigação fiscal '{definition.name}'"
                    )
            
            logger.info(f"Tarefa criada: {task.title} (ID: {task.id}) para {client.name}")
            return task
            
        except Exception as e:
            logger.error(f"Erro ao criar tarefa para {definition.name} - {client.name}: {e}")
            return None
    
    @classmethod
    def _generate_task_title(
        cls, 
        definition: FiscalObligationDefinition,
        client: Client,
        deadline_info: Dict[str, Any],
        year: int,
        month: int
    ) -> str:
        """
        Gera o título da tarefa usando o template da definição.
        """
        template = definition.default_task_title_template
        
        # Variáveis disponíveis para substituição
        context = {
            'obligation_name': definition.name,
            'client_name': client.name,
            'period_description': deadline_info['period_description'],
            'year': str(year),
            'month': str(month).zfill(2),
            'month_name': datetime(year, month, 1).strftime('%B'),
            'quarter': f"Q{(month - 1) // 3 + 1}",
            'deadline': deadline_info['deadline'].strftime('%d/%m/%Y'),
            'reference_year': deadline_info['reference_period_start'].year,
            'reference_month_name': deadline_info['reference_period_start'].strftime('%B')
        }
        
        try:
            return template.format(**context)
        except KeyError as e:
            logger.warning(f"Variável {e} não encontrada no template. Usando título padrão.")
            return f"{definition.name} - {client.name} - {deadline_info['period_description']}"
    
    @classmethod
    def _generate_task_description(
        cls,
        definition: FiscalObligationDefinition,
        client: Client,
        deadline_info: Dict[str, Any],
        period_key: str
    ) -> str:
        """
        Gera a descrição da tarefa.
        """
        description_parts = []
        
        if definition.description:
            description_parts.append(definition.description)
        
        description_parts.extend([
            f"**Cliente:** {client.name}",
            f"**Período de Referência:** {deadline_info['period_description']}",
            f"**Prazo:** {deadline_info['deadline'].strftime('%d/%m/%Y')}",
            f"**Periodicidade:** {definition.get_periodicity_display()}",
            f"**Chave do Período:** {period_key}"
        ])
        
        if client.fiscal_tags:
            tags_str = ", ".join(client.fiscal_tags)
            description_parts.append(f"**Tags Fiscais do Cliente:** {tags_str}")
        
        description_parts.append("---")
        description_parts.append("Esta tarefa foi gerada automaticamente pelo sistema de obrigações fiscais.")
        
        return "\n\n".join(description_parts)
    
    @classmethod
    def _notify_task_creation(cls, task: Task, definition: FiscalObligationDefinition):
        """
        Envia notificações sobre a criação da tarefa.
        """
        if not task.assigned_to:
            return
        
        try:
            # Notificar o responsável
            NotificationService.create_notification(
                user=task.assigned_to,
                task=task,
                workflow_step=task.current_workflow_step,
                notification_type='workflow_assigned' if task.workflow else 'step_ready',
                title=f"Nova obrigação fiscal: {definition.name}",
                message=f"Uma nova tarefa de obrigação fiscal foi criada para o cliente {task.client.name}. Prazo: {task.deadline.strftime('%d/%m/%Y')}",
                priority='normal'
            )
            
            # Notificar admin da organização se configurado
            if task.client.organization:
                org_admins = Profile.objects.filter(
                    organization=task.client.organization,
                    is_org_admin=True,
                    user__is_active=True
                ).exclude(user=task.assigned_to)
                
                for admin_profile in org_admins:
                    NotificationService.create_notification(
                        user=admin_profile.user,
                        task=task,
                        workflow_step=None,
                        notification_type='manual_reminder',
                        title=f"Nova obrigação fiscal gerada: {definition.name}",
                        message=f"Sistema gerou automaticamente uma tarefa de {definition.name} para {task.client.name}, atribuída a {task.assigned_to.username if task.assigned_to else 'Não atribuído'}.",
                        priority='low'
                    )
            
        except Exception as e:
            logger.error(f"Erro ao notificar criação da tarefa {task.id}: {e}")
    
    @classmethod
    def clean_old_pending_obligations(cls, days_old: int = 30, organization: Optional[Organization] = None):
        """
        Remove obrigações pendentes muito antigas (possivelmente obsoletas).
        
        Args:
            days_old: Idade em dias para considerar obsoleta
            organization: Organização específica ou None para todas
        """
        cutoff_date = timezone.now().date() - timedelta(days=days_old)
        
        query = Task.objects.filter(
            source_fiscal_obligation__isnull=False,
            status='pending',
            deadline__lt=cutoff_date
        )
        
        if organization:
            query = query.filter(client__organization=organization)
        
        obsolete_tasks = query.select_related('client', 'source_fiscal_obligation')
        count = obsolete_tasks.count()
        
        if count > 0:
            logger.info(f"Removendo {count} tarefas obsoletas de obrigações fiscais")
            
            # Notificar responsáveis antes de remover
            for task in obsolete_tasks[:50]:  # Limitar notificações
                if task.assigned_to:
                    try:
                        NotificationService.create_notification(
                            user=task.assigned_to,
                            task=task,
                            workflow_step=None,
                            notification_type='manual_reminder',
                            title=f"Tarefa obsoleta removida: {task.title}",
                            message=f"A tarefa '{task.title}' foi removida automaticamente por estar {days_old} dias em atraso. Verifique se ainda é necessária.",
                            priority='low'
                        )
                    except Exception as e:
                        logger.error(f"Erro ao notificar remoção da tarefa {task.id}: {e}")
            
            # Remover as tarefas
            obsolete_tasks.delete()
            
        return count
    
    @classmethod
    def get_generation_stats(cls, organization: Optional[Organization] = None) -> Dict[str, Any]:
        """
        Retorna estatísticas sobre a geração de obrigações.
        """
        base_query = Task.objects.filter(source_fiscal_obligation__isnull=False)
        
        if organization:
            base_query = base_query.filter(client__organization=organization)
        
        # Estatísticas gerais
        total_generated = base_query.count()
        pending = base_query.filter(status='pending').count()
        completed = base_query.filter(status='completed').count()
        overdue = base_query.filter(
            deadline__lt=timezone.now().date(),
            status__in=['pending', 'in_progress']
        ).count()
        
        # Por definição
        by_definition = {}
        definitions = FiscalObligationDefinition.objects.filter(is_active=True)
        if organization:
            definitions = definitions.filter(
                Q(organization__isnull=True) | Q(organization=organization)
            )
        
        for definition in definitions:
            def_tasks = base_query.filter(source_fiscal_obligation=definition)
            by_definition[definition.name] = {
                'total': def_tasks.count(),
                'pending': def_tasks.filter(status='pending').count(),
                'completed': def_tasks.filter(status='completed').count()
            }
        
        # Por mês (últimos 6 meses)
        by_month = {}
        for i in range(6):
            target_date = timezone.now() - relativedelta(months=i)
            month_tasks = base_query.filter(
                created_at__year=target_date.year,
                created_at__month=target_date.month
            ).count()
            month_key = target_date.strftime('%Y-%m')
            by_month[month_key] = month_tasks
        
        return {
            'total_generated': total_generated,
            'pending': pending,
            'completed': completed,
            'overdue': overdue,
            'completion_rate': (completed / total_generated * 100) if total_generated > 0 else 0,
            'by_definition': by_definition,
            'by_month': by_month,
            'organization': organization.name if organization else 'Todas'
        }