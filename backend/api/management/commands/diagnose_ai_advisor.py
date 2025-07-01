# management/commands/diagnose_ai_advisor.py
"""
Django management command para diagnosticar problemas do AI Advisor
Uso: python manage.py diagnose_ai_advisor
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.cache import cache
import requests
import json
import sys
import importlib
from datetime import datetime

class Command(BaseCommand):
    help = 'Diagnóstica problemas de configuração do AI Advisor'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra informações detalhadas',
        )
        parser.add_argument(
            '--test-api',
            action='store_true',
            help='Testa a conectividade com a API Gemini',
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        self.test_api = options['test_api']
        
        self.stdout.write(self.style.SUCCESS('=== DIAGNÓSTICO DO AI ADVISOR ===\n'))
        
        # 1. Verificar configurações
        config_ok = self.check_configuration()
        
        # 2. Verificar dependências
        deps_ok = self.check_dependencies()
        
        # 3. Testar API (se solicitado)
        api_ok = True
        if self.test_api:
            api_ok = self.test_gemini_api()
        
        # 4. Verificar base de dados
        db_ok = self.check_database()
        
        # 5. Verificar cache
        cache_ok = self.check_cache()
        
        # Sumário final
        self.print_summary(config_ok, deps_ok, api_ok, db_ok, cache_ok)

    def check_configuration(self):
        """Verifica se todas as configurações necessárias estão presentes"""
        self.stdout.write(self.style.WARNING('1. VERIFICANDO CONFIGURAÇÕES'))
        
        checks = []
        
        # GEMINI_API_KEY
        try:
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            if api_key and len(api_key.strip()) > 0:
                # Mask the API key for security
                if len(api_key) > 12:
                    masked_key = api_key[:8] + '*' * (len(api_key) - 12) + api_key[-4:]
                else:
                    masked_key = '*' * len(api_key)
                self.stdout.write(f'   ✓ GEMINI_API_KEY: {masked_key}')
                checks.append(True)
            else:
                self.stdout.write(self.style.ERROR('   ✗ GEMINI_API_KEY: NÃO CONFIGURADA'))
                checks.append(False)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ GEMINI_API_KEY: Erro ao verificar - {str(e)}'))
            checks.append(False)
        
        # GEMINI_API_URL
        try:
            api_url = getattr(settings, 'GEMINI_API_URL', None)
            if api_url and len(api_url.strip()) > 0:
                self.stdout.write(f'   ✓ GEMINI_API_URL: {api_url}')
                checks.append(True)
            else:
                self.stdout.write(self.style.ERROR('   ✗ GEMINI_API_URL: NÃO CONFIGURADA'))
                checks.append(False)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ GEMINI_API_URL: Erro ao verificar - {str(e)}'))
            checks.append(False)
        
        # Configurações opcionais
        if self.verbose:
            try:
                cache_timeout = getattr(settings, 'AI_ADVISOR_CACHE_TIMEOUT', 3600)
                max_turns = getattr(settings, 'AI_ADVISOR_MAX_TURNS', 20)
                self.stdout.write(f'   • Cache timeout: {cache_timeout}s')
                self.stdout.write(f'   • Max conversation turns: {max_turns}')
            except Exception as e:
                self.stdout.write(f'   • Erro ao verificar configurações opcionais: {str(e)}')
        
        self.stdout.write('')
        return all(checks)

    def check_dependencies(self):
        """Verifica se as dependências Python estão instaladas"""
        self.stdout.write(self.style.WARNING('2. VERIFICANDO DEPENDÊNCIAS'))
        
        dependencies = [
            ('requests', 'requests'),
            ('django', 'django'),
            ('rest_framework', 'djangorestframework'),
            ('corsheaders', 'django-cors-headers'),
        ]
        
        checks = []
        for module_name, package_name in dependencies:
            try:
                importlib.import_module(module_name)
                self.stdout.write(f'   ✓ {package_name}: Instalado')
                checks.append(True)
            except ImportError:
                self.stdout.write(self.style.ERROR(f'   ✗ {package_name}: NÃO INSTALADO'))
                checks.append(False)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   ✗ {package_name}: Erro - {str(e)}'))
                checks.append(False)
        
        self.stdout.write('')
        return all(checks)

    def test_gemini_api(self):
        """Testa a conectividade com a API Gemini"""
        self.stdout.write(self.style.WARNING('3. TESTANDO API GEMINI'))
        
        try:
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            api_url = getattr(settings, 'GEMINI_API_URL', None)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro ao obter configurações: {str(e)}'))
            self.stdout.write('')
            return False
        
        if not api_key or not api_url:
            self.stdout.write(self.style.ERROR('   ✗ Configurações em falta, não é possível testar'))
            self.stdout.write('')
            return False
        
        # Payload de teste simples
        test_payload = {
            "contents": [{
                "parts": [{
                    "text": "Hello, this is a test. Please respond with 'Test successful'."
                }]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 50
            }
        }
        
        try:
            self.stdout.write('   • A testar conectividade...')
            response = requests.post(
                f"{api_url}?key={api_key}",
                json=test_payload,
                timeout=30,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if ('candidates' in data and 
                        len(data['candidates']) > 0 and 
                        'content' in data['candidates'][0] and
                        'parts' in data['candidates'][0]['content'] and
                        len(data['candidates'][0]['content']['parts']) > 0):
                        
                        ai_response = data['candidates'][0]['content']['parts'][0].get('text', '')
                        self.stdout.write('   ✓ API responde correctamente')
                        if self.verbose and ai_response:
                            truncated_response = ai_response[:100] + '...' if len(ai_response) > 100 else ai_response
                            self.stdout.write(f'     Resposta: {truncated_response}')
                        self.stdout.write('')
                        return True
                    else:
                        self.stdout.write(self.style.ERROR('   ✗ Resposta da API em formato inesperado'))
                        if self.verbose:
                            self.stdout.write(f'     Resposta recebida: {json.dumps(data, indent=2)[:300]}...')
                        self.stdout.write('')
                        return False
                except json.JSONDecodeError:
                    self.stdout.write(self.style.ERROR('   ✗ Resposta da API não é JSON válido'))
                    if self.verbose:
                        self.stdout.write(f'     Conteúdo: {response.text[:200]}...')
                    self.stdout.write('')
                    return False
            elif response.status_code == 401:
                self.stdout.write(self.style.ERROR('   ✗ API Key inválida (401 Unauthorized)'))
                self.stdout.write('')
                return False
            elif response.status_code == 403:
                self.stdout.write(self.style.ERROR('   ✗ Acesso negado (403 Forbidden)'))
                if self.verbose:
                    self.stdout.write(f'     Detalhes: {response.text[:200]}...')
                self.stdout.write('')
                return False
            elif response.status_code == 429:
                self.stdout.write(self.style.ERROR('   ✗ Rate limit excedido (429 Too Many Requests)'))
                self.stdout.write('')
                return False
            else:
                error_text = response.text[:200] if response.text else 'Sem conteúdo'
                self.stdout.write(self.style.ERROR(f'   ✗ Erro HTTP {response.status_code}: {error_text}...'))
                self.stdout.write('')
                return False
                
        except requests.exceptions.Timeout:
            self.stdout.write(self.style.ERROR('   ✗ Timeout na conexão (>30s)'))
            self.stdout.write('')
            return False
        except requests.exceptions.ConnectionError as e:
            self.stdout.write(self.style.ERROR('   ✗ Erro de conectividade'))
            if self.verbose:
                self.stdout.write(f'     Detalhes: {str(e)}')
            self.stdout.write('')
            return False
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro inesperado: {str(e)}'))
            self.stdout.write('')
            return False

    def check_database(self):
        """Verifica se as tabelas necessárias existem na base de dados"""
        self.stdout.write(self.style.WARNING('4. VERIFICANDO BASE DE DADOS'))
        
        try:
            # Import models with error handling
            try:
                from api.models import Profile, Organization, Task, Client
            except ImportError as e:
                self.stdout.write(self.style.ERROR(f'   ✗ Erro ao importar models: {str(e)}'))
                self.stdout.write('')
                return False
            
            # Test basic queries
            try:
                orgs_count = Organization.objects.count()
                profiles_count = Profile.objects.count()
                tasks_count = Task.objects.count()
                clients_count = Client.objects.count()
                
                self.stdout.write('   ✓ Tabelas acessíveis')
                self.stdout.write(f'   • Organizações: {orgs_count}')
                self.stdout.write(f'   • Perfis: {profiles_count}')
                self.stdout.write(f'   • Tarefas: {tasks_count}')
                self.stdout.write(f'   • Clientes: {clients_count}')
                
                # Check for admin profiles
                admin_profiles = Profile.objects.filter(is_org_admin=True).count()
                self.stdout.write(f'   • Administradores: {admin_profiles}')
                
                if admin_profiles == 0:
                    self.stdout.write(self.style.WARNING('   ⚠ Nenhum administrador encontrado - necessário para usar AI Advisor'))
                
                self.stdout.write('')
                return True
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   ✗ Erro ao executar queries: {str(e)}'))
                self.stdout.write('')
                return False
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro geral na verificação da base de dados: {str(e)}'))
            self.stdout.write('')
            return False

    def check_cache(self):
        """Verifica se o sistema de cache está a funcionar"""
        self.stdout.write(self.style.WARNING('5. VERIFICANDO CACHE'))
        
        try:
            # Test write and read
            test_key = f'ai_advisor_test_{int(datetime.now().timestamp())}'
            test_value = 'test_value_12345'
            
            # Set cache value
            cache.set(test_key, test_value, 60)
            
            # Get cache value
            retrieved_value = cache.get(test_key)
            
            if retrieved_value == test_value:
                self.stdout.write('   ✓ Cache a funcionar correctamente')
                
                # Clean up
                try:
                    cache.delete(test_key)
                except:
                    pass  # Ignore cleanup errors
                
                # Cache backend info
                if self.verbose:
                    try:
                        cache_config = getattr(settings, 'CACHES', {})
                        default_cache = cache_config.get('default', {})
                        cache_backend = default_cache.get('BACKEND', 'Desconhecido')
                        self.stdout.write(f'     Backend: {cache_backend}')
                        
                        if 'LOCATION' in default_cache:
                            self.stdout.write(f'     Localização: {default_cache["LOCATION"]}')
                    except Exception as e:
                        self.stdout.write(f'     Erro ao obter info do cache: {str(e)}')
                
                self.stdout.write('')
                return True
            else:
                self.stdout.write(self.style.ERROR(f'   ✗ Cache não funciona (esperado: {test_value}, obtido: {retrieved_value})'))
                self.stdout.write('')
                return False
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Erro no sistema de cache: {str(e)}'))
            self.stdout.write('')
            return False

    def print_summary(self, config_ok, deps_ok, api_ok, db_ok, cache_ok):
        """Imprime sumário final do diagnóstico"""
        self.stdout.write(self.style.SUCCESS('=== SUMÁRIO ==='))
        
        checks = [
            ('Configurações', config_ok),
            ('Dependências', deps_ok),
            ('Base de dados', db_ok),
            ('Cache', cache_ok),
        ]
        
        if self.test_api:
            checks.append(('API Gemini', api_ok))
        
        all_ok = all(result for _, result in checks)
        
        for name, result in checks:
            status = '✓' if result else '✗'
            style_func = self.style.SUCCESS if result else self.style.ERROR
            self.stdout.write(style_func(f'{status} {name}'))
        
        self.stdout.write('')
        
        if all_ok:
            self.stdout.write(self.style.SUCCESS('🎉 TUDO OK! O AI Advisor deve funcionar correctamente.'))
        else:
            self.stdout.write(self.style.ERROR('❌ PROBLEMAS DETECTADOS! Verifique os itens em falta acima.'))
            self.stdout.write('')
            self.stdout.write('💡 SOLUÇÕES SUGERIDAS:')
            
            if not config_ok:
                self.stdout.write('   • Configure GEMINI_API_KEY e GEMINI_API_URL no arquivo .env')
                self.stdout.write('   • Obtenha uma API key em: https://aistudio.google.com/')
                self.stdout.write('   • Exemplo de .env:')
                self.stdout.write('     GEMINI_API_KEY=sua_chave_aqui')
                self.stdout.write('     GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent')
            
            if not deps_ok:
                self.stdout.write('   • Execute: pip install -r requirements.txt')
                self.stdout.write('   • Ou instale individualmente: pip install requests djangorestframework django-cors-headers')
            
            if not api_ok and self.test_api:
                self.stdout.write('   • Verifique a API key e conectividade de internet')
                self.stdout.write('   • Teste manualmente em: https://aistudio.google.com/')
                self.stdout.write('   • Verifique se a API key tem permissões correctas')
            
            if not db_ok:
                self.stdout.write('   • Execute: python manage.py migrate')
                self.stdout.write('   • Verifique a configuração da base de dados em settings.py')
                self.stdout.write('   • Crie um superuser: python manage.py createsuperuser')
            
            if not cache_ok:
                self.stdout.write('   • Verifique a configuração do cache em settings.py')
                self.stdout.write('   • Se usar Redis, certifique-se que está em execução')
                self.stdout.write('   • Para desenvolvimento, pode usar cache em memória: CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}')
        
        self.stdout.write('')
        self.stdout.write('📄 Para mais informações, consulte a documentação ou execute:')
        self.stdout.write('   python manage.py diagnose_ai_advisor --verbose --test-api')
        
        # Exit code para scripts
        if not all_ok:
            sys.exit(1)