"""
Serviço de integração com Supabase
"""
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from app.config import settings
from app.models import Message

logger = logging.getLogger(__name__)


class SupabaseService:
    """Serviço para interação com Supabase"""
    
    def __init__(self):
        """Inicializa o serviço Supabase"""
        if not settings.is_supabase_configured:
            logger.warning("Supabase não está configurado")
            self.client: Optional[Client] = None
        else:
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Supabase Service inicializado")
            except Exception as e:
                logger.error(f"Erro ao inicializar Supabase: {e}")
                self.client = None
    
    async def get_messages(self, conversation_id: str) -> List[Message]:
        """
        Busca mensagens de uma conversa
        
        Args:
            conversation_id: ID da conversa
            
        Returns:
            Lista de mensagens
            
        Raises:
            ValueError: Se Supabase não estiver configurado
            Exception: Em caso de erro na busca
        """
        if not self.client:
            raise ValueError("Supabase não está configurado")
        
        try:
            logger.info(f"Buscando mensagens da conversa: {conversation_id}")
            
            response = self.client.table("messages")\
                .select("*")\
                .eq("conversation_id", conversation_id)\
                .order("timestamp", desc=False)\
                .execute()
            
            messages = []
            for row in response.data:
                try:
                    message = Message(
                        message_id=row.get("message_id", ""),
                        conversation_id=row.get("conversation_id", ""),
                        content=row.get("content", ""),
                        timestamp=row.get("timestamp"),
                        sender=row.get("sender", "client"),
                        time=row.get("time"),
                        order=row.get("order")
                    )
                    messages.append(message)
                except Exception as e:
                    logger.warning(f"Erro ao processar mensagem: {e}")
                    continue
            
            logger.info(f"{len(messages)} mensagens encontradas")
            return messages
            
        except Exception as e:
            logger.error(f"Erro ao buscar mensagens: {e}")
            raise
    
    async def save_analysis(
        self, 
        conversation_id: str, 
        analysis_type: str, 
        result: Dict[str, Any]
    ) -> bool:
        """
        Salva resultado da análise no banco de dados
        
        Args:
            conversation_id: ID da conversa
            analysis_type: Tipo de análise
            result: Resultado da análise
            
        Returns:
            True se salvou com sucesso, False caso contrário
            
        Raises:
            ValueError: Se Supabase não estiver configurado
        """
        if not self.client:
            raise ValueError("Supabase não está configurado")
        
        try:
            logger.info(f"Salvando análise {analysis_type} para conversa {conversation_id}")
            
            # Verifica se já existe uma análise deste tipo
            existing = self.client.table("message_analyses")\
                .select("id")\
                .eq("conversation_id", conversation_id)\
                .eq("analysis_type", analysis_type)\
                .execute()
            
            if existing.data:
                # Atualiza existente
                self.client.table("message_analyses")\
                    .update({
                        "result": result,
                        "updated_at": "now()"
                    })\
                    .eq("conversation_id", conversation_id)\
                    .eq("analysis_type", analysis_type)\
                    .execute()
                logger.info("Análise atualizada")
            else:
                # Cria nova
                self.client.table("message_analyses")\
                    .insert({
                        "conversation_id": conversation_id,
                        "analysis_type": analysis_type,
                        "result": result
                    })\
                    .execute()
                logger.info("Análise criada")
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar análise: {e}")
            return False

