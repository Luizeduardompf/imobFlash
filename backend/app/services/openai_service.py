"""
Serviço de integração com OpenAI API
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Literal
from openai import OpenAI
from app.config import settings
from app.models import Message

logger = logging.getLogger(__name__)


class OpenAIService:
    """Serviço para análise de mensagens usando OpenAI"""
    
    def __init__(self):
        """Inicializa o serviço OpenAI"""
        if not settings.is_openai_configured:
            logger.warning("OpenAI não está configurado")
            self.client = None
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI Service inicializado")
    
    def _prepare_messages_context(self, messages: List[Message]) -> str:
        """
        Prepara o contexto das mensagens para o prompt
        
        Args:
            messages: Lista de mensagens
            
        Returns:
            String formatada com o contexto das mensagens
        """
        context_parts = []
        for msg in messages:
            sender_label = "Cliente" if msg.sender == "client" else "Agente"
            timestamp = msg.timestamp.strftime("%d/%m/%Y %H:%M") if isinstance(msg.timestamp, datetime) else str(msg.timestamp)
            context_parts.append(f"[{timestamp}] {sender_label}: {msg.content}")
        
        return "\n".join(context_parts)
    
    def _get_prompts(
        self, 
        analysis_type: Literal["summary", "sentiment", "intent", "lead_quality"],
        messages_context: str
    ) -> tuple[str, str]:
        """
        Retorna os prompts system e user para cada tipo de análise
        
        Args:
            analysis_type: Tipo de análise
            messages_context: Contexto das mensagens formatado
            
        Returns:
            Tupla (system_prompt, user_prompt)
        """
        prompts = {
            "summary": {
                "system": """Você é um assistente especializado em análise de conversas imobiliárias.
Analise a conversa fornecida e retorne um resumo estruturado em JSON com as seguintes informações:
- key_info: objeto com informações principais (cliente, propriedade, interesse, contato)
- next_steps: array de strings com próximos passos sugeridos
- summary: string com resumo geral da conversa""",
                "user": f"""Analise a seguinte conversa e retorne um JSON com o resumo estruturado:

{messages_context}

Retorne APENAS um JSON válido com a estrutura:
{{
    "key_info": {{
        "cliente": "nome ou informações do cliente",
        "propriedade": "informações sobre a propriedade de interesse",
        "interesse": "nível de interesse do cliente",
        "contato": "informações de contato relevantes"
    }},
    "next_steps": ["próximo passo 1", "próximo passo 2"],
    "summary": "resumo geral da conversa"
}}"""
            },
            "sentiment": {
                "system": """Você é um assistente especializado em análise de sentimento em conversas imobiliárias.
Analise o sentimento geral da conversa e retorne um JSON com:
- score: número de -1 a 1 (negativo a positivo)
- sentiment: "positive", "neutral" ou "negative"
- indicators: array de strings com indicadores que justificam o sentimento""",
                "user": f"""Analise o sentimento da seguinte conversa:

{messages_context}

Retorne APENAS um JSON válido com a estrutura:
{{
    "score": 0.8,
    "sentiment": "positive",
    "indicators": ["cliente demonstrou interesse", "perguntas específicas sobre a propriedade"]
}}"""
            },
            "intent": {
                "system": """Você é um assistente especializado em análise de intenção de compra em conversas imobiliárias.
Analise a intenção de compra do cliente e retorne um JSON com:
- intent: "high", "medium" ou "low"
- confidence: número de 0 a 1 (confiança na análise)
- urgency: "high", "medium" ou "low"
- reasons: array de strings com razões que justificam a intenção""",
                "user": f"""Analise a intenção de compra na seguinte conversa:

{messages_context}

Retorne APENAS um JSON válido com a estrutura:
{{
    "intent": "high",
    "confidence": 0.9,
    "urgency": "high",
    "reasons": ["cliente perguntou sobre visita", "demonstrou interesse imediato"]
}}"""
            },
            "lead_quality": {
                "system": """Você é um assistente especializado em qualificação de leads imobiliários.
Analise a qualidade do lead e retorne um JSON com:
- quality: "hot", "warm" ou "cold"
- score: número de 0 a 100
- reasons: array de strings com razões da qualificação
- follow_up_suggestions: array de strings com sugestões de follow-up""",
                "user": f"""Analise a qualidade do lead na seguinte conversa:

{messages_context}

Retorne APENAS um JSON válido com a estrutura:
{{
    "quality": "hot",
    "score": 85,
    "reasons": ["interesse demonstrado", "perguntas específicas", "disponibilidade para visita"],
    "follow_up_suggestions": ["agendar visita", "enviar mais informações", "ligar em 24h"]
}}"""
            }
        }
        
        prompt_config = prompts.get(analysis_type)
        if not prompt_config:
            raise ValueError(f"Tipo de análise inválido: {analysis_type}")
        
        return prompt_config["system"], prompt_config["user"]
    
    async def analyze(
        self, 
        messages: List[Message],
        analysis_type: Literal["summary", "sentiment", "intent", "lead_quality"]
    ) -> Dict[str, Any]:
        """
        Realiza análise das mensagens usando OpenAI
        
        Args:
            messages: Lista de mensagens para análise
            analysis_type: Tipo de análise a ser realizada
            
        Returns:
            Dicionário com o resultado da análise
            
        Raises:
            ValueError: Se OpenAI não estiver configurado ou tipo inválido
            Exception: Em caso de erro na API
        """
        if not self.client:
            raise ValueError("OpenAI não está configurado")
        
        if not messages:
            raise ValueError("Lista de mensagens vazia")
        
        try:
            # Prepara contexto
            messages_context = self._prepare_messages_context(messages)
            
            # Obtém prompts
            system_prompt, user_prompt = self._get_prompts(analysis_type, messages_context)
            
            logger.info(f"Iniciando análise do tipo: {analysis_type}")
            
            # Chama API OpenAI
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            # Extrai resposta
            content = response.choices[0].message.content
            
            # Parse JSON
            try:
                result = json.loads(content)
                logger.info(f"Análise concluída com sucesso: {analysis_type}")
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao fazer parse do JSON: {e}")
                logger.error(f"Conteúdo recebido: {content}")
                raise ValueError(f"Resposta inválida da OpenAI: {e}")
                
        except Exception as e:
            logger.error(f"Erro ao analisar mensagens: {e}")
            raise

