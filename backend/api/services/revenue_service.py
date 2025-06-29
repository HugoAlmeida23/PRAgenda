# api/services/revenue_service.py (NEW FILE)
from ..models import Client, ClientProfitability, Task, TaskCategory
from decimal import Decimal

class RevenueService:
    @staticmethod
    def identify_for_client(client: Client) -> list:
        opportunities = []
        opportunities.extend(RevenueService._identify_fee_review_opportunity(client))
        opportunities.extend(RevenueService._identify_service_gap_opportunity(client))
        return opportunities

    @staticmethod
    def _identify_fee_review_opportunity(client: Client) -> list:
        # Based on profitability
        profit_record = ClientProfitability.objects.filter(client=client).order_by('-year', '-month').first()
        if profit_record and profit_record.profit_margin is not None and profit_record.profit_margin < 25.0:
            return [{
                'type': 'FEE_REVIEW',
                'severity': 'medium',
                'title': 'Revisão de Avença Recomendada',
                'details': f"A margem de lucro atual é de {profit_record.profit_margin:.1f}%. Sugerimos uma revisão da avença para melhorar a rentabilidade.",
                'action_suggestion': 'Agendar reunião para discutir reajuste de preço.'
            }]
        return []

    @staticmethod
    def _identify_service_gap_opportunity(client: Client) -> list:
        # Example: if client has 'IRS' tag but no recent 'Consultoria Fiscal' task
        client_tags = client.fiscal_tags or []
        if 'IRS' in client_tags:
            has_consulting_task = Task.objects.filter(
                client=client,
                category__name__icontains='Consultoria',
                created_at__year=timezone.now().year
            ).exists()
            if not has_consulting_task:
                return [{
                    'type': 'SERVICE_GAP',
                    'severity': 'low',
                    'title': 'Oportunidade: Consultoria de IRS',
                    'details': 'Este cliente tem a obrigação de IRS mas não teve tarefas de consultoria fiscal este ano. Potencial para serviço de otimização fiscal.',
                    'action_suggestion': 'Contactar cliente para oferecer planeamento fiscal de IRS.'
                }]
        return []