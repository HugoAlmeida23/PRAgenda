#!/usr/bin/env python3
"""
Teste standalone da API Gemini - pode ser executado fora do Django
Uso: python test_gemini_standalone.py
"""

import os
import sys
import requests
import json
from datetime import datetime

def load_env_file(env_path='.env'):
    """Carrega variáveis de ambiente do arquivo .env"""
    if os.path.exists(env_path):
        print(f"📁 Carregando variáveis de ambiente de: {env_path}")
        with open(env_path, 'r') as file:
            for line in file:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print("✅ Variáveis de ambiente carregadas")
    else:
        print(f"⚠️  Arquivo {env_path} não encontrado")

def test_gemini_api():
    """Testa a API Gemini de forma independente"""
    print("🧪 TESTE STANDALONE DA API GEMINI")
    print("=" * 50)
    
    # Obter configurações
    api_key = os.getenv('GEMINI_API_KEY')
    api_url = os.getenv('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent')
    
    print(f"🔑 API Key: {'✅ Configurada' if api_key else '❌ Não configurada'}")
    if api_key:
        masked_key = api_key[:8] + '*' * (len(api_key) - 12) + api_key[-4:] if len(api_key) > 12 else '*' * len(api_key)
        print(f"    Valor mascarado: {masked_key}")
    
    print(f"🌐 API URL: {api_url}")
    print()
    
    if not api_key:
        print("❌ ERRO: GEMINI_API_KEY não configurada")
        print("💡 Para resolver:")
        print("   1. Obtenha uma API key em: https://aistudio.google.com/")
        print("   2. Adicione ao arquivo .env: GEMINI_API_KEY=sua_chave_aqui")
        print("   3. Ou defina como variável de ambiente: export GEMINI_API_KEY=sua_chave_aqui")
        return False
    
    # Payload de teste
    test_payload = {
        "contents": [{
            "parts": [{
                "text": "Responda apenas com 'Teste bem-sucedido' em português."
            }]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "topP": 0.9,
            "topK": 40,
            "maxOutputTokens": 50
        }
    }
    
    print("📤 Enviando pedido de teste...")
    print(f"   Payload: {json.dumps(test_payload, indent=2, ensure_ascii=False)}")
    print()
    
    try:
        # Fazer pedido
        start_time = datetime.now()
        response = requests.post(
            f"{api_url}?key={api_key}",
            json=test_payload,
            timeout=30,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "TarefAI-Diagnostics/1.0"
            }
        )
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds()
        
        print(f"⏱️  Tempo de resposta: {response_time:.2f}s")
        print(f"📊 Status Code: {response.status_code}")
        
        # Analisar resposta
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ SUCESSO: API respondeu correctamente")
                print(f"📥 Resposta completa: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                # Extrair texto da resposta
                if ('candidates' in data and 
                    len(data['candidates']) > 0 and 
                    'content' in data['candidates'][0] and
                    'parts' in data['candidates'][0]['content'] and
                    len(data['candidates'][0]['content']['parts']) > 0):
                    
                    ai_text = data['candidates'][0]['content']['parts'][0].get('text', '')
                    print(f"🤖 Resposta do AI: '{ai_text}'")
                    
                    # Verificar se contém resposta esperada
                    if 'teste' in ai_text.lower() and 'sucedido' in ai_text.lower():
                        print("🎉 TESTE COMPLETAMENTE BEM-SUCEDIDO!")
                        return True
                    else:
                        print("⚠️  AI respondeu, mas não com a mensagem esperada")
                        return True  # Ainda é um sucesso técnico
                else:
                    print("⚠️  Resposta em formato inesperado")
                    return False
                    
            except json.JSONDecodeError as e:
                print(f"❌ ERRO: Resposta não é JSON válido: {str(e)}")
                print(f"📄 Conteúdo da resposta: {response.text[:500]}...")
                return False
                
        elif response.status_code == 401:
            print("❌ ERRO 401: API Key inválida ou expirada")
            print("💡 Soluções:")
            print("   • Verifique se a API key está correcta")
            print("   • Gere uma nova API key em: https://aistudio.google.com/")
            print("   • Verifique se a API key tem permissões para usar o Gemini")
            return False
            
        elif response.status_code == 403:
            print("❌ ERRO 403: Acesso negado")
            print(f"📄 Detalhes: {response.text}")
            print("💡 Possíveis causas:")
            print("   • API key sem permissões adequadas")
            print("   • Serviço não disponível na sua região")
            print("   • Limites de quota excedidos")
            return False
            
        elif response.status_code == 429:
            print("❌ ERRO 429: Rate limit excedido")
            print("💡 Aguarde alguns minutos e tente novamente")
            return False
            
        else:
            print(f"❌ ERRO HTTP {response.status_code}")
            print(f"📄 Resposta: {response.text[:500]}...")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ ERRO: Timeout (>30s)")
        print("💡 Verifique a sua ligação à internet")
        return False
        
    except requests.exceptions.ConnectionError as e:
        print(f"❌ ERRO: Falha de conectividade: {str(e)}")
        print("💡 Verifique:")
        print("   • Ligação à internet")
        print("   • Firewall/proxy")
        print("   • DNS")
        return False
        
    except Exception as e:
        print(f"❌ ERRO INESPERADO: {str(e)}")
        return False

def test_multiple_requests():
    """Testa múltiplos pedidos para verificar consistência"""
    print("\n🔄 TESTE DE MÚLTIPLOS PEDIDOS")
    print("=" * 30)
    
    api_key = os.getenv('GEMINI_API_KEY')
    api_url = os.getenv('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent')
    
    if not api_key:
        print("❌ API Key não configurada - a saltar teste")
        return False
    
    success_count = 0
    total_tests = 3
    
    for i in range(total_tests):
        print(f"📤 Teste {i+1}/{total_tests}...")
        
        test_payload = {
            "contents": [{
                "parts": [{
                    "text": f"Responda apenas com o número {i+1}"
                }]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 10
            }
        }
        
        try:
            response = requests.post(
                f"{api_url}?key={api_key}",
                json=test_payload,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if ('candidates' in data and len(data['candidates']) > 0):
                    ai_text = data['candidates'][0]['content']['parts'][0].get('text', '')
                    print(f"   ✅ Resposta: '{ai_text.strip()}'")
                    success_count += 1
                else:
                    print("   ❌ Formato de resposta inválido")
            else:
                print(f"   ❌ Status: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Erro: {str(e)}")
    
    print(f"\n📊 Resultado: {success_count}/{total_tests} testes bem-sucedidos")
    return success_count == total_tests

def main():
    """Função principal"""
    print("🚀 INICIANDO DIAGNÓSTICO DA API GEMINI")
    print("=" * 60)
    print()
    
    # Carregar variáveis de ambiente
    load_env_file()
    print()
    
    # Teste básico
    basic_test_ok = test_gemini_api()
    
    # Teste de múltiplos pedidos (apenas se o básico passou)
    multiple_test_ok = True
    if basic_test_ok:
        multiple_test_ok = test_multiple_requests()
    
    # Sumário final
    print("\n" + "=" * 60)
    print("📋 SUMÁRIO FINAL")
    print("=" * 60)
    
    if basic_test_ok and multiple_test_ok:
        print("🎉 TODOS OS TESTES PASSARAM!")
        print("✅ A API Gemini está a funcionar correctamente")
        print("✅ O AI Advisor deve funcionar sem problemas")
        sys.exit(0)
    elif basic_test_ok:
        print("⚠️  TESTE BÁSICO PASSOU, MAS HOUVE PROBLEMAS NOS TESTES MÚLTIPLOS")
        print("✅ A API funciona, mas pode haver problemas de consistência")
        sys.exit(1)
    else:
        print("❌ TESTES FALHARAM!")
        print("❌ A API Gemini não está acessível ou configurada correctamente")
        print("\n💡 PRÓXIMOS PASSOS:")
        print("   1. Verifique a configuração da API key")
        print("   2. Teste manualmente em: https://aistudio.google.com/")
        print("   3. Verifique a conectividade de internet")
        print("   4. Consulte a documentação do Gemini API")
        sys.exit(1)

if __name__ == "__main__":
    main()