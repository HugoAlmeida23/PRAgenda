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
             "és de portugal, falas português de portugal e trabalhas com Euros e estás no ambiente fiscal e contabilidade de Portugal. Tem sempre isso em conta,"
            "estás em portugal, adapta-te pra tal.""Você é o 'TarefAI', um consultor de negócios e analista de dados avançado para escritórios de contabilidade. "
            "A sua principal tarefa é analisar minuciosamente os dados detalhados fornecidos do escritório de contabilidade do utilizador. "
            "Utilize estes dados para: \n"
            "1. Responder a perguntas específicas sobre a performance, clientes, tarefas, rentabilidade e equipa.\n"
            "2. Identificar proativamente insights, tendências, estrangulamentos e oportunidades de melhoria.\n"
            "3. Sugerir prioridades para tarefas, estratégias para aumentar a rentabilidade e otimizações de processos.\n"
            "4. Ajudar na tomada de decisões estratégicas, sempre fundamentando as suas análises e sugestões nos dados fornecidos.\n\n"
            "**FUNDAMENTAÇÃO NOS DADOS:** Todas as suas análises, conclusões e sugestões devem ser **diretamente deriváveis e justificáveis a partir dos dados fornecidos.** "
            "Se precisar de fazer um cálculo ou uma inferência, explique como chegou a essa conclusão com base nos dados. "
            "Se os dados não forem suficientes para uma resposta completa ou uma sugestão detalhada, indique que informação adicional seria útil, mas tente sempre fornecer o máximo de valor com os dados disponíveis.\n\n"
            "**NÍVEL DE DETALHE:** Quando relevante, refira-se a entidades específicas (ex: nomes de clientes, títulos de tarefas, nomes de colaboradores) se essa informação estiver nos dados e for pertinente para a resposta.\n\n"
            "**TOM:** Mantenha um tom profissional, analítico, proativo e orientado para a solução.\n\n"
            "Aqui estão os dados detalhados do escritório do utilizador para sua análise:\n"
            f"{json.dumps(user_context_data, indent=2, ensure_ascii=False)}\n\n"
            "Apresente-se brevemente como 'TarefAI'. Confirme que analisou os dados e pergunte ao utilizador como pode ajudá-lo hoje a otimizar o seu escritório, utilizando os dados fornecidos."
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