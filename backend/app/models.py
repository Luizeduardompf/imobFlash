"""
Modelos Pydantic para validação de dados
"""
from typing import List, Optional, Literal, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class Message(BaseModel):
    """Modelo de mensagem"""
    message_id: str = Field(..., description="ID único da mensagem")
    conversation_id: str = Field(..., description="ID da conversa")
    content: str = Field(..., description="Conteúdo da mensagem")
    timestamp: Union[datetime, str] = Field(..., description="Data e hora da mensagem")
    sender: Literal["client", "agent"] = Field(..., description="Remetente da mensagem")
    time: Optional[float] = Field(None, description="Tempo de resposta (opcional)")
    order: Optional[int] = Field(None, description="Ordem da mensagem (opcional)")
    
    @field_validator('timestamp', mode='before')
    @classmethod
    def parse_timestamp(cls, v):
        """Converte string ISO para datetime se necessário"""
        if isinstance(v, str):
            try:
                # Remove 'Z' e substitui por '+00:00' para timezone UTC
                v_clean = v.replace('Z', '+00:00')
                return datetime.fromisoformat(v_clean)
            except ValueError:
                # Tenta parse sem timezone
                try:
                    return datetime.fromisoformat(v)
                except:
                    # Fallback: usa datetime.now() se não conseguir parsear
                    return datetime.now()
        return v


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

