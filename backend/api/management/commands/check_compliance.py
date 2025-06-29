# api/management/commands/check_compliance.py (NEW FILE)

from django.core.management.base import BaseCommand
from api.models import Client
from api.services.compliance_monitor_service import ComplianceMonitor

class Command(BaseCommand):
    help = 'Checks and updates compliance risks for all active clients.'

    def handle(self, *args, **options):
        self.stdout.write("Starting compliance check for all active clients...")
        active_clients = Client.objects.filter(is_active=True)
        for client in active_clients:
            risks = ComplianceMonitor.check_for_client(client)
            client.compliance_risks = risks
            client.save(update_fields=['compliance_risks'])
        self.stdout.write(self.style.SUCCESS(f"Compliance check completed for {active_clients.count()} clients."))