# api/management/commands/calculate_health_scores.py (NEW FILE)

from django.core.management.base import BaseCommand
from api.models import Client
from api.services.financial_health_service import FinancialHealthService

class Command(BaseCommand):
    help = 'Calculates and updates the financial health score for all active clients.'

    def handle(self, *args, **options):
        self.stdout.write("Starting financial health score calculation...")
        active_clients = Client.objects.filter(is_active=True)
        updated_count = 0
        for client in active_clients:
            score = FinancialHealthService.calculate_for_client(client)
            client.financial_health_score = score
            client.save(update_fields=['financial_health_score','churn_risk'])
            updated_count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully updated scores for {updated_count} clients."))