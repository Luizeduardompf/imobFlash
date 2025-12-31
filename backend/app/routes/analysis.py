"""
Rotas de análise de mensagens
"""
import logging
from fastapi import APIRouter, HTTPException, status
from app.models import AnalysisRequest, AnalysisResponse
from app.config import settings
from app.services.openai_service import OpenAIService
from app.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# Inicializa serviços
openai_service = None
supabase_service = None

try:
    openai_service = OpenAIService()
except Exception as e:
    logger.error(f"Erro ao inicializar OpenAI Service: {e}")

try:
    supabase_service = SupabaseService()
except Exception as e:
    logger.error(f"Erro ao inicializar Supabase Service: {e}")


@router.get("/health")
async def health_check():
    """
    Verifica status dos serviços
    
    Returns:
        Dicionário com status dos serviços
    """
    return {
        "openai_configured": settings.is_openai_configured and openai_service is not None,
        "supabase_configured": settings.is_supabase_configured and supabase_service is not None,
        "status": "ok"
    }


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_messages(request: AnalysisRequest):
    """
    Analisa mensagens de uma conversa
    
    Args:
        request: Request com dados da análise
        
    Returns:
        Response com resultado da análise
        
    Raises:
        HTTPException: Em caso de erro
    """
    try:
        # Valida se OpenAI está configurado
        if not settings.is_openai_configured or not openai_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI não está configurado"
            )
        
        # Valida se há mensagens
        if not request.messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lista de mensagens vazia"
            )
        
        logger.info(
            f"Iniciando análise {request.analysis_type} "
            f"para conversa {request.conversation_id} "
            f"com {len(request.messages)} mensagens"
        )
        
        # Realiza análise
        try:
            result = await openai_service.analyze(
                messages=request.messages,
                analysis_type=request.analysis_type
            )
        except Exception as e:
            logger.error(f"Erro na análise: {e}")
            return AnalysisResponse(
                success=False,
                conversation_id=request.conversation_id,
                analysis_type=request.analysis_type,
                result=None,
                error=str(e)
            )
        
        # Salva no banco (opcional, não falha se der erro)
        if supabase_service:
            try:
                await supabase_service.save_analysis(
                    conversation_id=request.conversation_id,
                    analysis_type=request.analysis_type,
                    result=result
                )
            except Exception as e:
                logger.warning(f"Erro ao salvar análise no banco: {e}")
                # Não falha a requisição se não conseguir salvar
        
        return AnalysisResponse(
            success=True,
            conversation_id=request.conversation_id,
            analysis_type=request.analysis_type,
            result=result,
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar análise: {str(e)}"
        )

