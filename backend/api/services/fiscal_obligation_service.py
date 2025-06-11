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
        Verifica se uma definição deve gerar obrigação para o período especificado.
        """
        current_date = datetime(year, month, 1)
        
        if definition.periodicity == 'MONTHLY':
            return True  # Gera todo mês
        
        elif definition.periodicity == 'QUARTERLY':
            # Trimestres: Jan-Mar (Q1), Apr-Jun (Q2), Jul-Sep (Q3), Oct-Dec (Q4)
            quarter_months = [3, 6, 9, 12]  # Meses finais de cada trimestre
            return month in quarter_months
        
        elif definition.periodicity == 'ANNUAL':
            if definition.calculation_basis == 'SPECIFIC_DATE' and definition.specific_month_reference:
                # Para obrigações anuais com mês específico (ex: IES em julho)
                return month == definition.specific_month_reference
            else:
                # Para obrigações anuais baseadas no fim do ano fiscal
                return month == 12  # Dezembro
        
        elif definition.periodicity == 'BIANNUAL':
            # Semestral: junho e dezembro
            return month in [6, 12]
        
        elif definition.periodicity == 'OTHER':
            # Para periodicidades especiais, verificar regras customizadas
            return cls._check_custom_periodicity(definition, year, month)
        
        return False
    
    @classmethod
    def _check_custom_periodicity(cls, definition: FiscalObligationDefinition, year: int, month: int) -> bool:
        """
        Verifica periodicidades customizadas baseadas no nome da obrigação.
        """
        name_lower = definition.name.lower()
        
        # Exemplos de regras customizadas
        if 'modelo 10' in name_lower or 'irs' in name_lower:
            return month == 6  # IRS até 30 de junho
        
        if 'modelo 22' in name_lower or 'irc' in name_lower:
            return month == 5  # IRC até 31 de maio
        
        if 'ies' in name_lower:
            return month == 7  # IES até 15 de julho
        
        if 'intrastat' in name_lower:
            return True  # Mensal
        
        # Default: não gera
        return False
    
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
        
        # Filtro por tags fiscais
        if definition.applies_to_client_tags:
            # Se a lista está vazia ou contém 'ALL', aplica a todos
            if not definition.applies_to_client_tags or 'ALL' in definition.applies_to_client_tags:
                return list(clients_query.select_related('organization', 'account_manager'))
            
            # Filtrar clientes que possuem pelo menos uma das tags
            eligible_clients = []
            for client in clients_query.select_related('organization', 'account_manager'):
                client_tags = client.fiscal_tags or []
                if any(tag in client_tags for tag in definition.applies_to_client_tags):
                    eligible_clients.append(client)
            
            return eligible_clients
        
        return list(clients_query.select_related('organization', 'account_manager'))
    
    @classmethod
    def _calculate_deadline(cls, definition: FiscalObligationDefinition, year: int, month: int) -> Optional[Dict[str, Any]]:
        """
        Calcula o deadline para uma obrigação baseada na definição.
        
        Returns:
            Dict com 'deadline', 'period_description', 'reference_period'
        """
        try:
            reference_period = None
            period_description = ""
            
            if definition.calculation_basis == 'END_OF_PERIOD':
                # Baseado no fim do período de referência
                if definition.periodicity == 'MONTHLY':
                    # Período de referência é o mês anterior
                    ref_date = datetime(year, month, 1) - relativedelta(months=1)
                    reference_period = ref_date
                    period_description = f"{ref_date.strftime('%B %Y')}"
                    
                elif definition.periodicity == 'QUARTERLY':
                    # Período de referência é o trimestre que terminou
                    quarter = (month - 1) // 3 + 1
                    if quarter == 1:  # Q1 (Jan-Mar)
                        ref_date = datetime(year - 1, 12, 31)  # Q4 do ano anterior
                        period_description = f"4º Trimestre {year - 1}"
                    else:
                        quarter_end_months = {2: 6, 3: 9, 4: 12}
                        ref_month = quarter_end_months[quarter]
                        ref_date = datetime(year, ref_month, 1)
                        period_description = f"{quarter - 1}º Trimestre {year}"
                    reference_period = ref_date
                    
                elif definition.periodicity == 'ANNUAL':
                    # Período de referência é o ano anterior
                    ref_date = datetime(year - 1, 12, 31)
                    reference_period = ref_date
                    period_description = f"Ano {year - 1}"
                
                elif definition.periodicity == 'BIANNUAL':
                    # Semestre anterior
                    if month == 6:  # Primeiro semestre
                        ref_date = datetime(year - 1, 12, 31)
                        period_description = f"2º Semestre {year - 1}"
                    else:  # month == 12, segundo semestre
                        ref_date = datetime(year, 6, 30)
                        period_description = f"1º Semestre {year}"
                    reference_period = ref_date
                
            elif definition.calculation_basis == 'SPECIFIC_DATE':
                # Baseado em uma data específica no ano
                if definition.specific_month_reference:
                    ref_date = datetime(year, definition.specific_month_reference, 1)
                    reference_period = ref_date
                    period_description = f"Ano {year}"
                else:
                    # Usar o ano fiscal padrão (janeiro a dezembro)
                    ref_date = datetime(year, 1, 1)
                    reference_period = ref_date
                    period_description = f"Ano {year}"
            
            # Calcular a data limite
            if reference_period:
                deadline_date = reference_period + relativedelta(months=definition.deadline_month_offset)
                
                # Ajustar para o dia específico
                deadline_day = min(definition.deadline_day, monthrange(deadline_date.year, deadline_date.month)[1])
                deadline = deadline_date.replace(day=deadline_day)
                
                return {
                    'deadline': deadline.date(),
                    'period_description': period_description,
                    'reference_period': reference_period.date()
                }
            
        except Exception as e:
            logger.error(f"Erro ao calcular deadline para {definition.name}: {e}")
        
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
            'deadline': deadline_info['deadline'].strftime('%d/%m/%Y')
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