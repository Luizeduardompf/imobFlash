"""
Aplicação FastAPI principal
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import analysis

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Cria aplicação FastAPI
app = FastAPI(
    title="ImobFlash API",
    description="API para análise de mensagens usando OpenAI",
    version="1.0.0"
)

# Configura CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui rotas
app.include_router(analysis.router)

logger.info("Aplicação FastAPI inicializada")


@app.get("/")
async def root():
    """
    Rota raiz - status da API
    
    Returns:
        Dicionário com status da API
    """
    return {
        "status": "ok",
        "message": "ImobFlash API está rodando",
        "version": "1.0.0"
    }

