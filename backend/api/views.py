from rest_framework import viewsets, generics
from rest_framework.request import Request
from datetime import datetime
from django.utils import timezone
import json
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from .models import Organization, Client, TaskCategory, Task, TimeEntry, Expense, ClientProfitability, Profile, AutoTimeTracking, WorkflowStep
from .serializers import (ClientSerializer, TaskCategorySerializer, TaskSerializer,
                         TimeEntrySerializer, ExpenseSerializer, ClientProfitabilitySerializer,
                         ProfileSerializer, AutoTimeTrackingSerializer, OrganizationSerializer)
from .models import NLPProcessor, WorkflowDefinition, TaskApproval
from django.contrib.auth.models import User
from .serializers import UserSerializer, NLPProcessorSerializer, WorkflowDefinitionSerializer, WorkflowStepSerializer, TaskApprovalSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .utils import update_profitability_for_period, update_current_month_profitability
from django.db.models import Q
from django.conf import settings
import requests

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user) 

class AutoTimeTrackingViewSet(viewsets.ModelViewSet):
    serializer_class = AutoTimeTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AutoTimeTracking.objects.filter(user=self.request.user).order_by('-start_time')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            # Apply filters if provided
            queryset = Client.objects.all()
            is_active = self.request.query_params.get('is_active')
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active == 'true')
            
            # Return all clients in the organization if admin or has full view permission
            if profile.is_org_admin or profile.can_view_all_clients:
                if profile.organization:
                    return queryset.filter(organization=profile.organization)
                return Client.objects.none()
            else:
                # Return only explicitly granted clients
                return profile.visible_clients.all().filter(id__in=queryset)
                
        except Profile.DoesNotExist:
            return Client.objects.none()
    
    def perform_create(self, serializer):
        # Set the organization based on the user's profile
        try:
            profile = Profile.objects.get(user=self.request.user)
            if profile.organization:
                serializer.save(organization=profile.organization)
            else:
                raise PermissionDenied("User is not part of any organization")
        except Profile.DoesNotExist:
            raise PermissionDenied("User profile not found")

