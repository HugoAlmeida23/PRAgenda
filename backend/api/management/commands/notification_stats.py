# management/commands/notification_stats.py

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from ...models import WorkflowNotification, Organization, Profile
import json

class Command(BaseCommand):
    help = 'Gera estatísticas do sistema de notificações'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            help='ID da organização (opcional, todas se não especificado)'
        )
        
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Período em dias para análise (padrão: 30)'
        )
        
        parser.add_argument(
            '--format',
            type=str,
            choices=['table', 'json'],
            default='table',
            help='Formato de saída'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        org_id = options['organization']
        output_format = options['format']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Filtrar por organização se especificado
        base_query = WorkflowNotification.objects.filter(
            created_at__gte=cutoff_date
        )
        
        if org_id:
            try:
                organization = Organization.objects.get(id=org_id)
                org_users = Profile.objects.filter(
                    organization=organization
                ).values_list('user_id', flat=True)
                base_query = base_query.filter(user_id__in=org_users)
                org_name = organization.name
            except Organization.DoesNotExist:
                self.stderr.write(f'Organização {org_id} não encontrada')
                return
        else:
            org_name = 'Todas as organizações'
        
        # Coletar estatísticas
        stats = self.collect_stats(base_query, days, org_name)
        
        # Exibir resultados
        if output_format == 'json':
            self.stdout.write(json.dumps(stats, indent=2, default=str))
        else:
            self.display_table_stats(stats)
    
    def collect_stats(self, queryset, days, org_name):
        """Coleta todas as estatísticas"""
        total = queryset.count()
        
        return {
            'period_days': days,
            'organization': org_name,
            'generated_at': timezone.now().isoformat(),
            'summary': {
                'total_notifications': total,
                'unread_count': queryset.filter(is_read=False).count(),
                'urgent_count': queryset.filter(priority='urgent').count(),
                'archived_count': queryset.filter(is_archived=True).count(),
            },
            'by_type': list(queryset.values('notification_type').annotate(
                count=Count('id')
            ).order_by('-count')),
            'by_priority': list(queryset.values('priority').annotate(
                count=Count('id')
            ).order_by('-count')),
            'by_day': self.get_daily_distribution(queryset, days),
            'top_users': list(queryset.values(
                'user__username'
            ).annotate(
                total=Count('id'),
                unread=Count('id', filter=Q(is_read=False))
            ).order_by('-total')[:10]),
            'read_rate': round(
                queryset.filter(is_read=True).count() / total * 100, 2
            ) if total > 0 else 0,
        }
    
    def get_daily_distribution(self, queryset, days):
        """Distribuição diária de notificações"""
        daily_data = []
        
        for i in range(min(days, 30)):  # Máximo 30 dias para não sobrecarregar
            date = timezone.now().date() - timedelta(days=i)
            count = queryset.filter(created_at__date=date).count()
            daily_data.append({
                'date': date.isoformat(),
                'count': count
            })
        
        return daily_data[::-1]  # Ordem cronológica
    
    def display_table_stats(self, stats):
        """Exibe estatísticas em formato tabela"""
        self.stdout.write(
            self.style.SUCCESS(f'\n📊 ESTATÍSTICAS DE NOTIFICAÇÕES')
        )
        self.stdout.write(f'📅 Período: {stats["period_days"]} dias')
        self.stdout.write(f'🏢 Organização: {stats["organization"]}')
        self.stdout.write(f'⏰ Gerado em: {stats["generated_at"]}\n')
        
        # Resumo
        summary = stats['summary']
        self.stdout.write(self.style.HTTP_INFO('📋 RESUMO GERAL:'))
        self.stdout.write(f'  Total de notificações: {summary["total_notifications"]}')
        self.stdout.write(f'  Não lidas: {summary["unread_count"]}')
        self.stdout.write(f'  Urgentes: {summary["urgent_count"]}')
        self.stdout.write(f'  Arquivadas: {summary["archived_count"]}')
        self.stdout.write(f'  Taxa de leitura: {stats["read_rate"]}%\n')
        
        # Por tipo
        self.stdout.write(self.style.HTTP_INFO('📊 POR TIPO DE NOTIFICAÇÃO:'))
        for item in stats['by_type'][:10]:
            self.stdout.write(f'  {item["notification_type"]}: {item["count"]}')
        
        # Por prioridade
        self.stdout.write(self.style.HTTP_INFO('\n🚨 POR PRIORIDADE:'))
        for item in stats['by_priority']:
            self.stdout.write(f'  {item["priority"]}: {item["count"]}')
        
        # Top usuários
        self.stdout.write(self.style.HTTP_INFO('\n👥 TOP USUÁRIOS (por notificações):'))
        for item in stats['top_users'][:5]:
            self.stdout.write(
                f'  {item["user__username"]}: {item["total"]} '
                f'(não lidas: {item["unread"]})'
            )
        
        # Últimos 7 dias
        recent_days = stats['by_day'][-7:]
        self.stdout.write(self.style.HTTP_INFO('\n📈 ÚLTIMOS 7 DIAS:'))
        for day in recent_days:
            self.stdout.write(f'  {day["date"]}: {day["count"]} notificações')