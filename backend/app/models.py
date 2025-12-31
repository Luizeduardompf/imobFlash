"""
Modelos Pydantic para validação de dados
"""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class Message(BaseModel):
    """Modelo de mensagem"""
    message_id: str = Field(..., description="ID único da mensagem")
    conversation_id: str = Field(..., description="ID da conversa")
    content: str = Field(..., description="Conteúdo da mensagem")
    timestamp: datetime = Field(..., description="Data e hora da mensagem")
    sender: Literal["client", "agent"] = Field(..., description="Remetente da mensagem")
    time: Optional[float] = Field(None, description="Tempo de resposta (opcional)")
    order: Optional[int] = Field(None, description="Ordem da mensagem (opcional)")


class AnalysisRequest(BaseModel):
    """Request para análise de mensagens"""
    conversation_id: str = Field(..., description="ID da conversa")
    messages: List[Message] = Field(..., description="Lista de mensagens para análise")
    analysis_type: Literal["summary", "sentiment", "intent", "lead_quality"] = Field(
        ..., 
        description="Tipo de análise a ser realizada"
    )


class AnalysisResponse(BaseModel):
    """Response da análise"""
    success: bool = Field(..., description="Indica se a análise foi bem-sucedida")
    conversation_id: str = Field(..., description="ID da conversa")
    analysis_type: str = Field(..., description="Tipo de análise realizada")
    result: Optional[Dict[str, Any]] = Field(None, description="Resultado da análise")
    error: Optional[str] = Field(None, description="Mensagem de erro, se houver")