class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            base_queryset = Task.objects.all()
            
            # Filter by status if provided
            status_param = self.request.GET.get('status')
            if status_param:
                base_queryset = base_queryset.filter(status=status_param)
                
            # Filter by client if provided
            client_id = self.request.GET.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
            
            # Apply permission-based filtering
            if profile.is_org_admin or profile.can_view_all_clients:
                # Admins see all tasks in their organization
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return Task.objects.none()
            else:
                # Regular users only see tasks for their visible clients or assigned to them
                visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                return base_queryset.filter(
                    Q(client_id__in=visible_client_ids) | Q(assigned_to=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            return Task.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            base_queryset = TimeEntry.objects.all()
            
            # Filter by date range if provided
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date and end_date:
                base_queryset = base_queryset.filter(date__range=[start_date, end_date])
                
            # Filter by client if provided
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
            
            # Apply permission-based filtering
            if profile.is_org_admin or profile.can_view_all_clients:
                # Admins see all time entries in their organization
                if profile.organization:
                    return base_queryset.filter(client__organization=profile.organization)
                return TimeEntry.objects.none()
            else:
                # Regular users only see time entries for their visible clients or their own entries
                visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                return base_queryset.filter(
                    Q(client_id__in=visible_client_ids) | Q(user=user)
                ).distinct()
                
        except Profile.DoesNotExist:
            # If no profile, only show the user's own entries
            return TimeEntry.objects.filter(user=user)
    
    def perform_create(self, serializer):
        # Check if the user has access to the client
        client_id = self.request.data.get('client')
        if client_id:
            try:
                profile = Profile.objects.get(user=self.request.user)
                client = Client.objects.get(id=client_id)
                
                if not profile.can_access_client(client):
                    raise PermissionDenied("You don't have access to this client")
                    
            except (Profile.DoesNotExist, Client.DoesNotExist):
                pass  # Let validation handle this
                
        serializer.save(user=self.request.user)
        
class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Expense.objects.all()
        # Filter by date range if provided
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        # Filter by client if provided
        client_id = self.request.GET.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ClientProfitabilityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientProfitabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        try:
            profile = Profile.objects.get(user=user)
            
            # Check permission to view profitability data
            if not (profile.is_org_admin or profile.can_view_profitability):
                return ClientProfitability.objects.none()
            
            base_queryset = ClientProfitability.objects.all()
            
            # Filter by year/month if provided
            year = self.request.query_params.get('year')
            month = self.request.query_params.get('month')
            if year and month:
                base_queryset = base_queryset.filter(year=year, month=month)
            
            # Filter by client if provided
            client_id = self.request.query_params.get('client')
            if client_id:
                base_queryset = base_queryset.filter(client_id=client_id)
                
            # Filter by profitability if specified
            is_profitable = self.request.query_params.get('is_profitable')
            if is_profitable is not None:
                is_profitable_bool = is_profitable.lower() == 'true'
                base_queryset = base_queryset.filter(is_profitable=is_profitable_bool)
            
            # Apply client visibility filtering
            if profile.organization:
                if profile.is_org_admin or profile.can_view_all_clients:
                    # Admins see all profitability data in the organization
                    return base_queryset.filter(client__organization=profile.organization)
                else:
                    # Regular users only see profitability data for visible clients
                    visible_client_ids = profile.visible_clients.values_list('id', flat=True)
                    return base_queryset.filter(client_id__in=visible_client_ids)
            
            return ClientProfitability.objects.none()
                
        except Profile.DoesNotExist:
            return ClientProfitability.objects.none()
            
class NLPProcessorViewSet(viewsets.ModelViewSet):
    queryset = NLPProcessor.objects.all()
    serializer_class = NLPProcessorSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def process_text(self, request):
        """
        Process natural language text and return extracted information
        """
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        results = NLPProcessor.process_text(text, request.user)
        
        # Format the response
        response_data = {
            'clients': [],
            'categories': [],
            'tasks': [],
            'times': results['times'],
            'activities': results['activities'],
            'confidence': results['confidence']
        }
        
        # Add client information
        for client in results.get('clients', []):
            response_data['clients'].append({
                'id': client.id,
                'name': client.name
            })
            
        # Add category information
        for category in results.get('categories', []):
            response_data['categories'].append({
                'id': category.id,
                'name': category.name
            })

        # Add task information
        for task in results.get('tasks', []):
            response_data['tasks'].append({
                'id': task.id,
                'title': task.title,  # Usando 'title' em vez de 'name' para corresponder ao modelo Task
                'client_id': str(task.client.id) if task.client else None,
                'client_name': task.client.name if task.client else None
            })
            
        return Response(response_data)
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        """
        Create time entries from natural language text
        """
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        task_id = request.data.get('task_id')  # Adicionado para permitir especificar uma tarefa
        date_str = request.data.get('date')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()
            
        try:
            entries = NLPProcessor.create_time_entries_from_text(
                text, request.user, client_id, date, task_id
            )
            
            # Serialize and return the created entries
            serializer = TimeEntrySerializer(entries, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class GeminiNLPViewSet(viewsets.ViewSet):
    """
    ViewSet para processamento de linguagem natural usando o Gemini 2.0.
    Identifica clientes, tarefas e tempo em texto escrito em linguagem natural.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def process_text(self, request):
        """
        Processa texto em linguagem natural para extrair informações de cliente, tarefa e tempo.
        
        Parâmetros:
            - text: O texto em linguagem natural
            - client_id (opcional): ID do cliente padrão caso não seja detectado no texto
            
        Retorna:
            Informações extraídas incluindo clientes, tarefas e tempos identificados.
        """
        text = request.data.get('text', '')
        default_client_id = request.data.get('client_id')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Obter todos os clientes e tarefas do banco de dados
            # Observação: estes já estão serializados como dicionários
            clients_data = ClientSerializer(Client.objects.filter(is_active=True), many=True).data
            tasks_data = TaskSerializer(Task.objects.filter(status__in=['pending', 'in_progress']), many=True).data
            
            # Adicionar cliente padrão se fornecido
            default_client_data = None
            if default_client_id:
                try:
                    default_client = Client.objects.get(id=default_client_id)
                    default_client_data = ClientSerializer(default_client).data
                except Client.DoesNotExist:
                    pass
            
            # Chamar a API do Gemini
            extracted_info = self._call_gemini_api(
                text=text,
                clients=clients_data,
                tasks=tasks_data,
                default_client=default_client_data
            )
            
            if not extracted_info.get('success', False):
                return Response(
                    {'error': extracted_info.get('error', 'Failed to process text')},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Processar os resultados
            response_data = {
                'clients': [],
                'tasks': [],
                'times': [],
                'activities': [],
                'categories': [],
                'confidence': 0.0
            }
            
            # Processar clientes
            for client_info in extracted_info.get('clients', []):
                client_id = client_info.get('id')
                client_name = client_info.get('name')
                if client_id and client_name:
                    response_data['clients'].append({
                        'id': client_id,
                        'name': client_name
                    })
            
            # Processar tarefas
            for task_info in extracted_info.get('tasks', []):
                task_id = task_info.get('id')
                task_title = task_info.get('title')
                client_id = task_info.get('client_id')
                if task_id and task_title:
                    response_data['tasks'].append({
                        'id': task_id,
                        'title': task_title,
                        'client_id': client_id,
                        'client_name': self._get_client_name_by_id(client_id, extracted_info.get('clients', []))
                    })
            
            # Processar tempos
            for time_info in extracted_info.get('times', []):
                minutes = time_info.get('minutes')
                if minutes and isinstance(minutes, (int, float)):
                    response_data['times'].append(int(minutes))
            
            # Processar atividades
            for activity_info in extracted_info.get('activities', []):
                description = activity_info.get('description')
                if description:
                    response_data['activities'].append(description)
            
            # Calcular confiança geral
            confidences = []
            for item_type in ['clients', 'tasks', 'times', 'activities']:
                for item in extracted_info.get(item_type, []):
                    if 'confidence' in item:
                        confidences.append(item['confidence'])
            
            if confidences:
                response_data['confidence'] = sum(confidences) / len(confidences)
            
            return Response(response_data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_name_by_id(self, client_id, clients_list):
        """Função auxiliar para obter o nome do cliente pelo ID"""
        if not client_id:
            return None
        
        for client in clients_list:
            if client.get('id') == client_id:
                return client.get('name')
        
        return None
        
    def _call_gemini_api(self, text, clients, tasks, default_client=None):
        """
        Chama a API do Gemini para processar o texto.
        
        Parâmetros:
            - text: Texto a ser processado
            - clients: Lista de clientes (já serializados como dicionários)
            - tasks: Lista de tarefas (já serializadas como dicionários)
            - default_client: Cliente padrão (opcional)
            
        Retorna:
            Informações extraídas pelo Gemini.
        """
        import json
        import uuid
        from django.conf import settings
        import requests
        
        # Definir um codificador JSON personalizado para lidar com UUIDs
        class UUIDEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, uuid.UUID):
                    # Converter UUID para string
                    return str(obj)
                return super().default(obj)
        
        GEMINI_API_KEY = settings.GEMINI_API_KEY
        GEMINI_API_URL = settings.GEMINI_API_URL
        
        try:
            # Como clients e tasks já são dicionários, não precisamos convertê-los
            prompt = f"""
            Você é um assistente especializado em extrair informações de texto em linguagem natural.
            
            Analise o seguinte texto e identifique:
            1. Cliente(s) mencionado(s)
            2. Tarefa(s) mencionada(s)
            3. Tempo gasto (em minutos)
            4. Descrição da atividade
            
            TEXTO: "{text}"
            
            DADOS DISPONÍVEIS:
            
            Clientes:
            {json.dumps(clients, indent=2, cls=UUIDEncoder)}
            
            Tarefas:
            {json.dumps(tasks, indent=2, cls=UUIDEncoder)}
            
            Cliente Padrão (usar apenas se nenhum cliente for identificado no texto):
            {json.dumps(default_client, indent=2, cls=UUIDEncoder) if default_client else "Nenhum"}
            
            Retorne APENAS um objeto JSON com o seguinte formato, sem qualquer texto adicional:
            {{
            "success": true,
            "clients": [
                {{
                "id": "id_do_cliente",
                "name": "nome_do_cliente",
                "confidence": 0.9
                }}
            ],
            "tasks": [
                {{
                "id": "id_da_tarefa",
                "title": "título_da_tarefa",
                "client_id": "id_do_cliente_associado",
                "confidence": 0.8
                }}
            ],
            "times": [
                {{
                "minutes": 120,
                "confidence": 0.95,
                "original_text": "2 horas"
                }}
            ],
            "activities": [
                {{
                "description": "Descrição da atividade extraída do texto",
                "confidence": 0.7
                }}
            ]
            }}
            
            Se não conseguir identificar algum dos itens, retorne uma lista vazia para esse item.
            Certifique-se de usar apenas clientes e tarefas da lista fornecida, combinando exatamente os IDs.
            Para tempos, converta horas para minutos (ex: 2 horas = 120 minutos).
            """
            
            # Preparar payload para a API
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "topP": 0.9,
                    "topK": 40
                }
            }
            
            # Chamar a API do Gemini
            headers = {
                "Content-Type": "application/json"
            }
            
            print(f"Enviando requisição para API Gemini...")
            
            response = requests.post(
                f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
                headers=headers,
                json=payload
            )
            
            print(f"Status code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"Erro na resposta: {response.text}")
                return {
                    "success": False,
                    "error": f"Gemini API error: {response.status_code} - {response.text}"
                }
            
            # Extrair a resposta do Gemini
            response_json = response.json()
            
            try:
                # Extrair o texto da resposta
                text_response = response_json["candidates"][0]["content"]["parts"][0]["text"]
                
                print(f"Resposta da API: {text_response[:100]}...")  # Mostrar apenas os primeiros 100 caracteres para debug
                
                # Extrair o JSON da resposta
                # Procurar por conteúdo JSON no texto retornado
                import re
                
                json_match = re.search(r'({.*})', text_response, re.DOTALL)
                
                if json_match:
                    json_str = json_match.group(1)
                    extracted_data = json.loads(json_str)
                    return extracted_data
                else:
                    print("Não foi possível extrair JSON da resposta")
                    print(f"Resposta completa: {text_response}")
                    return {
                        "success": False,
                        "error": "Could not extract JSON from Gemini response"
                    }
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {
                    "success": False,
                    "error": f"Error parsing Gemini response: {str(e)}"
                }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": f"Error in Gemini API call: {str(e)}"
            }
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        """
        Cria entradas de tempo baseadas no texto em linguagem natural.
        
        Parâmetros:
            - text: O texto em linguagem natural
            - client_id (opcional): ID do cliente padrão caso não seja detectado no texto
            - date (opcional): Data para as entradas, formato YYYY-MM-DD
            - task_id (opcional): ID da tarefa padrão
            
        Retorna:
            Entradas de tempo criadas.
        """
        from datetime import datetime
        from django.utils import timezone
        
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        task_id = request.data.get('task_id')
        date_str = request.data.get('date')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar formato da data
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()
        
        # Processar o texto primeiro para extrair informações
        process_response = self.process_text(request)
        
        if process_response.status_code != 200:
            return process_response
        
        extracted_data = process_response.data
        
        # Criar entradas de tempo
        created_entries = []
        
        # Priorizar tarefa fornecida na requisição
        selected_task = None
        if task_id:
            try:
                selected_task = Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                pass
        
        # Selecionar cliente
        selected_client = None
        if extracted_data.get('clients'):
            # Usar o primeiro cliente encontrado no texto
            client_info = extracted_data['clients'][0]
            try:
                selected_client = Client.objects.get(id=client_info['id'])
            except Client.DoesNotExist:
                pass
        elif client_id:
            # Usar cliente fornecido como fallback
            try:
                selected_client = Client.objects.get(id=client_id)
            except Client.DoesNotExist:
                pass
        
        if not selected_client:
            return Response(
                {'error': 'No client identified and no default client provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Selecionar tempo
        minutes_spent = 60  # Default: 1 hora
        if extracted_data.get('times'):
            minutes_spent = extracted_data['times'][0]
        
        # Selecionar descrição
        description = text
        if extracted_data.get('activities'):
            description = extracted_data['activities'][0]
        
        # Se não temos uma tarefa selecionada mas temos tarefas identificadas
        if not selected_task and extracted_data.get('tasks'):
            task_info = extracted_data['tasks'][0]
            try:
                selected_task = Task.objects.get(id=task_info['id'])
            except Task.DoesNotExist:
                pass
        
        # Buscar categoria se disponível
        category = None
        if selected_task and selected_task.category:
            category = selected_task.category
        
        # Criar a entrada de tempo
        entry = TimeEntry.objects.create(
            user=request.user,
            client=selected_client,
            task=selected_task,
            category=category,
            minutes_spent=minutes_spent,
            description=description,
            date=date,
            original_text=text
        )
        created_entries.append(entry)
        
        # Serializar e retornar as entradas criadas
        serializer = TimeEntrySerializer(created_entries, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
              
class WorkflowDefinitionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowDefinition.objects.all()
    serializer_class = WorkflowDefinitionSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class WorkflowStepViewSet(viewsets.ModelViewSet):
    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = WorkflowStep.objects.all()
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            queryset = queryset.filter(workflow=workflow_id)
        return queryset.order_by('workflow', 'order')


class TaskApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = TaskApprovalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TaskApproval.objects.all()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task=task_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)
        
# Adicionar ao views.py existente
class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para visualizar e editar organizações.
    Apenas admins podem criar/atualizar organizações.
    Usuários normais só podem ver sua própria organização.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Se for um superusuário/admin, pode ver todas as organizações
        if user.is_superuser:
            return Organization.objects.all()
            
        # Tentar obter o perfil do usuário
        try:
            profile = Profile.objects.get(user=user)
            
            # Se tiver uma organização associada, retorna essa organização
            if profile.organization:
                return Organization.objects.filter(id=profile.organization.id)
            
            # Caso não tenha organização
            return Organization.objects.none()
                
        except Profile.DoesNotExist:
            return Organization.objects.none()
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Obter todos os membros de uma organização."""
        organization = self.get_object()
        members = Profile.objects.filter(organization=organization)
        serializer = ProfileSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None):
        """Obter todos os clientes de uma organização."""
        organization = self.get_object()
        
        # Get user profile
        profile = Profile.objects.get(user=request.user)
        
        # If admin or can see all clients, return all organization clients
        if profile.is_org_admin or profile.can_view_all_clients:
            clients = Client.objects.filter(organization=organization)
        else:
            # Otherwise only return visible clients
            clients = profile.visible_clients.filter(organization=organization)
            
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Adicionar um usuário existente como membro da organização."""
        organization = self.get_object()
        
        # Verificar se o usuário atual é administrador desta organização
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para adicionar membros a esta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obter os dados do formulário
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'Membro')
        is_admin = request.data.get('is_admin', False)
        can_assign_tasks = request.data.get('can_assign_tasks', False)
        can_manage_clients = request.data.get('can_manage_clients', False)
        can_view_all_clients = request.data.get('can_view_all_clients', False)
        can_view_analytics = request.data.get('can_view_analytics', False)
        can_view_profitability = request.data.get('can_view_profitability', False)
        
        if not user_id:
            return Response(
                {"error": "ID do usuário é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se o usuário existe
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Usuário não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar se o perfil existe e atualizá-lo ou criar novo
        profile, created = Profile.objects.get_or_create(
            user=user,
            defaults={
                'organization': organization,
                'role': role,
                'is_org_admin': is_admin,
                'can_assign_tasks': can_assign_tasks,
                'can_manage_clients': can_manage_clients,
                'can_view_all_clients': can_view_all_clients,
                'can_view_analytics': can_view_analytics,
                'can_view_profitability': can_view_profitability,
                'access_level': 'Standard'
            }
        )
        
        if not created:
            # Atualizar um perfil existente
            profile.organization = organization
            profile.role = role
            profile.is_org_admin = is_admin
            profile.can_assign_tasks = can_assign_tasks
            profile.can_manage_clients = can_manage_clients
            profile.can_view_all_clients = can_view_all_clients
            profile.can_view_analytics = can_view_analytics
            profile.can_view_profitability = can_view_profitability
            profile.save()
        
        return Response(
            ProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )
        
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remover um membro da organização."""
        organization = self.get_object()
        
        # Verificar se o usuário atual é administrador desta organização
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para remover membros desta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obter os dados do formulário
        profile_id = request.data.get('profile_id')
        
        if not profile_id:
            return Response(
                {"error": "ID do perfil é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se o perfil existe
        try:
            profile = Profile.objects.get(id=profile_id, organization=organization)
            
            # Não permitir remover-se a si mesmo se for o único admin
            if profile.user == request.user and profile.is_org_admin:
                admin_count = Profile.objects.filter(
                    organization=organization, 
                    is_org_admin=True
                ).count()
                
                if admin_count <= 1:
                    return Response(
                        {"error": "Não é possível remover o único administrador da organização"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            # Desvincula o perfil da organização, mas não o exclui
            profile.organization = None
            profile.is_org_admin = False
            profile.can_assign_tasks = False
            profile.can_manage_clients = False
            profile.can_view_all_clients = False
            profile.can_view_analytics = False
            profile.can_view_profitability = False
            profile.visible_clients.clear()  # Remove all visible clients
            profile.save()
            
            return Response(
                {"success": "Membro removido da organização com sucesso"}, 
                status=status.HTTP_200_OK
            )
            
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    """
    ViewSet para visualizar e editar organizações.
    Apenas admins podem criar/atualizar organizações.
    Usuários normais só podem ver sua própria organização.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Se for um superusuário/admin, pode ver todas as organizações
        if user.is_superuser:
            return Organization.objects.all()
            
        # Tentar obter o perfil do usuário
        try:
            profile = Profile.objects.get(user=user)
            
            # Se tiver uma organização associada, retorna essa organização
            if profile.organization:
                return Organization.objects.filter(id=profile.organization.id)
            
            # Caso não tenha organização
            return Organization.objects.none()
                
        except Profile.DoesNotExist:
            return Organization.objects.none()
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Obter todos os membros de uma organização."""
        organization = self.get_object()
        members = Profile.objects.filter(organization=organization)
        serializer = ProfileSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None):
        """Obter todos os clientes de uma organização."""
        organization = self.get_object()
        clients = Client.objects.filter(organization=organization)
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Adicionar um usuário existente como membro da organização."""
        organization = self.get_object()
        
        # Verificar se o usuário atual é administrador desta organização
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para adicionar membros a esta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obter os dados do formulário
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'Membro')
        is_admin = request.data.get('is_admin', False)
        
        if not user_id:
            return Response(
                {"error": "ID do usuário é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se o usuário existe
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Usuário não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar se o perfil existe e atualizá-lo ou criar novo
        profile, created = Profile.objects.get_or_create(
            user=user,
            defaults={
                'organization': organization,
                'role': role,
                'is_org_admin': is_admin,
                'access_level': 'Standard'
            }
        )
        
        if not created:
            # Atualizar um perfil existente
            profile.organization = organization
            profile.role = role
            profile.is_org_admin = is_admin
            profile.save()
        
        return Response(
            ProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )
        
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remover um membro da organização."""
        organization = self.get_object()
        
        # Verificar se o usuário atual é administrador desta organização
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para remover membros desta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obter os dados do formulário
        profile_id = request.data.get('profile_id')
        
        if not profile_id:
            return Response(
                {"error": "ID do perfil é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se o perfil existe
        try:
            profile = Profile.objects.get(id=profile_id, organization=organization)
            
            # Não permitir remover-se a si mesmo se for o único admin
            if profile.user == request.user and profile.is_org_admin:
                admin_count = Profile.objects.filter(
                    organization=organization, 
                    is_org_admin=True
                ).count()
                
                if admin_count <= 1:
                    return Response(
                        {"error": "Não é possível remover o único administrador da organização"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            # Desvincula o perfil da organização, mas não o exclui
            profile.organization = None
            profile.is_org_admin = False
            profile.can_assign_tasks = False
            profile.can_manage_clients = False
            profile.save()
            
            return Response(
                {"success": "Membro removido da organização com sucesso"}, 
                status=status.HTTP_200_OK
            )
            
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
    @action(detail=True, methods=['post'])
    def update_member(self, request, pk=None):
        """Update an existing organization member's permissions."""
        organization = self.get_object()
        
        # Check if requester is admin
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para atualizar membros desta organização"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get form data
        profile_id = request.data.get('profile_id')
        
        if not profile_id:
            return Response(
                {"error": "ID do perfil é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the member profile
        try:
            profile = Profile.objects.get(id=profile_id, organization=organization)
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Update permissions
        profile.role = request.data.get('role', profile.role)
        profile.is_org_admin = request.data.get('is_admin', profile.is_org_admin)
        profile.can_assign_tasks = request.data.get('can_assign_tasks', profile.can_assign_tasks)
        profile.can_manage_clients = request.data.get('can_manage_clients', profile.can_manage_clients)
        profile.can_view_all_clients = request.data.get('can_view_all_clients', profile.can_view_all_clients)
        profile.can_view_analytics = request.data.get('can_view_analytics', profile.can_view_analytics)
        profile.can_view_profitability = request.data.get('can_view_profitability', profile.can_view_profitability)
        profile.save()
        
        return Response(
            ProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def manage_visible_clients(self, request, pk=None):
        """Add or remove visible clients for a user."""
        organization = self.get_object()
        
        # Check if requester is admin
        try:
            requester_profile = Profile.objects.get(user=request.user)
            if not requester_profile.is_org_admin or requester_profile.organization != organization:
                return Response(
                    {"error": "Sem permissão para gerenciar clientes visíveis"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil do solicitante não encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get form data
        profile_id = request.data.get('profile_id')
        client_ids = request.data.get('client_ids', [])
        action = request.data.get('action', 'add')  # Options: 'add', 'remove', 'set'
        
        if not profile_id:
            return Response(
                {"error": "ID do perfil é obrigatório"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the member profile
        try:
            profile = Profile.objects.get(id=profile_id, organization=organization)
        except Profile.DoesNotExist:
            return Response(
                {"error": "Perfil não encontrado nesta organização"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get the clients
        clients = Client.objects.filter(
            organization=organization, 
            id__in=client_ids
        )
        
        if len(clients) != len(client_ids) and client_ids:
            return Response(
                {"error": "Um ou mais clientes não encontrados nesta organização"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update visible clients
        if action == 'add':
            profile.visible_clients.add(*clients)
        elif action == 'remove':
            profile.visible_clients.remove(*clients)
        elif action == 'set':
            profile.visible_clients.set(clients)
        else:
            return Response(
                {"error": "Ação inválida. Use 'add', 'remove' ou 'set'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return Response(
            ProfileSerializer(profile).data, 
            status=status.HTTP_200_OK
        )