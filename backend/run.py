"""
Script para rodar o servidor em desenvolvimento
"""
import sys
import os

# Verifica se está em ambiente virtual
if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    print("⚠️  AVISO: Ambiente virtual não detectado!")
    print("   Execute: source venv/bin/activate")
    print("   Ou use: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt")
    sys.exit(1)

try:
    import uvicorn
    from app.config import settings
except ImportError as e:
    print(f"❌ Erro ao importar dependências: {e}")
    print("   Execute: pip install -r requirements.txt")
    sys.exit(1)

if __name__ == "__main__":
    print(f"🚀 Iniciando servidor em http://{settings.API_HOST}:{settings.API_PORT}")
    print(f"📚 Documentação: http://localhost:{settings.API_PORT}/docs")
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level="info"
    )

