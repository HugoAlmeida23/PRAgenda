# services/ai_context_service.py
import logging
from django.core.cache import cache
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta
from ..models import Client, Task, TimeEntry, ClientProfitability, Profile, GeneratedReport
import json

logger = logging.getLogger(__name__)

class AIContextService:
    """
    Serviço para gerenciar contexto inteligente para o AI Advisor.
    Implementa contexto progressivo: dados básicos inicialmente, 
    depois detalhes sob demanda.
    """
    
    @staticmethod
    def get_initial_context(organization, user):
        """
        Retorna apenas dados essenciais para inicializar o AI.
        Foca em métricas e resumos, não dados completos.
        """
        cache_key = f"ai_initial_context_{organization.id}_{user.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.info(f"Usando contexto inicial do cache para user {user.username}")
            return cached_data
        
        context = {
            "organization_name": organization.name,
            "current_date": timezone.now().strftime("%Y-%m-%d"),
            "user_role": user.profile.role if hasattr(user, 'profile') else 'Admin'
        }
        
        # 1. RESUMO DE CLIENTES (não lista completa)
        clients_overview = AIContextService._get_clients_summary(organization)
        context['clients_overview'] = clients_overview
        
        # 2. RESUMO DE TAREFAS (apenas métricas)
        tasks_overview = AIContextService._get_tasks_summary(organization)
        context['tasks_overview'] = tasks_overview
        
        # 3. SNAPSHOT DE RENTABILIDADE (agregado)
        profitability_snapshot = AIContextService._get_profitability_summary(organization)
        context['profitability_snapshot'] = profitability_snapshot
        
        # 4. INDICADORES CRÍTICOS
        critical_indicators = AIContextService._get_critical_indicators(organization)
        context['critical_indicators'] = critical_indicators
        
        # Cache por 10 minutos
        cache.set(cache_key, context, timeout=600)
        logger.info(f"Contexto inicial gerado para {organization.name}")
        
        return context
    
    @staticmethod
    def _get_clients_summary(organization):
        """Resumo de clientes - apenas métricas e top clientes"""
        clients_qs = Client.objects.filter(organization=organization, is_active=True)
        
        # Métricas básicas
        total_clients = clients_qs.count()
        clients_with_fee = clients_qs.exclude(monthly_fee__lte=0).count()
        
        # Top 3 clientes por receita
        top_clients = clients_qs.order_by('-monthly_fee')[:3]
        top_clients_data = [
            {
                "name": client.name,
                "monthly_fee": float(client.monthly_fee or 0),
                "fiscal_tags": client.fiscal_tags or []
            }
            for client in top_clients
        ]
        
        # Estatísticas de tags fiscais
        fiscal_tags_stats = {}
        for client in clients_qs:
            for tag in (client.fiscal_tags or []):
                fiscal_tags_stats[tag] = fiscal_tags_stats.get(tag, 0) + 1
        
        return {
            "total_active": total_clients,
            "with_monthly_fee": clients_with_fee,
            "without_fee": total_clients - clients_with_fee,
            "top_3_by_revenue": top_clients_data,
            "common_fiscal_tags": dict(sorted(fiscal_tags_stats.items(), key=lambda x: x[1], reverse=True)[:5])
        }
    
    @staticmethod
    def _get_tasks_summary(organization):
        """Resumo de tarefas - apenas métricas importantes"""
        tasks_qs = Task.objects.filter(client__organization=organization)
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        stats = tasks_qs.aggregate(
            total_active=Count('id', filter=Q(status__in=['pending', 'in_progress'])),
            overdue=Count('id', filter=Q(deadline__lt=today, status__in=['pending', 'in_progress'])),
            due_today=Count('id', filter=Q(deadline=today, status__in=['pending', 'in_progress'])),
            completed_this_week=Count('id', filter=Q(status='completed', completed_at__date__gte=week_ago))
        )
        
        # Tarefas por prioridade
        priority_breakdown = list(
            tasks_qs.filter(status__in=['pending', 'in_progress'])
            .values('priority')
            .annotate(count=Count('id'))
            .order_by('priority')
        )
        
        return {
            "active_tasks": stats['total_active'] or 0,
            "overdue_tasks": stats['overdue'] or 0,
            "due_today": stats['due_today'] or 0,
            "completed_this_week": stats['completed_this_week'] or 0,
            "priority_breakdown": priority_breakdown
        }
    
    @staticmethod
    def _get_profitability_summary(organization):
        """Resumo de rentabilidade - apenas agregados"""
        current_date = timezone.now()
        current_month = current_date.month
        current_year = current_date.year
        
        # Rentabilidade do mês atual
        current_month_profit = ClientProfitability.objects.filter(
            client__organization=organization,
            year=current_year,
            month=current_month
        ).aggregate(
            avg_margin=Avg('profit_margin'),
            total_profit=Sum('profit'),
            profitable_clients=Count('id', filter=Q(is_profitable=True)),
            unprofitable_clients=Count('id', filter=Q(is_profitable=False))
        )
        
        return {
            "current_month": {
                "year": current_year,
                "month": current_month,
                "avg_profit_margin": current_month_profit['avg_margin'],
                "total_profit": current_month_profit['total_profit'],
                "profitable_clients": current_month_profit['profitable_clients'] or 0,
                "unprofitable_clients": current_month_profit['unprofitable_clients'] or 0
            }
        }
    
    @staticmethod
    def _get_critical_indicators(organization):
        """Indicadores críticos que precisam atenção imediata"""
        today = timezone.now().date()
        
        # Tarefas urgentes
        urgent_tasks = Task.objects.filter(
            client__organization=organization,
            status__in=['pending', 'in_progress'],
            priority=1  # Urgente
        ).count()
        
        # Clientes sem atividade recente (30 dias)
        thirty_days_ago = today - timedelta(days=30)
        inactive_clients = Client.objects.filter(
            organization=organization,
            is_active=True
        ).exclude(
            tasks__created_at__gte=thirty_days_ago
        ).count()
        
        return {
            "urgent_tasks_count": urgent_tasks,
            "inactive_clients_count": inactive_clients,
            "needs_attention": urgent_tasks > 0 or inactive_clients > 5
        }
    
    @staticmethod
    def get_detailed_context(organization, context_type, filters=None):
        """
        Retorna dados detalhados sob demanda.
        context_type: 'clients', 'tasks', 'profitability', 'generated_reports', etc.
        filters: dicionário com filtros específicos
        """
        filters = filters or {}
        
        if context_type == 'clients':
            return AIContextService._get_detailed_clients(organization, filters)
        elif context_type == 'tasks':
            return AIContextService._get_detailed_tasks(organization, filters)
        elif context_type == 'profitability':
            return AIContextService._get_detailed_profitability(organization, filters)
        elif context_type == 'specific_client':
            return AIContextService._get_specific_client_data(organization, filters)
        elif context_type == 'generated_reports':
            return AIContextService._get_generated_reports(organization, filters)
        else:
            return {"error": f"Context type '{context_type}' not supported"}
    
    @staticmethod
    def _get_detailed_clients(organization, filters):
        """Dados detalhados de clientes com filtros"""
        clients_qs = Client.objects.filter(organization=organization, is_active=True)
        
        # Aplicar filtros
        if filters.get('has_fee'):
            clients_qs = clients_qs.exclude(monthly_fee__lte=0)
        
        if filters.get('fiscal_tag'):
            clients_qs = clients_qs.filter(fiscal_tags__contains=[filters['fiscal_tag']])
        
        if filters.get('unprofitable'):
            # Clientes não rentáveis no último mês
            unprofitable_client_ids = ClientProfitability.objects.filter(
                client__organization=organization,
                is_profitable=False
            ).values_list('client_id', flat=True)
            clients_qs = clients_qs.filter(id__in=unprofitable_client_ids)
        
        # Limitar resultados
        clients_qs = clients_qs[:20]
        
        clients_data = []
        for client in clients_qs:
            # Dados básicos + métricas
            active_tasks = client.tasks.filter(status__in=['pending', 'in_progress']).count()
            last_activity = client.tasks.order_by('-created_at').first()
            
            clients_data.append({
                "id": str(client.id),
                "name": client.name,
                "monthly_fee": float(client.monthly_fee or 0),
                "fiscal_tags": client.fiscal_tags or [],
                "active_tasks_count": active_tasks,
                "last_activity": last_activity.created_at.strftime("%Y-%m-%d") if last_activity else None,
                "account_manager": client.account_manager.username if client.account_manager else None
            })
        
        return {
            "clients": clients_data,
            "total_found": len(clients_data),
            "filters_applied": filters
        }
    
    @staticmethod
    def _get_detailed_tasks(organization, filters):
        """Dados detalhados de tarefas com filtros"""
        tasks_qs = Task.objects.filter(client__organization=organization)
        
        # Aplicar filtros
        if filters.get('status'):
            tasks_qs = tasks_qs.filter(status=filters['status'])
        
        if filters.get('overdue'):
            today = timezone.now().date()
            tasks_qs = tasks_qs.filter(deadline__lt=today, status__in=['pending', 'in_progress'])
        
        if filters.get('client_id'):
            tasks_qs = tasks_qs.filter(client_id=filters['client_id'])
        
        if filters.get('priority'):
            tasks_qs = tasks_qs.filter(priority=filters['priority'])
        
        # Ordenar e limitar
        tasks_qs = tasks_qs.select_related('client', 'assigned_to', 'category').order_by('deadline', 'priority')[:20]
        
        tasks_data = []
        for task in tasks_qs:
            tasks_data.append({
                "id": str(task.id),
                "title": task.title,
                "client_name": task.client.name,
                "status": task.status,
                "priority": task.priority,
                "deadline": task.deadline.strftime("%Y-%m-%d") if task.deadline else None,
                "assigned_to": task.assigned_to.username if task.assigned_to else None,
                "category": task.category.name if task.category else None,
                "estimated_time": task.estimated_time_minutes
            })
        
        return {
            "tasks": tasks_data,
            "total_found": len(tasks_data),
            "filters_applied": filters
        }
    
    @staticmethod
    def _get_specific_client_data(organization, filters):
        """Dados completos de um cliente específico"""
        client_id = filters.get('client_id')
        if not client_id:
            return {"error": "client_id is required"}
        
        try:
            client = Client.objects.get(id=client_id, organization=organization)
        except Client.DoesNotExist:
            return {"error": "Client not found"}
        
        # Tarefas do cliente
        client_tasks = Task.objects.filter(client=client).select_related('assigned_to', 'category')
        tasks_summary = {
            "active": client_tasks.filter(status__in=['pending', 'in_progress']).count(),
            "completed": client_tasks.filter(status='completed').count(),
            "overdue": client_tasks.filter(
                deadline__lt=timezone.now().date(),
                status__in=['pending', 'in_progress']
            ).count()
        }
        
        # Rentabilidade recente
        recent_profitability = ClientProfitability.objects.filter(
            client=client
        ).order_by('-year', '-month')[:3]
        
        profitability_data = [
            {
                "year": p.year,
                "month": p.month,
                "profit": float(p.profit or 0),
                "profit_margin": float(p.profit_margin or 0),
                "is_profitable": p.is_profitable
            }
            for p in recent_profitability
        ]
        
        # Tempo gasto recente
        recent_time = TimeEntry.objects.filter(
            client=client,
            date__gte=timezone.now().date() - timedelta(days=30)
        ).aggregate(
            total_minutes=Sum('minutes_spent')
        )
        
        return {
            "client": {
                "id": str(client.id),
                "name": client.name,
                "monthly_fee": float(client.monthly_fee or 0),
                "fiscal_tags": client.fiscal_tags or [],
                "account_manager": client.account_manager.username if client.account_manager else None,
                "created_at": client.created_at.strftime("%Y-%m-%d")
            },
            "tasks_summary": tasks_summary,
            "recent_profitability": profitability_data,
            "recent_time_spent_minutes": recent_time['total_minutes'] or 0
        }
    
    @staticmethod
    def _get_generated_reports(organization, filters):
        """
        Retorna os relatórios gerados para a organização, com filtros opcionais.
        """
        qs = GeneratedReport.objects.filter(organization=organization)
        if filters.get('status'):
            qs = qs.filter(status=filters['status'])
        if filters.get('report_type'):
            qs = qs.filter(report_type=filters['report_type'])
        if filters.get('created_after'):
            qs = qs.filter(created_at__gte=filters['created_after'])
        if filters.get('created_before'):
            qs = qs.filter(created_at__lte=filters['created_before'])
        qs = qs.order_by('-created_at')[:20]
        return [
            {
                'id': str(r.id),
                'name': r.name,
                'report_type': r.get_report_type_display(),
                'report_format': r.get_report_format_display(),
                'created_at': r.created_at.isoformat(),
                'status': r.get_status_display(),
                'storage_url': r.storage_url,
                'description': r.description,
            }
            for r in qs
        ]
    
    @staticmethod
    def get_context_suggestions(user_query, organization):
        """
        Analisa a query do usuário e sugere que tipo de contexto adicional buscar.
        Esto é um helper para o AI decidir que dados pedir.
        """
        query_lower = user_query.lower()
        suggestions = []
        
        # Palavras-chave para diferentes tipos de contexto
        client_keywords = ['cliente', 'clientes', 'client', 'rentabil', 'lucro']
        task_keywords = ['tarefa', 'tarefas', 'task', 'deadline', 'atraso', 'pendente']
        profitability_keywords = ['rentabil', 'lucro', 'margem', 'profit', 'receita']
        
        if any(word in query_lower for word in client_keywords):
            suggestions.append({
                'type': 'clients',
                'reason': 'Query mentions clients or profitability',
                'priority': 'high'
            })
        
        if any(word in query_lower for word in task_keywords):
            suggestions.append({
                'type': 'tasks',
                'reason': 'Query mentions tasks or deadlines',
                'priority': 'high'
            })
        
        if any(word in query_lower for word in profitability_keywords):
            suggestions.append({
                'type': 'profitability',
                'reason': 'Query mentions profitability metrics',
                'priority': 'medium'
            })
        
        # Detectar menções específicas de clientes
        if 'cliente ' in query_lower:
            suggestions.append({
                'type': 'specific_client',
                'reason': 'Query mentions specific client',
                'priority': 'high'
            })
        
        return suggestions