import json
import uuid
import requests
import logging
from django.conf import settings
from ..constants.prompts import GEMINI_TIME_EXTRACTION_PROMPT
import requests
import time
import random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

CACHE_TIMEOUT = 300  # 5 minutos
CLIENTS_CACHE_KEY = "gemini_clients_{org_id}"
TASKS_CACHE_KEY = "gemini_tasks_{org_id}"
MAX_RETRIES = 3
INITIAL_TIMEOUT = 30
MAX_TIMEOUT = 60
BACKOFF_MULTIPLIER = 2

logger = logging.getLogger(__name__)
# Confiança mínima para aceitar os dados extraídos
MIN_CONFIDENCE_THRESHOLD = 0.3

class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.api_url = settings.GEMINI_API_URL
        self.session = self._create_http_session()

    def _create_http_session(self):
        """Cria uma sessão HTTP com retry automático"""
        session = requests.Session()
        
        # Configurar retry strategy
        retry_strategy = Retry(
            total=MAX_RETRIES,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def process_text(self, text, clients, tasks, default_client=None):
        """
        Chama a API do Gemini para processar o texto.
        """
        start_time = time.time()
        # Validações de entrada
        if not text or not text.strip():
            return {
                "success": False,
                "error": "Texto não pode estar vazio"
            }
        
        if not self.api_key or not self.api_url:
            logger.error("Configurações do Gemini não encontradas")
            return {
                "success": False,
                "error": "Configurações do Gemini não encontradas"
            }
        
        try:
            response = self._make_api_request(text, clients, tasks, default_client)
            
            if response.status_code != 200:
                logger.error(f"Erro na resposta da API Gemini: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Gemini API error: {response.status_code}"
                }
            
            parsed_response = self._parse_gemini_response(response)
            
            # Validar a resposta parseada
            validated_response = self._validate_extracted_data(parsed_response)
            processing_time = time.time() - start_time
            logger.info(f"Processamento NLP concluído em {processing_time:.2f}s")

            if processing_time > 10:
                logger.warning(f"Processamento NLP lento: {processing_time:.2f}s")
            return validated_response
            
        except requests.exceptions.Timeout:
            logger.error("Timeout na requisição para API Gemini após todas as tentativas")
            return {
                "success": False,
                "error": "API Gemini não respondeu em tempo hábil. Tente novamente em alguns minutos."
            }
        except requests.exceptions.ConnectionError:
            logger.error("Falha de conexão com API Gemini após todas as tentativas")
            return {
                "success": False,
                "error": "Não foi possível conectar à API Gemini. Verifique sua conexão de internet."
            }
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else 'desconhecido'
            logger.error(f"Erro HTTP da API Gemini: {status_code}")
            
            if status_code == 429:
                return {
                    "success": False,
                    "error": "Muitas requisições à API Gemini. Aguarde alguns minutos e tente novamente."
                }
            elif status_code in [401, 403]:
                return {
                    "success": False,
                    "error": "Problema de autenticação com API Gemini. Contate o administrador."
                }
            else:
                return {
                    "success": False,
                    "error": f"Erro na API Gemini (código {status_code}). Tente novamente."
                }
        except Exception as e:
            logger.error(f"Erro inesperado na API Gemini: {str(e)}")
            return {
                "success": False,
                "error": f"Erro inesperado: {str(e)}"
            }
    
    def _parse_gemini_response(self, response):
        """Extrai e parseia a resposta JSON do Gemini"""
        try:
            response_json = response.json()
            text_response = response_json["candidates"][0]["content"]["parts"][0]["text"]
            
            logger.info(f"Resposta da API: {text_response[:100]}...")
            
            # Extrair o JSON da resposta
            import re
            json_match = re.search(r'({.*})', text_response, re.DOTALL)
            
            if json_match:
                json_str = json_match.group(1)
                extracted_data = json.loads(json_str)
                return extracted_data
            else:
                logger.warning("Não foi possível extrair JSON da resposta")
                logger.debug(f"Resposta completa: {text_response}")
                return {
                    "success": False,
                    "error": "Could not extract JSON from Gemini response"
                }
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {str(e)}")
            return {
                "success": False,
                "error": f"Error parsing Gemini response: {str(e)}"
            }
        
    def _make_api_request(self, text, clients, tasks, default_client):
        """Faz a requisição para a API do Gemini com retry e timeout progressivo"""
        prompt = GEMINI_TIME_EXTRACTION_PROMPT.format(
            text=text,
            clients=json.dumps(clients, indent=2, cls=UUIDEncoder),
            tasks=json.dumps(tasks, indent=2, cls=UUIDEncoder),
            default_client=json.dumps(default_client, indent=2, cls=UUIDEncoder) if default_client else "Nenhum"
        )
        
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
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Tentar com retry manual para controle mais fino
        for attempt in range(MAX_RETRIES + 1):
            try:
                timeout = min(INITIAL_TIMEOUT * (BACKOFF_MULTIPLIER ** attempt), MAX_TIMEOUT)
                
                logger.info(f"Tentativa {attempt + 1}/{MAX_RETRIES + 1} - Timeout: {timeout}s")
                
                response = self.session.post(
                    f"{self.api_url}?key={self.api_key}",
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                
                # Se chegou aqui, a requisição foi bem-sucedida
                return response
                
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout na tentativa {attempt + 1} (timeout: {timeout}s)")
                if attempt == MAX_RETRIES:
                    raise
                time.sleep(self._calculate_backoff_delay(attempt))
                
            except requests.exceptions.ConnectionError:
                logger.warning(f"Erro de conexão na tentativa {attempt + 1}")
                if attempt == MAX_RETRIES:
                    raise
                time.sleep(self._calculate_backoff_delay(attempt))
                
            except requests.exceptions.HTTPError as e:
                # Para erros HTTP específicos, não fazer retry
                if e.response.status_code in [400, 401, 403]:
                    logger.error(f"Erro HTTP não recuperável: {e.response.status_code}")
                    raise
                
                logger.warning(f"Erro HTTP recuperável na tentativa {attempt + 1}: {e.response.status_code}")
                if attempt == MAX_RETRIES:
                    raise
                time.sleep(self._calculate_backoff_delay(attempt))

    def _calculate_backoff_delay(self, attempt):
        """Calcula delay com jitter para evitar thundering herd"""
        base_delay = BACKOFF_MULTIPLIER ** attempt
        jitter = random.uniform(0.1, 0.5)  # Adiciona variação aleatória
        return base_delay + jitter

    def _validate_extracted_data(self, data):
        """Valida os dados extraídos pelo Gemini"""
        if not isinstance(data, dict):
            return {
                "success": False,
                "error": "Resposta inválida do Gemini"
            }
        
        if not data.get('success', False):
            return data  # Retorna o erro original
        
        # Validar estrutura dos dados
        validated_data = {
            "success": True,
            "clients": self._validate_clients(data.get('clients', [])),
            "tasks": self._validate_tasks(data.get('tasks', [])),
            "times": self._validate_times(data.get('times', [])),
            "activities": self._validate_activities(data.get('activities', []))
        }

        # Verificar se encontrou dados suficientes com confiança adequada
        if not validated_data['clients'] and not validated_data['times']:
            logger.warning("Dados extraídos insuficientes ou baixa confiança")
            validated_data['warning'] = "Poucos dados identificados com confiança suficiente"
        
        return validated_data

    def _validate_clients(self, clients):
        """Valida a lista de clientes extraídos"""
        validated = []
        for client in clients:
            if isinstance(client, dict) and client.get('id') and client.get('name'):
                confidence = float(client.get('confidence', 0.5))
                if confidence >= MIN_CONFIDENCE_THRESHOLD:
                    validated.append({
                        'id': str(client['id']),
                        'name': str(client['name']),
                        'confidence': confidence
                    })
        return validated

    def _validate_tasks(self, tasks):
        """Valida a lista de tarefas extraídas"""
        validated = []
        for task in tasks:
            if isinstance(task, dict) and task.get('id') and task.get('title'):
                confidence = float(task.get('confidence', 0.5))
                if confidence >= MIN_CONFIDENCE_THRESHOLD:
                    validated.append({
                        'id': str(task['id']),
                        'title': str(task['title']),
                        'client_id': str(task.get('client_id', '')),
                        'confidence': confidence
                    })
        return validated

    def _validate_times(self, times):
        """Valida a lista de tempos extraídos"""
        validated = []
        for time_entry in times:
            if isinstance(time_entry, dict):
                minutes = time_entry.get('minutes')
                if isinstance(minutes, (int, float)) and minutes > 0:
                    confidence = float(time_entry.get('confidence', 0.5))
                    if confidence >= MIN_CONFIDENCE_THRESHOLD:
                        validated.append({
                            'minutes': int(minutes),
                            'confidence': confidence,
                            'original_text': str(time_entry.get('original_text', ''))
                        })
            elif isinstance(time_entry, (int, float)) and time_entry > 0:
                # Compatibilidade com formato antigo
                validated.append({
                    'minutes': int(time_entry),
                    'confidence': 0.5,
                    'original_text': ''
                })
        return validated

    def _validate_activities(self, activities):
        """Valida a lista de atividades extraídas"""
        validated = []
        for activity in activities:
            if isinstance(activity, dict) and activity.get('description'):
                confidence = float(activity.get('confidence', 0.5))
                if confidence >= MIN_CONFIDENCE_THRESHOLD:
                    validated.append({
                        'description': str(activity['description']),
                        'confidence': confidence
                    })
            elif isinstance(activity, str) and activity.strip():
                # Compatibilidade com formato antigo
                validated.append({
                    'description': activity.strip(),
                    'confidence': 0.5
                })
        return validated