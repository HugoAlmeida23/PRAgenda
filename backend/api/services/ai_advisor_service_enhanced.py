# services/ai_advisor_service_enhanced.py
import json
import uuid
import logging
from django.core.cache import cache
from django.conf import settings
from .gemini_service import GeminiService
from .ai_context_service import AIContextService
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError
from django.utils import timezone

logger = logging.getLogger(__name__)

# Cache timeout for conversation history
CONVERSATION_CACHE_TIMEOUT = 3600
MAX_CONVERSATION_TURNS = 20
SESSION_STATE_TIMEOUT = 7200       # 2 hours instead of 1

class AIAdvisorServiceError(Exception):
    """Custom exception for AI Advisor Service errors"""
    pass

class EnhancedAIAdvisorService:
    def __init__(self):
        self._validate_configuration()
        
        try:
            self.gemini_service = GeminiService()
            self.context_service = AIContextService()
        except Exception as e:
            logger.error(f"Failed to initialize services: {str(e)}")
            raise AIAdvisorServiceError(f"Falha na inicialização do serviço AI: {str(e)}")

    def _validate_configuration(self):
        """Validate that all required configurations are present"""
        missing_configs = []
        
        if not hasattr(settings, 'GEMINI_API_KEY') or not settings.GEMINI_API_KEY:
            missing_configs.append('GEMINI_API_KEY')
        
        if not hasattr(settings, 'GEMINI_API_URL') or not settings.GEMINI_API_URL:
            missing_configs.append('GEMINI_API_URL')
        
        if missing_configs:
            error_msg = f"Configurações obrigatórias não encontradas: {', '.join(missing_configs)}"
            logger.error(error_msg)
            raise AIAdvisorServiceError(f"Serviço AI não configurado corretamente. Contacte o administrador.")

    def _build_initial_system_prompt(self, initial_context):
        """Build optimized system prompt with minimal essential context and task creation guidance"""
        try:
            context_summary = self._create_context_summary(initial_context)
            # --- Conversational Task Creation Guidance ---
            task_creation_guidance = (
                "\n\nINSTRUÇÃO IMPORTANTE:\n"
                "Se o utilizador pedir para criar uma tarefa, conduza o processo de forma conversacional, perguntando um campo de cada vez (cliente, título, prazo, prioridade, etc). "
                "Quando tiver todos os campos necessários, mostre um resumo e peça confirmação antes de criar. "
                "Use um botão markdown: [Confirmar Criação](action://confirm-create-task?...). "
                "Não crie nada sem confirmação explícita do utilizador. "
                "Se faltar algum campo, pergunte apenas UM campo de cada vez. "
                "Quando o utilizador confirmar, inclua todos os campos como parâmetros na action. "
                "Exemplo: [Confirmar Criação](action://confirm-create-task?client=123&title=Enviar%20IVA&deadline=2025-07-10&priority=2)\n"
            )
            return (
                "Você é FlowTask, um consultor de negócios especializado em escritórios de contabilidade portugueses. "
                "Trabalha com euros, segue as normas fiscais portuguesas e fala português de Portugal.\n\n"
                "SUAS CAPACIDADES:\n"
                "- Analisar dados do escritório e fornecer insights valiosos\n"
                "- Solicitar dados específicos quando necessário para dar respostas precisas\n"
                "- Sugerir melhorias em rentabilidade, gestão de tarefas e processos\n"
                "- Identificar oportunidades e problemas críticos\n\n"
                "DADOS INICIAIS DO ESCRITÓRIO:\n"
                f"{context_summary}\n\n"
                "IMPORTANTE:\n"
                "- Quando precisar de dados específicos (ex: detalhes de um cliente, lista de tarefas), peça explicitamente\n"
                "- Use markdown para formatar tabelas e listas quando apropriado\n"
                "- Seja específico e mencione nomes/números dos dados fornecidos\n"
                "- Sempre fundamentar suas análises nos dados disponíveis\n\n"
                f"{task_creation_guidance}"
                "Apresente-se como FlowTask, confirme que analisou os dados iniciais do escritório "
                f"{initial_context.get('organization_name', 'da organização')} e pergunte como pode ajudar a otimizar o escritório."
            )
        except Exception as e:
            logger.error(f"Error building system prompt: {str(e)}")
            return (
                "Você é FlowTask, um consultor de negócios para escritórios de contabilidade em Portugal. "
                "Como posso ajudar a otimizar o seu escritório hoje?"
            )

    def _create_context_summary(self, context):
        """Create lean context summary to avoid token bloat"""
        try:
            summary_parts = []
            
            # Organization info
            if 'organization_name' in context:
                summary_parts.append(f"📊 ESCRITÓRIO: {context['organization_name']}")
            
            # Clients overview
            if 'clients_overview' in context:
                clients = context['clients_overview']
                summary_parts.append(f"👥 CLIENTES: {clients.get('total_active', 0)} ativos")
                
                if clients.get('top_3_by_revenue'):
                    top_names = [c.get('name', 'N/A') for c in clients['top_3_by_revenue'][:2]]
                    summary_parts.append(f"   Top clientes: {', '.join(top_names)}")
            
            # Tasks overview
            if 'tasks_overview' in context:
                tasks = context['tasks_overview']
                summary_parts.append(
                    f"📋 TAREFAS: {tasks.get('active_tasks', 0)} ativas, "
                    f"{tasks.get('overdue_tasks', 0)} em atraso"
                )
            
            # Critical indicators
            if 'critical_indicators' in context:
                critical = context['critical_indicators']
                if critical.get('needs_attention'):
                    summary_parts.append(f"⚠️ ATENÇÃO: {critical.get('urgent_tasks_count', 0)} tarefas urgentes")
            
            # Profitability snapshot
            if 'profitability_snapshot' in context:
                profit = context['profitability_snapshot'].get('current_month', {})
                if profit.get('avg_profit_margin'):
                    summary_parts.append(f"💰 RENTABILIDADE: {profit['avg_profit_margin']:.1f}% margem média")
            
            return "\n".join(summary_parts)
            
        except Exception as e:
            logger.error(f"Error creating context summary: {str(e)}")
            return "Dados do escritório carregados para análise."

    def start_session(self, user_context_data, user):
        """Start session with minimal initial context"""
        try:
            session_id = f"ai_advisor_session_{user.id}_{uuid.uuid4()}"
            logger.info(f"Starting enhanced AI session {session_id} for user {user.username}")

            # Get optimized initial context
            try:
                profile = user.profile
                organization = profile.organization
                
                initial_context = self.context_service.get_initial_context(organization, user)
                logger.debug(f"Initial context size: {len(str(initial_context))} chars")
            except Exception as e:
                logger.error(f"Error getting initial context: {str(e)}")
                return None, "Erro ao preparar contexto inicial do escritório"

            # Create session state
            session_state = {
                'user_id': user.id,
                'organization_id': organization.id,
                'context_sent': ['initial'],
                'conversation_metadata': {
                    'topics_discussed': [],
                    'data_requests': []
                },
                'created_at': timezone.now().isoformat(),
                'last_activity': timezone.now().isoformat()
            }
            
            # Test API and get response
            try:
                initial_prompt = self._build_initial_system_prompt(initial_context)
                
                initial_response = self.gemini_service.generate_conversational_response(
                    current_turn_parts=[{"text": initial_prompt}],
                    history=None
                )

                if initial_response and not self._is_error_response(initial_response):
                    # Store conversation history and session state
                    conversation_history = [
                        {"role": "user", "parts": [{"text": initial_prompt}]},
                        {"role": "model", "parts": [{"text": initial_response}]}
                    ]
                    
                    # Store both with longer timeout
                    cache.set(session_id, conversation_history, timeout=CONVERSATION_CACHE_TIMEOUT)
                    cache.set(f"{session_id}_state", session_state, timeout=SESSION_STATE_TIMEOUT)
                    
                    logger.info(f"Enhanced AI session {session_id} started successfully")
                    return session_id, initial_response
                else:
                    logger.error(f"Invalid response from Gemini: {initial_response}")
                    return None, "Resposta inválida do serviço AI"
                    
            except Exception as e:
                logger.error(f"Error getting AI response: {str(e)}")
                return None, "Erro na comunicação com o serviço AI"

        except Exception as e:
            logger.error(f"Error starting enhanced session: {str(e)}", exc_info=True)
            return None, "Erro interno ao iniciar sessão"

    def _is_time_entry_creation_intent(self, query):
        query_lower = query.lower()
        triggers = [
            'registar tempo', 'registo de tempo', 'adicionar tempo', 'tempo gasto',
            'time entry', 'log time', 'add time', 'spent', 'passei', 'gastei', 'trabalhei'
        ]
        return any(trigger in query_lower for trigger in triggers)

    def _is_chart_request(self, query):
        query_lower = query.lower()
        triggers = [
            'gráfico', 'chart', 'faça um gráfico', 'mostra gráfico', 'gráfico de barras', 'gráfico de linhas', 'line chart', 'pie chart', 'visualização', 'visualize'
        ]
        return any(trigger in query_lower for trigger in triggers)

    def process_query(self, session_id, user_query_text, user):
        """Process query with intelligent context enhancement, task and time entry creation guidance"""
        try:
            # Retrieve conversation history and session state
            conversation_history = cache.get(session_id)
            session_state = cache.get(f"{session_id}_state")
            if not conversation_history:
                logger.warning(f"Session {session_id} conversation history not found")
                return None, "Sessão inválida ou expirada. Recarregue a página para iniciar nova conversa."
            if not session_state:
                logger.warning(f"Session {session_id} state not found, recreating...")
                try:
                    profile = user.profile
                    organization = profile.organization
                    session_state = {
                        'user_id': user.id,
                        'organization_id': organization.id,
                        'context_sent': ['initial'],
                        'conversation_metadata': {
                            'topics_discussed': [],
                            'data_requests': []
                        }
                    }
                    cache.set(f"{session_id}_state", session_state, timeout=SESSION_STATE_TIMEOUT)
                    logger.info(f"Recreated session state for {session_id}")
                except Exception as e:
                    logger.error(f"Could not recreate session state: {str(e)}")
                    return None, "Erro na sessão. Recarregue a página para iniciar nova conversa."
            if not isinstance(conversation_history, list) or len(conversation_history) < 2:
                logger.error(f"Invalid conversation history format for session {session_id}")
                cache.delete(session_id)
                cache.delete(f"{session_id}_state")
                return None, "Sessão corrompida. Recarregue a página para iniciar nova conversa."

            # --- Detect time entry creation intent and inject guidance if needed ---
            if self._is_time_entry_creation_intent(user_query_text):
                guidance_note = (
                    "[NOTA DO SISTEMA]: O utilizador quer registar tempo numa tarefa. "
                    "Conduza o processo perguntando um campo de cada vez (tarefa, cliente, minutos, descrição, data). "
                    "Quando todos os campos estiverem preenchidos, peça confirmação com um botão markdown action://confirm-create-time-entry. "
                    "Não registe nada sem confirmação."
                )
                current_turn_parts = [
                    {"text": user_query_text},
                    {"text": guidance_note}
                ]
            # --- Detect task creation intent and inject guidance if needed ---
            elif self._is_task_creation_intent(user_query_text):
                guidance_note = (
                    "[NOTA DO SISTEMA]: O utilizador quer criar uma tarefa. "
                    "Conduza o processo perguntando um campo de cada vez, conforme instruções. "
                    "Quando todos os campos estiverem preenchidos, peça confirmação com um botão markdown action://confirm-create-task. "
                    "Não crie nada sem confirmação."
                )
                current_turn_parts = [
                    {"text": user_query_text},
                    {"text": guidance_note}
                ]
            else:
                # Analyze query to determine if additional context is needed
                additional_context = self._analyze_query_and_get_context(
                    user_query_text, session_state, user
                )
                force_chart = self._is_chart_request(user_query_text)
                current_turn_parts = [{"text": user_query_text}]
                if additional_context:
                    if isinstance(additional_context, str):
                        context_text = additional_context
                    else:
                        context_text = self._format_additional_context(additional_context, force_chart=force_chart)
                    current_turn_parts.append({"text": f"\n\n[DADOS ADICIONAIS SOLICITADOS]:\n{context_text}"})
            # Get AI response
            try:
                ai_response = self.gemini_service.generate_conversational_response(
                    current_turn_parts=current_turn_parts,
                    history=conversation_history
                )
                if ai_response and not self._is_error_response(ai_response):
                    conversation_history.append({"role": "user", "parts": current_turn_parts})
                    conversation_history.append({"role": "model", "parts": [{"text": ai_response}]})
                    self._update_session_state(session_state, user_query_text, None)
                    if len(conversation_history) > (MAX_CONVERSATION_TURNS + 2):
                        conversation_history = conversation_history[:2] + conversation_history[-(MAX_CONVERSATION_TURNS):]
                    cache.set(session_id, conversation_history, timeout=CONVERSATION_CACHE_TIMEOUT)
                    cache.set(f"{session_id}_state", session_state, timeout=SESSION_STATE_TIMEOUT)
                    logger.info(f"Query processed successfully for session {session_id}")
                    return ai_response, None
                else:
                    logger.error(f"Invalid AI response: {ai_response}")
                    return None, "Resposta inválida do serviço AI. Tente novamente."
            except Exception as e:
                logger.error(f"Error getting AI response: {str(e)}")
                return None, "Erro na comunicação com o serviço AI. Tente novamente."
        except Exception as e:
            logger.error(f"Error processing enhanced query: {str(e)}", exc_info=True)
            return None, "Erro interno ao processar pergunta. Tente novamente."

    # --- Helper to detect task creation intent ---
    def _is_task_creation_intent(self, query):
        query_lower = query.lower()
        # Simple intent detection for Portuguese and English
        triggers = [
            'criar tarefa', 'nova tarefa', 'adicionar tarefa', 'registar tarefa',
            'create task', 'new task', 'add task', 'register task'
        ]
        return any(trigger in query_lower for trigger in triggers)

    def _analyze_query_and_get_context(self, query, session_state, user):
        """
        Analyze the query and fetch additional context if needed.
        Now supports 'generated_reports' context type.
        """
        try:
            profile = user.profile
            organization = profile.organization
            
            # Detect if the query is about generated reports
            if any(word in query.lower() for word in ["relatório", "relatorios", "relatórios", "report", "reports", "gerados", "disponíveis"]):
                # Fetch generated reports
                reports_data = self.context_service.get_detailed_context(organization, 'generated_reports')
                return self._format_generated_reports_context(reports_data)
            
            # Get context suggestions from service
            suggestions = self.context_service.get_context_suggestions(query, organization)
            
            additional_context = {}
            
            for suggestion in suggestions:
                context_type = suggestion['type']
                
                # Skip if we already sent this type of context recently
                if context_type in session_state.get('context_sent', []):
                    continue
                
                # Determine filters based on query content
                filters = self._extract_filters_from_query(query, context_type)
                
                # Fetch the context
                context_data = self.context_service.get_detailed_context(
                    organization, context_type, filters
                )
                
                if context_data and 'error' not in context_data:
                    additional_context[context_type] = context_data
                    session_state['context_sent'].append(context_type)
            
            return additional_context
            
        except Exception as e:
            logger.error(f"Error analyzing query for context: {str(e)}")
            return {}

    def _extract_filters_from_query(self, query, context_type):
        """Extract relevant filters from user query"""
        query_lower = query.lower()
        filters = {}
        
        if context_type == 'clients':
            if 'não rentáveis' in query_lower or 'menos rentáveis' in query_lower:
                filters['unprofitable'] = True
            if 'com taxa' in query_lower or 'com avença' in query_lower:
                filters['has_fee'] = True
                
        elif context_type == 'tasks':
            if 'atrasadas' in query_lower or 'atraso' in query_lower:
                filters['overdue'] = True
            if 'urgentes' in query_lower:
                filters['priority'] = 1
            if 'pendentes' in query_lower:
                filters['status'] = 'pending'
        
        return filters

    def _format_additional_context(self, additional_context, force_chart=False):
        """Format additional context for AI consumption, with optional force_chart."""
        formatted_parts = []
        
        for context_type, data in additional_context.items():
            if context_type == 'clients' and 'clients' in data:
                formatted_parts.append(self._format_clients_context(data['clients']))
            elif context_type == 'tasks' and 'tasks' in data:
                formatted_parts.append(self._format_tasks_context(data['tasks'], force_chart=force_chart))
            elif context_type == 'specific_client':
                formatted_parts.append(self._format_specific_client_context(data))
            elif context_type == 'profitability':
                formatted_parts.append(self._format_profitability_context(data))
        
        return "\n\n".join(formatted_parts)

    def _format_clients_context(self, clients_data):
        """Format clients data as markdown table, chart, action buttons, and app links"""
        if not clients_data:
            return "Nenhum cliente encontrado com os critérios especificados."
        context = "## 📊 CLIENTES DETALHADOS\n\n"
        # Add chart if enough data
        if len(clients_data) >= 2:
            chart_data = [
                {"name": c.get("name", "N/A"), "value": float(c.get("monthly_fee", 0))}
                for c in clients_data[:10]
            ]
            chart_block = (
                "```chart\n" +
                json.dumps({
                    "type": "bar",
                    "data": chart_data,
                    "xKey": "name",
                    "yKey": "value",
                    "barColor": "#6366f1"
                }, ensure_ascii=False) +
                "\n```\n\n"
            )
            context += chart_block
        context += (
            "Cada linha inclui ações rápidas: [Ver Cliente](/clients/ID) e [Criar Tarefa](action://create-task?client=ID).\n\n"
        )
        context += "| Cliente | Taxa Mensal | Tarefas Ativas | Tags Fiscais | Gestor | Ações |\n"
        context += "|---------|-------------|----------------|--------------|--------|--------|\n"
        for client in clients_data[:10]:
            name = client.get('name', 'N/A')
            fee = f"{client.get('monthly_fee', 0):.2f}€"
            active_tasks = client.get('active_tasks_count', 0)
            tags = ', '.join(client.get('fiscal_tags', [])[:3]) or 'Nenhuma'
            manager = client.get('account_manager', 'N/A')
            client_id = client.get('id', '')
            link = f"[Ver Cliente](/clients/{client_id})"
            action = f"[Criar Tarefa](action://create-task?client={client_id})"
            actions = f"{link} <br> {action}"
            context += f"| {name} | {fee} | {active_tasks} | {tags} | {manager} | {actions} |\n"
        return context

    def _format_tasks_context(self, tasks_data, force_chart=False):
        """Format tasks data as markdown table, chart, action buttons, and app links. Always include chart if force_chart or if any data."""
        if not tasks_data:
            return "Nenhuma tarefa encontrada com os critérios especificados."
        context = "## 📋 TAREFAS DETALHADAS\n\n"
        from collections import Counter
        priority_map = {1: 'Urgente', 2: 'Alta', 3: 'Média', 4: 'Baixa', 5: 'Pode Esperar'}
        priorities = [priority_map.get(t.get('priority'), 'N/A') for t in tasks_data]
        counts = Counter(priorities)
        chart_data = [{"name": k, "value": v} for k, v in counts.items()]
        if force_chart or len(chart_data) > 0:
            chart_block = (
                "```chart\n" +
                json.dumps({
                    "type": "bar",
                    "data": chart_data,
                    "xKey": "name",
                    "yKey": "value",
                    "barColor": "#f59e42"
                }, ensure_ascii=False) +
                "\n```\n\n"
            )
            context += chart_block
        context += (
            "Cada linha inclui ações rápidas: [Ver Tarefa](/tasks/ID) e [Concluir Tarefa](action://complete-task?task=ID) se aplicável.\n\n"
        )
        context += "| Tarefa | Cliente | Status | Prioridade | Prazo | Responsável | Ações |\n"
        context += "|--------|---------|--------|------------|-------|-------------|--------|\n"
        for task in tasks_data[:15]:
            title = task.get('title', 'N/A')[:30] + '...' if len(task.get('title', '')) > 30 else task.get('title', 'N/A')
            client = task.get('client_name', 'N/A')
            status = task.get('status', 'N/A')
            priority = priority_map.get(task.get('priority'), 'N/A')
            deadline = task.get('deadline', 'N/A')
            assigned = task.get('assigned_to', 'N/A')
            task_id = task.get('id', '')
            link = f"[Ver Tarefa](/tasks/{task_id})"
            action = f"[Concluir Tarefa](action://complete-task?task={task_id})" if status != 'completed' else ''
            actions = f"{link} <br> {action}" if action else link
            context += f"| {title} | {client} | {status} | {priority} | {deadline} | {assigned} | {actions} |\n"
        return context

    def _format_specific_client_context(self, client_data):
        """Format specific client data with full details, chart, links, and actions"""
        client = client_data.get('client', {})
        tasks_summary = client_data.get('tasks_summary', {})
        profitability = client_data.get('recent_profitability', [])
        context = f"## 👤 CLIENTE DETALHADO: {client.get('name', 'N/A')}\n\n"
        # Chart for recent profitability
        if profitability and len(profitability) >= 2:
            chart_data = [
                {"name": f"{p.get('month')}/{p.get('year')}", "value": float(p.get('profit_margin', 0))}
                for p in profitability[:6]
            ]
            chart_block = (
                "```chart\n" +
                json.dumps({
                    "type": "bar",
                    "data": chart_data,
                    "xKey": "name",
                    "yKey": "value",
                    "barColor": "#10b981"
                }, ensure_ascii=False) +
                "\n```\n\n"
            )
            context += chart_block
        # Action buttons and link
        client_id = client.get('id', '')
        actions = f"[Ver Cliente](/clients/{client_id}) <br> [Criar Tarefa](action://create-task?client={client_id})"
        context += f"Ações rápidas: {actions}\n\n"
        # Basic info
        context += "### Informações Básicas\n"
        context += f"- **Taxa Mensal**: {client.get('monthly_fee', 0):.2f}€\n"
        context += f"- **Gestor de Conta**: {client.get('account_manager', 'N/A')}\n"
        context += f"- **Tags Fiscais**: {', '.join(client.get('fiscal_tags', [])) or 'Nenhuma'}\n"
        context += f"- **Cliente desde**: {client.get('created_at', 'N/A')}\n\n"
        # Tasks summary
        context += "### Resumo de Tarefas\n"
        context += f"- **Ativas**: {tasks_summary.get('active', 0)}\n"
        context += f"- **Concluídas**: {tasks_summary.get('completed', 0)}\n"
        context += f"- **Em Atraso**: {tasks_summary.get('overdue', 0)}\n\n"
        # Recent profitability
        if profitability:
            context += "### Rentabilidade Recente\n"
            for p in profitability[:3]:
                status = "✅ Rentável" if p.get('is_profitable') else "❌ Não Rentável"
                context += f"- **{p.get('month')}/{p.get('year')}**: {p.get('profit', 0):.2f}€ ({p.get('profit_margin', 0):.1f}%) {status}\n"
        # Time spent
        time_spent = client_data.get('recent_time_spent_minutes', 0)
        if time_spent > 0:
            hours = time_spent // 60
            minutes = time_spent % 60
            context += f"\n### Tempo Gasto (Últimos 30 dias)\n- **Total**: {hours}h {minutes}m\n"
        return context

    def _format_profitability_context(self, profitability_data):
        """Format profitability data with chart and action button"""
        context = "## 💰 ANÁLISE DE RENTABILIDADE\n\n"
        # Try to extract chartable data
        if isinstance(profitability_data, dict):
            # Example: profitability_data["current_month"]
            current = profitability_data.get("current_month", {})
            if current and all(k in current for k in ("profitable_clients", "unprofitable_clients")):
                chart_data = [
                    {"name": "Rentáveis", "value": current.get("profitable_clients", 0)},
                    {"name": "Não Rentáveis", "value": current.get("unprofitable_clients", 0)}
                ]
                chart_block = (
                    "```chart\n" +
                    json.dumps({
                        "type": "pie",
                        "data": chart_data,
                        "xKey": "name",
                        "yKey": "value",
                        "colors": ["#10b981", "#ef4444"]
                    }, ensure_ascii=False) +
                    "\n```\n\n"
                )
                context += chart_block
        # Action button to view profitability report
        context += "[Ver Relatório de Rentabilidade](action://view-profitability-report)\n\n"
        context += "Dados detalhados de rentabilidade carregados para análise.\n"
        return context

    def _format_generated_reports_context(self, reports_data):
        """
        Format the generated reports context for the LLM, with table, download link, and action button.
        """
        if not reports_data:
            return "Nenhum relatório gerado encontrado para a organização."
        context = "## 📑 RELATÓRIOS GERADOS\n\n"
        context += "| Nome | Tipo | Formato | Data | Status | Ações |\n"
        context += "|------|------|---------|------|--------|--------|\n"
        for r in reports_data:
            name = r.get('name', '-')
            report_type = r.get('report_type', '-')
            report_format = r.get('report_format', '-')
            date = r.get('created_at', '-')[:10]
            status = r.get('status', '-')
            download = f"[Download]({r['storage_url']})" if r.get('storage_url') else ''
            view = f"[Ver Relatório](action://view-report?report={r.get('id','')})"
            actions = f"{download} <br> {view}"
            context += f"| {name} | {report_type} | {report_format} | {date} | {status} | {actions} |\n"
        return context

    def _update_session_state(self, session_state, query, additional_context):
        """Update session state with query metadata"""
        try:
            # Track topics discussed
            topics = session_state.setdefault('conversation_metadata', {}).setdefault('topics_discussed', [])
            
            # Simple topic extraction
            query_lower = query.lower()
            if 'cliente' in query_lower:
                topics.append('clients')
            if 'tarefa' in query_lower:
                topics.append('tasks')
            if 'rentabil' in query_lower:
                topics.append('profitability')
            
            # Track data requests
            data_requests = session_state['conversation_metadata'].setdefault('data_requests', [])
            if additional_context:
                data_requests.extend(list(additional_context.keys()))
            
            # Keep only unique topics and recent requests
            session_state['conversation_metadata']['topics_discussed'] = list(set(topics))[-10:]
            session_state['conversation_metadata']['data_requests'] = data_requests[-20:]
            
        except Exception as e:
            logger.error(f"Error updating session state: {str(e)}")

    def _is_error_response(self, response):
        """Check if the response indicates an error"""
        if not response:
            return True
        error_indicators = [
            "Erro ao comunicar",
            "erro inesperado",
            "API error",
            "timeout",
            "connection error",
            "rate limit",
            "unauthorized"
        ]
        return any(indicator.lower() in response.lower() for indicator in error_indicators)

    def get_session_info(self, session_id):
        """Get enhanced session information"""
        try:
            conversation_history = cache.get(session_id)
            session_state = cache.get(f"{session_id}_state")
            
            if not conversation_history or not session_state:
                return None
            
            metadata = session_state.get('conversation_metadata', {})
            
            return {
                "session_id": session_id,
                "turns": len(conversation_history) // 2,
                "context_types_sent": session_state.get('context_sent', []),
                "topics_discussed": metadata.get('topics_discussed', []),
                "data_requests_count": len(metadata.get('data_requests', [])),
                "organization_id": session_state.get('organization_id'),
                "last_activity": "recent"
            }
        except Exception as e:
            logger.error(f"Error getting enhanced session info: {e}")
            return None

    def end_session(self, session_id):
        """End session and clean up cache"""
        try:
            cache.delete(session_id)
            cache.delete(f"{session_id}_state")
            logger.info(f"Enhanced session {session_id} ended and cleaned up")
            return True
        except Exception as e:
            logger.error(f"Error ending enhanced session {session_id}: {e}")
            return False

    def health_check(self):
        """Perform a comprehensive health check"""
        try:
            # Check configuration
            self._validate_configuration()
            
            # Test API connectivity
            api_ok, api_message = self._test_api_connectivity()
            
            # Check cache connectivity
            cache_ok = self._test_cache_connectivity()
            
            status = "healthy"
            if not api_ok or not cache_ok:
                status = "degraded"
            
            return {
                "status": status,
                "api_status": "OK" if api_ok else api_message,
                "cache_status": "OK" if cache_ok else "Cache not available",
                "configuration": "OK",
                "features": {
                    "progressive_context": True,
                    "session_state": cache_ok,
                    "context_suggestions": True
                },
                "timestamp": timezone.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": str(e),
                "configuration": "ERROR",
                "timestamp": timezone.now().isoformat()
            }

    def _test_api_connectivity(self):
        """Test basic connectivity to Gemini API"""
        try:
            test_payload = {
                "contents": [{
                    "parts": [{
                        "text": "Hello, this is a connectivity test."
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 10
                }
            }
            
            response = requests.post(
                f"{settings.GEMINI_API_URL}?key={settings.GEMINI_API_KEY}",
                json=test_payload,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return True, "API connectivity OK"
            elif response.status_code == 401:
                return False, "API key inválida"
            elif response.status_code == 403:
                return False, "Acesso negado à API"
            elif response.status_code == 429:
                return False, "Rate limit excedido"
            else:
                return False, f"API retornou código {response.status_code}"
                
        except Timeout:
            return False, "Timeout na conexão com a API"
        except ConnectionError:
            return False, "Falha de conectividade com a API"
        except Exception as e:
            return False, f"Erro na validação da API: {str(e)}"

    def _test_cache_connectivity(self):
        """Test cache connectivity"""
        try:
            test_key = f"health_check_{uuid.uuid4()}"
            cache.set(test_key, "test", timeout=60)
            result = cache.get(test_key)
            cache.delete(test_key)
            return result == "test"
        except Exception:
            return False