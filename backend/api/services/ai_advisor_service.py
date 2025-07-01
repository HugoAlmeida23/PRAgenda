# services/ai_advisor_service.py - Versão melhorada
import json
import uuid
import logging
from django.core.cache import cache
from django.conf import settings
from .gemini_service import GeminiService
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

logger = logging.getLogger(__name__)

# Cache timeout for conversation history (e.g., 1 hour)
CONVERSATION_CACHE_TIMEOUT = 3600
MAX_CONVERSATION_TURNS = 20

class AIAdvisorServiceError(Exception):
    """Custom exception for AI Advisor Service errors"""
    pass

class AIAdvisorService:
    def __init__(self):
        # Validate configuration on init with better error messages
        self._validate_configuration()
        
        try:
            self.gemini_service = GeminiService()
        except Exception as e:
            logger.error(f"Failed to initialize GeminiService: {str(e)}")
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

    def _test_api_connectivity(self):
        """Test basic connectivity to Gemini API"""
        try:
            # Simple test request to validate API key and connectivity
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

    def _build_system_prompt(self, user_context_data):
        """Build the system prompt with user's business data."""
        try:
            context_summary = self._summarize_context(user_context_data)
            
            return (
                "Você é um consultor de negócios especializado em escritórios de contabilidade em Portugal. "
                "Trabalha com euros, segue as normas fiscais portuguesas e fala português de Portugal.\n\n"
                "Sua função é analisar os dados fornecidos do escritório e fornecer insights valiosos sobre:\n"
                "- Performance e rentabilidade dos clientes\n"
                "- Gestão de tarefas e prioridades\n"
                "- Otimização de processos\n"
                "- Identificação de oportunidades de melhoria\n\n"
                "Seja sempre específico, fundamentando suas análises nos dados fornecidos. "
                "Quando relevante, mencione nomes específicos (clientes, tarefas, colaboradores) dos dados.\n\n"
                f"Dados do escritório para análise:\n{context_summary}\n\n"
                "Apresente-se como 'TarefAI' e confirme que analisou os dados. "
                "Pergunte como pode ajudar a otimizar o escritório com base nos dados fornecidos."
            )
        except Exception as e:
            logger.error(f"Error building system prompt: {str(e)}")
            # Fallback to simpler prompt
            return (
                "Você é TarefAI, um consultor de negócios para escritórios de contabilidade em Portugal. "
                "Como posso ajudar a otimizar o seu escritório hoje?"
            )

    def _summarize_context(self, user_context_data):
        """Create a more concise summary of context data to avoid token limits"""
        try:
            summary_parts = []
            
            # Organization info
            if 'organization_name' in user_context_data:
                summary_parts.append(f"Organização: {user_context_data['organization_name']}")
            
            # Client overview
            if 'clients_overview' in user_context_data:
                clients = user_context_data['clients_overview']
                summary_parts.append(f"Clientes ativos: {clients.get('total_active_clients', 0)}")
                
                # Sample client details (limit to top 3)
                if 'clients_sample_details' in clients:
                    top_clients = clients['clients_sample_details'][:3]
                    client_names = [c.get('name', 'N/A') for c in top_clients]
                    summary_parts.append(f"Principais clientes: {', '.join(client_names)}")
            
            # Task overview
            if 'tasks_overview' in user_context_data:
                tasks = user_context_data['tasks_overview']
                summary_parts.append(f"Tarefas ativas: {tasks.get('active_tasks', 0)}")
                summary_parts.append(f"Tarefas em atraso: {tasks.get('overdue_tasks', 0)}")
            
            # Profitability
            if 'profitability_snapshot_organization' in user_context_data:
                profit = user_context_data['profitability_snapshot_organization']
                if profit.get('average_profit_margin'):
                    summary_parts.append(f"Margem de lucro média: {profit['average_profit_margin']:.1f}%")
            
            return "\n".join(summary_parts)
            
        except Exception as e:
            logger.error(f"Error summarizing context: {str(e)}")
            return json.dumps(user_context_data, indent=2, ensure_ascii=False)[:1000] + "..."

    def _is_error_response(self, response):
        """Check if the response indicates an error."""
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

    def start_session(self, user_context_data, user):
        """
        Starts a new AI Advisor session with improved error handling.
        """
        try:
            session_id = f"ai_advisor_session_{user.id}_{uuid.uuid4()}"
            logger.info(f"Starting AI Advisor session {session_id} for user {user.username}")

            # Validate input data
            if not user_context_data or not isinstance(user_context_data, dict):
                logger.error("Invalid context data provided")
                return None, "Dados de contexto inválidos fornecidos"

            # Test API connectivity first
            api_ok, api_message = self._test_api_connectivity()
            if not api_ok:
                logger.error(f"API connectivity test failed: {api_message}")
                return None, f"Serviço AI temporariamente indisponível: {api_message}. Tente novamente em alguns minutos."

            # Construct the initial system prompt
            try:
                initial_system_prompt_text = self._build_system_prompt(user_context_data)
                logger.debug(f"System prompt length: {len(initial_system_prompt_text)} characters")
            except Exception as e:
                logger.error(f"Error building system prompt: {str(e)}")
                return None, "Erro ao preparar contexto para o Consultor AI"

            # Get initial response from Gemini with retry logic
            max_retries = 3
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    logger.info(f"Attempting to get AI response (attempt {attempt + 1}/{max_retries})")
                    
                    initial_ai_response = self.gemini_service.generate_conversational_response(
                        current_turn_parts=[{"text": initial_system_prompt_text}],
                        history=None
                    )

                    if initial_ai_response and not self._is_error_response(initial_ai_response):
                        # Success! Store conversation history
                        conversation_history = [
                            {"role": "user", "parts": [{"text": initial_system_prompt_text}]},
                            {"role": "model", "parts": [{"text": initial_ai_response}]}
                        ]
                        
                        cache.set(session_id, conversation_history, timeout=CONVERSATION_CACHE_TIMEOUT)
                        logger.info(f"AI Advisor session {session_id} started successfully. Response length: {len(initial_ai_response)} chars")

                        return session_id, initial_ai_response
                    else:
                        last_error = f"Resposta inválida do Gemini: {initial_ai_response or 'Resposta vazia'}"
                        logger.warning(f"Attempt {attempt + 1} failed: {last_error}")
                        
                except Timeout:
                    last_error = "Timeout na comunicação com o serviço AI"
                    logger.warning(f"Attempt {attempt + 1} timed out")
                    
                except ConnectionError:
                    last_error = "Falha de conectividade com o serviço AI"
                    logger.warning(f"Attempt {attempt + 1} connection failed")
                    
                except Exception as e:
                    last_error = f"Erro inesperado: {str(e)}"
                    logger.error(f"Attempt {attempt + 1} failed with error: {str(e)}")

                # Wait before retry (except on last attempt)
                if attempt < max_retries - 1:
                    import time
                    time.sleep(2 ** attempt)  # Exponential backoff

            # All attempts failed
            logger.error(f"All {max_retries} attempts failed. Last error: {last_error}")
            return None, "Serviço AI temporariamente indisponível. Tente novamente em alguns minutos."

        except AIAdvisorServiceError as e:
            logger.error(f"AI Advisor Service configuration error: {str(e)}")
            return None, str(e)
        except Exception as e:
            error_msg = f"Erro inesperado ao iniciar sessão: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return None, "Erro interno ao iniciar sessão com o Consultor AI"

    def process_query(self, session_id, user_query_text, user):
        """
        Processes a user's query within an existing session with improved error handling.
        """
        try:
            # Validate inputs
            if not session_id or not user_query_text or not user_query_text.strip():
                logger.error("Invalid session_id or query provided")
                return None, "Sessão ou pergunta inválida"

            # Retrieve conversation history
            conversation_history = cache.get(session_id)
            if conversation_history is None:
                logger.warning(f"AI Advisor session {session_id} not found or expired for user {user.username}")
                return None, "Sessão inválida ou expirada. Por favor, recarregue a página para iniciar uma nova conversa."

            # Validate conversation history structure
            if not isinstance(conversation_history, list):
                logger.error(f"Invalid conversation history format for session {session_id}")
                cache.delete(session_id)  # Clean up corrupted cache
                return None, "Sessão corrompida. Por favor, recarregue a página."

            # The user's current query
            current_turn_parts = [{"text": user_query_text.strip()}]
            logger.info(f"Processing query for session {session_id}: '{user_query_text[:100]}...'")
            
            # Get AI response with retry logic
            max_retries = 2  # Fewer retries for queries
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    ai_response_text = self.gemini_service.generate_conversational_response(
                        current_turn_parts=current_turn_parts,
                        history=conversation_history
                    )

                    if ai_response_text and not self._is_error_response(ai_response_text):
                        # Success! Update conversation history
                        conversation_history.append({"role": "user", "parts": current_turn_parts})
                        conversation_history.append({"role": "model", "parts": [{"text": ai_response_text}]})
                        
                        # Prune history if it gets too long
                        if len(conversation_history) > (MAX_CONVERSATION_TURNS + 2):
                            conversation_history = conversation_history[:2] + conversation_history[-(MAX_CONVERSATION_TURNS):]
                            logger.debug(f"Conversation history pruned for session {session_id}")

                        # Save updated history back to cache
                        cache.set(session_id, conversation_history, timeout=CONVERSATION_CACHE_TIMEOUT)
                        
                        logger.info(f"Query processed successfully for session {session_id}. Response length: {len(ai_response_text)} chars")
                        return ai_response_text, None
                    else:
                        last_error = f"Resposta inválida do Gemini: {ai_response_text or 'Resposta vazia'}"
                        
                except Exception as e:
                    last_error = f"Erro na comunicação: {str(e)}"
                    logger.error(f"Query attempt {attempt + 1} failed: {str(e)}")

            # All attempts failed
            logger.error(f"All query attempts failed for session {session_id}. Last error: {last_error}")
            return None, "Não foi possível obter resposta do Consultor AI. Tente novamente."

        except Exception as e:
            error_msg = f"Erro inesperado ao processar pergunta: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return None, "Erro interno ao processar sua pergunta"

    def get_session_info(self, session_id):
        """Get information about a session."""
        try:
            conversation_history = cache.get(session_id)
            if not conversation_history:
                return None
            
            return {
                "session_id": session_id,
                "turns": len(conversation_history) // 2,  # Each turn has user + model
                "last_activity": "recent"  # Could be enhanced with actual timestamps
            }
        except Exception as e:
            logger.error(f"Error getting session info: {e}")
            return None

    def end_session(self, session_id):
        """End a session and clean up cache."""
        try:
            cache.delete(session_id)
            logger.info(f"Session {session_id} ended and cleaned up")
            return True
        except Exception as e:
            logger.error(f"Error ending session {session_id}: {e}")
            return False

    def health_check(self):
        """Perform a health check of the AI Advisor service"""
        try:
            # Check configuration
            self._validate_configuration()
            
            # Test API connectivity
            api_ok, api_message = self._test_api_connectivity()
            
            return {
                "status": "healthy" if api_ok else "degraded",
                "message": api_message,
                "configuration": "OK",
                "timestamp": "2025-07-01T12:00:00Z"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": str(e),
                "configuration": "ERROR",
                "timestamp": "2025-07-01T12:00:00Z"
            }