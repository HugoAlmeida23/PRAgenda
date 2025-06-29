# api/services/compliance_monitor_service.py (NEW FILE)

from ..models import Client, Task, FiscalObligationDefinition
from django.utils import timezone
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)

class ComplianceMonitor:
    @staticmethod
    def check_for_client(client: Client) -> list:
        """Checks all compliance risks for a single client."""
        risks = []
        risks.extend(ComplianceMonitor._check_missing_fiscal_tasks(client))
        risks.extend(ComplianceMonitor._check_overdue_fiscal_tasks(client))
        return risks

    @staticmethod
    def _check_missing_fiscal_tasks(client: Client) -> list:
        # This is a complex logic that re-uses parts of the FiscalObligationGenerator.
        # For Phase 1, we can implement a simplified version.
        # A more robust version would require a dedicated service to determine "expected" tasks.
        # For now, this is a placeholder for that logic.
        # Example: check if a client with 'IVA_TRIMESTRAL' tag has a completed IVA task for the last quarter.
        return [] # Placeholder for now to avoid overcomplicating Phase 1

    @staticmethod
    def _check_overdue_fiscal_tasks(client: Client) -> list:
        """Finds fiscal tasks that are past their deadline and not completed."""
        risks = []
        overdue_tasks = Task.objects.filter(
            client=client,
            source_fiscal_obligation__isnull=False,
            status__in=['pending', 'in_progress'],
            deadline__lt=timezone.now()
        ).select_related('source_fiscal_obligation')

        for task in overdue_tasks:
            days_overdue = (timezone.now().date() - task.deadline.date()).days
            risks.append({
                'type': 'OVERDUE_FISCAL_TASK',
                'severity': 'high',
                'title': f"Obrigação Atrasada: {task.source_fiscal_obligation.name}",
                'details': f"A tarefa '{task.title}' está {days_overdue} dias atrasada. Prazo era {task.deadline.strftime('%d/%m/%Y')}.",
                'task_id': str(task.id)
            })
        return risks