# management/commands/generate_fiscal_obligations.py
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import datetime
import logging

from ...models import Organization
from ...services.fiscal_obligation_service import FiscalObligationGenerator
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Gera obrigações fiscais automaticamente baseadas nas definições criadas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            help='Nome ou ID da organização específica (opcional)',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Ano específico para gerar (padrão: ano atual)',
        )
        parser.add_argument(
            '--month',
            type=int,
            help='Mês específico para gerar (padrão: mês atual)',
        )
        parser.add_argument(
            '--months-ahead',
            type=int,
            default=3,
            help='Quantos meses futuros gerar (padrão: 3)',
        )
        parser.add_argument(
            '--current-only',
            action='store_true',
            help='Gerar apenas para o período atual',
        )
        parser.add_argument(
            '--clean-old',
            action='store_true',
            help='Limpar obrigações obsoletas antes de gerar',
        )
        parser.add_argument(
            '--days-old',
            type=int,
            default=30,
            help='Dias para considerar obrigação obsoleta (padrão: 30)',
        )

    def handle(self, *args, **options):
        start_time = timezone.now()
        
        # Determinar organização
        organization = None
        if options['organization']:
            try:
                # Tentar por ID primeiro, depois por nome
                try:
                    organization = Organization.objects.get(id=options['organization'])
                except:
                    organization = Organization.objects.get(name__icontains=options['organization'])
                self.stdout.write(f"Processando organização: {organization.name}")
            except Organization.DoesNotExist:
                raise CommandError(f"Organização '{options['organization']}' não encontrada")
        else:
            self.stdout.write("Processando todas as organizações")

        # Limpar obrigações obsoletas se solicitado
        if options['clean_old']:
            self.stdout.write("Limpando obrigações obsoletas...")
            cleaned_count = FiscalObligationGenerator.clean_old_pending_obligations(
                days_old=options['days_old'],
                organization=organization
            )
            self.stdout.write(f"Removidas {cleaned_count} tarefas obsoletas")

        # Gerar obrigações
        try:
            if options['current_only']:
                # Apenas período atual
                if options['year'] and options['month']:
                    stats = FiscalObligationGenerator.generate_obligations_for_period(
                        options['year'], options['month'], organization
                    )
                    results = [stats]
                else:
                    stats = FiscalObligationGenerator.generate_for_current_period(organization)
                    results = [stats]
            else:
                # Múltiplos meses
                results = FiscalObligationGenerator.generate_for_next_months(
                    months_ahead=options['months_ahead'],
                    organization=organization
                )

            # Exibir resultados
            total_created = 0
            total_skipped = 0
            total_errors = 0

            self.stdout.write("\n" + "="*60)
            self.stdout.write("RESULTADOS DA GERAÇÃO DE OBRIGAÇÕES FISCAIS")
            self.stdout.write("="*60)

            for result in results:
                total_created += result['tasks_created']
                total_skipped += result['tasks_skipped']
                total_errors += len(result['errors'])
                
                self.stdout.write(f"\nPeríodo: {result['period']}")
                self.stdout.write(f"Organização: {result['organization']}")
                self.stdout.write(f"Definições processadas: {result['definitions_processed']}")
                self.stdout.write(f"Clientes processados: {result['clients_processed']}")
                self.stdout.write(f"Tarefas criadas: {result['tasks_created']}")
                self.stdout.write(f"Tarefas ignoradas: {result['tasks_skipped']}")
                
                if result['errors']:
                    self.stdout.write(f"Erros: {len(result['errors'])}")
                    for error in result['errors'][:5]:  # Mostrar apenas os primeiros 5
                        self.stderr.write(f"  - {error}")
                    if len(result['errors']) > 5:
                        self.stderr.write(f"  ... e mais {len(result['errors']) - 5} erros")

            # Resumo final
            self.stdout.write("\n" + "-"*40)
            self.stdout.write("RESUMO GERAL:")
            self.stdout.write(f"Total de tarefas criadas: {total_created}")
            self.stdout.write(f"Total de tarefas ignoradas: {total_skipped}")
            self.stdout.write(f"Total de erros: {total_errors}")
            
            duration = timezone.now() - start_time
            self.stdout.write(f"Tempo de execução: {duration.total_seconds():.2f} segundos")
            
            if total_created > 0:
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Geração concluída com sucesso! {total_created} tarefas criadas.")
                )
            else:
                self.stdout.write(
                    self.style.WARNING("⚠ Nenhuma nova tarefa foi criada.")
                )
                
            if total_errors > 0:
                self.stdout.write(
                    self.style.ERROR(f"✗ {total_errors} erros encontrados durante a geração.")
                )

        except Exception as e:
            logger.error(f"Erro na geração de obrigações: {e}")
            raise CommandError(f"Erro durante a geração: {e}")


