from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
from .models import Client, TimeEntry, Expense, ClientProfitability, OrganizationActionLog
import json
from decimal import Decimal
import uuid # If you also have UUIDs

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) # Or str(obj) if you prefer string representation
        if isinstance(obj, uuid.UUID):
            return str(obj)
        # Let the base class default method raise the TypeError
        return super().default(obj)
    
def update_client_profitability(client_id, year, month):
    """
    Atualiza ou cria um registro de rentabilidade para um cliente e período específico.
    
    Args:
        client_id (UUID): ID do cliente
        year (int): Ano para cálculo
        month (int): Mês para cálculo
        
    Returns:
        ClientProfitability: O registro de rentabilidade atualizado
    """
    try:
        # Obter o cliente
        client = Client.objects.get(id=client_id)
        
        # Obter ou criar o registro de rentabilidade
        profitability, created = ClientProfitability.objects.get_or_create(
            client=client,
            year=year,
            month=month,
            defaults={
                'monthly_fee': client.monthly_fee or Decimal('0.00')
            }
        )
        
        # Se o registro já existia, atualizar a avença mensal com o valor atual
        if not created:
            profitability.monthly_fee = client.monthly_fee or Decimal('0.00')
        
        # Obter todas as entradas de tempo do período
        time_entries = TimeEntry.objects.filter(
            client=client,
            date__year=year,
            date__month=month
        )
        
        # Calcular o tempo total gasto
        total_time_minutes = time_entries.aggregate(Sum('minutes_spent'))['minutes_spent__sum'] or 0
        profitability.total_time_minutes = total_time_minutes
        
        # Calcular o custo total do tempo
        time_cost = Decimal('0.00')
        for entry in time_entries:
            # Obter a taxa horária do usuário
            try:
                hourly_rate = entry.user.profile.hourly_rate or Decimal('0.00')
            except:
                hourly_rate = Decimal('0.00')
            
            # Calcular o custo desta entrada
            entry_cost = (Decimal(entry.minutes_spent) / Decimal('60')) * hourly_rate
            time_cost += entry_cost
        
        profitability.time_cost = time_cost
        
        # Obter todas as despesas do período
        expenses = Expense.objects.filter(
            client=client,
            date__year=year,
            date__month=month
        )
        
        # Calcular o total de despesas
        total_expenses = expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        profitability.total_expenses = total_expenses
        
        # Calcular lucro e margem
        profitability.calculate_profit()
        
        # Salvar o registro atualizado
        profitability.save()
        
        return profitability
    
    except Client.DoesNotExist:
        return None
    except Exception as e:
        print(f"Erro ao atualizar rentabilidade: {e}")
        return None

def update_profitability_for_period(year, month):
    """
    Atualiza a rentabilidade de todos os clientes ativos para um período específico.
    
    Args:
        year (int): Ano para cálculo
        month (int): Mês para cálculo
        
    Returns:
        int: Número de registros atualizados
    """
    # Obter todos os clientes ativos
    clients = Client.objects.filter(is_active=True)
    
    count = 0
    for client in clients:
        result = update_client_profitability(client.id, year, month)
        if result:
            count += 1
    
    return count

def update_current_month_profitability():
    """
    Atualiza a rentabilidade de todos os clientes para o mês atual.
    
    Returns:
        int: Número de registros atualizados
    """
    now = timezone.now()
    return update_profitability_for_period(now.year, now.month)

def log_organization_action(request, action_type, action_description, related_object=None):
    user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    org = None
    if user and hasattr(user, 'profile') and user.profile.organization:
        org = user.profile.organization
    elif hasattr(request, 'organization'):
        org = request.organization
    if not org:
        return  # Don't log if no organization context
    OrganizationActionLog.objects.create(
        organization=org,
        user=user,
        action_type=action_type,
        action_description=action_description,
        related_object_id=str(getattr(related_object, 'id', '')) if related_object else None,
        related_object_type=related_object.__class__.__name__ if related_object else None
    )