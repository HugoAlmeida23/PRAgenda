# api/management/commands/identify_opportunities.py (NEW FILE)
from django.core.management.base import BaseCommand
from api.models import Client
from api.services.revenue_service import RevenueService

class Command(BaseCommand):
    help = 'Identifies revenue opportunities for all active clients.'

    def handle(self, *args, **options):
        self.stdout.write("Starting revenue opportunity identification...")
        for client in Client.objects.filter(is_active=True):
            opportunities = RevenueService.identify_for_client(client)
            client.revenue_opportunities = opportunities
            client.save(update_fields=['revenue_opportunities'])
        self.stdout.write(self.style.SUCCESS("Revenue opportunity scan complete."))