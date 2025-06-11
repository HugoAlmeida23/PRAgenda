import json
import uuid
import logging
from django.core.cache import cache
from .gemini_service import GeminiService # Assuming GeminiService is in the same 'services' directory

logger = logging.getLogger(__name__)

# Cache timeout for conversation history (e.g., 1 hour)
CONVERSATION_CACHE_TIMEOUT = 3600
MAX_CONVERSATION_TURNS = 20 # Max number of user/model turns to keep in history (excluding initial prompt)

class AIAdvisorService:
    def __init__(self):
        self.gemini_service = GeminiService()

    def start_session(self, user_context_data, user):
        """
        Starts a new AI Advisor session.
        - Constructs the initial system prompt with business data.
        - Calls Gemini for an initial acknowledgment.
        - Stores the conversation history in cache.
        - Returns a session ID and Gemini's initial message.
        """
        session_id = f"ai_advisor_session_{user.id}_{uuid.uuid4()}"

        # Construct the detailed initial system prompt for Gemini
        # This prompt is crucial for setting the AI's role and providing initial data.
        initial_system_prompt_text = (
            "Você é um consultor de negócios especializado em escritórios de contabilidade, chamado 'TarefAI Insights Advisor'. "
            "Sua tarefa é analisar os dados fornecidos do escritório de contabilidade do utilizador e ajudá-lo a obter insights, "
            "identificar oportunidades de melhoria, responder a perguntas sobre a performance do escritório, sugerir otimizações "
            "de processos, e auxiliar na tomada de decisões estratégicas. "
            "Baseie suas respostas nos dados fornecidos. Seja proativo em sugerir análises se o utilizador não souber o que perguntar. "
            "Mantenha um tom profissional, amigável e útil.\n\n"
            "Aqui estão os dados agregados do escritório do utilizador para sua análise:\n"
            f"{json.dumps(user_context_data, indent=2, ensure_ascii=False)}\n\n"
            "Por favor, comece por se apresentar brevemente como 'TarefAI Insights Advisor', confirme que analisou os dados fornecidos "
            "e pergunte ao utilizador como pode ajudá-lo hoje a otimizar o seu escritório ou a entender melhor os seus dados."
        )
        
        # The first message to Gemini for a new session
        initial_ai_response = self.gemini_service.generate_conversational_response(
            current_turn_parts=[{"text": initial_system_prompt_text}],
            history=None # No history for the very first call of a session
        )

        if initial_ai_response is None or "Erro ao comunicar" in initial_ai_response or "erro inesperado" in initial_ai_response:
            logger.error(f"Failed to get initial response from Gemini for session {session_id}. AI response: {initial_ai_response}")
            return None, f"Não foi possível contactar o Consultor AI. Detalhe: {initial_ai_response or 'Resposta nula do serviço AI.'}"

        # Store conversation history in cache
        # The initial "user" prompt here is actually our system prompt with all the data.
        # Gemini then responds as "model".
        conversation_history = [
            {"role": "user", "parts": [{"text": initial_system_prompt_text}]},
            {"role": "model", "parts": [{"text": initial_ai_response}]}
        ]
        
        cache.set(session_id, conversation_history, timeout=CONVERSATION_CACHE_TIMEOUT)
        logger.info(f"AI Advisor session {session_id} started for user {user.username}. Initial AI response: {initial_ai_response[:150]}...")

        return session_id, initial_ai_response

    def process_query(self, session_id, user_query_text, user):
        """
        Processes a user's query within an existing session.
        - Retrieves conversation history.
        - Calls Gemini with the history and new query.
        - Updates and stores the new conversation history.
        - Returns Gemini's response.
        """
        conversation_history = cache.get(session_id)
        if conversation_history is None:
            logger.warning(f"AI Advisor session {session_id} not found or expired for user {user.username}.")
            return None, "Sessão inválida ou expirada. Por favor, inicie uma nova conversa."

        # The user's current query
        current_turn_parts = [{"text": user_query_text}]
        
        ai_response_text = self.gemini_service.generate_conversational_response(
            current_turn_parts=current_turn_parts,
            history=conversation_history
        )

        if ai_response_text is None or "Erro ao comunicar" in ai_response_text or "erro inesperado" in ai_response_text:
            logger.error(f"Failed to get response from Gemini for session {session_id}, query '{user_query_text}'. AI response: {ai_response_text}")
            return None, f"Não foi possível obter resposta do Consultor AI. Detalhe: {ai_response_text or 'Resposta nula.'}"
        
        # Update conversation history
        conversation_history.append({"role": "user", "parts": current_turn_parts})
        conversation_history.append({"role": "model", "parts": [{"text": ai_response_text}]})
        
        # Prune history: Keep initial prompt + its response, and last N turns
        if len(conversation_history) > (MAX_CONVERSATION_TURNS + 2): # +2 for initial system prompt & its response
            conversation_history = conversation_history[:2] + conversation_history[-(MAX_CONVERSATION_TURNS):]
            logger.debug(f"Conversation history for session {session_id} pruned to {len(conversation_history)} turns.")

        cache.set(session_id, conversation_history, timeout=CONVERSATION_CACHE_TIMEOUT) # Reset timeout on activity
        logger.info(f"AI Advisor query for session {session_id} by user {user.username}. Query: '{user_query_text[:100]}...'. Response: '{ai_response_text[:150]}...'")

        return ai_response_text, None # response, error