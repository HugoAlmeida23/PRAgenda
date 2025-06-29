# api/services/financial_health_service.py (NEW FILE)

from ..models import Client, ClientProfitability, Task
from django.utils import timezone
from decimal import Decimal

class FinancialHealthService:
    @staticmethod
    def calculate_for_client(client: Client) -> int:
        """Calculates and returns the financial health score for a single client."""
        # Weighted average: 40% Profitability, 30% Compliance, 30% Cash Flow Proxy
        profitability = FinancialHealthService._calculate_profitability_score(client)
        compliance = FinancialHealthService._calculate_compliance_score(client)
        cash_flow = FinancialHealthService._calculate_cash_flow_score(client)

        score = int((profitability * 0.4) + (compliance * 0.3) + (cash_flow * 0.3))
        return max(0, min(100, score)) # Clamp score between 0 and 100

    @staticmethod
    def _calculate_profitability_score(client: Client) -> int:
        # Score based on recent profitability margin
        last_profit_record = ClientProfitability.objects.filter(client=client).order_by('-year', '-month').first()
        if not last_profit_record or last_profit_record.profit_margin is None:
            return 50 # Neutral score if no data

        margin = last_profit_record.profit_margin
        if margin > 30: return 100
        if margin > 15: return 80
        if margin > 5: return 60
        if margin > 0: return 40
        return 10 # Very low score for unprofitability

    @staticmethod
    def _calculate_compliance_score(client: Client) -> int:
        # Score based on overdue fiscal tasks
        overdue_fiscal_tasks = Task.objects.filter(
            client=client,
            source_fiscal_obligation__isnull=False,
            status__in=['pending', 'in_progress'],
            deadline__lt=timezone.now()
        ).count()

        if overdue_fiscal_tasks == 0: return 100
        if overdue_fiscal_tasks == 1: return 60
        if overdue_fiscal_tasks <= 3: return 30
        return 0 # Very low score for multiple overdue tasks

    @staticmethod
    def _calculate_cash_flow_score(client: Client) -> int:
        # Simple proxy for cash flow using monthly fee and last SAFT summary
        # V1: A simple score based on revenue size. This can be improved later.
        fee = client.monthly_fee or Decimal('0.0')
        if fee > 500: return 90
        if fee > 200: return 75
        if fee > 50: return 60
        return 40