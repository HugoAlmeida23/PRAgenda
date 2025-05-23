import logging
from django.core.cache import cache
from django.db.models import Q
from ..models import Client, Task, Profile
from ..serializers import ClientSerializer, TaskSerializer

logger = logging.getLogger(__name__)

# Configurações de cache
CACHE_TIMEOUT = 300  # 5 minutos
CLIENTS_CACHE_KEY = "gemini_clients_{org_id}_{user_id}"
TASKS_CACHE_KEY = "gemini_tasks_{org_id}_{user_id}"


class DataService:
    """Serviço para gerenciar dados com cache para o processamento NLP"""
    
    @staticmethod
    def get_user_clients(user):
        """Obtém clientes do usuário com cache"""
        try:
            profile = Profile.objects.get(user=user)
            
            if not profile.organization:
                return []
            
            cache_key = CLIENTS_CACHE_KEY.format(
                org_id=profile.organization.id,
                user_id=user.id
            )
            
            # Tentar obter do cache
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Usando clientes do cache para usuário {user.username}")
                return cached_data
            
            # Se não estiver no cache, buscar do banco
            if profile.is_org_admin or profile.can_view_all_clients:
                clients_queryset = Client.objects.filter(
                    is_active=True,
                    organization=profile.organization
                ).select_related('organization', 'account_manager')
            else:
                clients_queryset = profile.visible_clients.filter(
                    is_active=True
                ).select_related('organization', 'account_manager')
            
            # Serializar e cachear
            clients_data = ClientSerializer(clients_queryset, many=True).data
            cache.set(cache_key, clients_data, CACHE_TIMEOUT)
            
            logger.info(f"Cache atualizado para {len(clients_data)} clientes do usuário {user.username}")
            return clients_data
            
        except Profile.DoesNotExist:
            logger.error(f"Perfil não encontrado para usuário {user.username}")
            return []
    
    @staticmethod
    def get_user_tasks(user):
        """Obtém tarefas do usuário com cache"""
        try:
            profile = Profile.objects.get(user=user)
            
            if not profile.organization:
                return []
            
            cache_key = TASKS_CACHE_KEY.format(
                org_id=profile.organization.id,
                user_id=user.id
            )
            
            # Tentar obter do cache
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Usando tarefas do cache para usuário {user.username}")
                return cached_data
            
            # Se não estiver no cache, buscar do banco
            if profile.is_org_admin or profile.can_view_all_tasks:
                tasks_queryset = Task.objects.filter(
                    status__in=['pending', 'in_progress'],
                    client__organization=profile.organization
                ).select_related('client', 'category', 'assigned_to')
            else:
                visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                tasks_queryset = Task.objects.filter(
                    Q(client_id__in=visible_client_ids) | Q(assigned_to=user),
                    status__in=['pending', 'in_progress']
                ).select_related('client', 'category', 'assigned_to').distinct()
            
            # Serializar e cachear
            tasks_data = TaskSerializer(tasks_queryset, many=True).data
            cache.set(cache_key, tasks_data, CACHE_TIMEOUT)
            
            logger.info(f"Cache atualizado para {len(tasks_data)} tarefas do usuário {user.username}")
            return tasks_data
            
        except Profile.DoesNotExist:
            logger.error(f"Perfil não encontrado para usuário {user.username}")
            return []
    
    @staticmethod
    def invalidate_user_cache(user):
        """Invalida o cache de um usuário específico"""
        try:
            profile = Profile.objects.get(user=user)
            
            if profile.organization:
                clients_key = CLIENTS_CACHE_KEY.format(
                    org_id=profile.organization.id,
                    user_id=user.id
                )
                tasks_key = TASKS_CACHE_KEY.format(
                    org_id=profile.organization.id,
                    user_id=user.id
                )
                
                cache.delete(clients_key)
                cache.delete(tasks_key)
                
                logger.info(f"Cache invalidado para usuário {user.username}")
                
        except Profile.DoesNotExist:
            pass