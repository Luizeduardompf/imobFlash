"""
Configurações da aplicação
Carrega variáveis de ambiente do arquivo .env
"""
import os
from typing import List
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()


class Settings:
    """Configurações da aplicação"""
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # API
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:8000,http://127.0.0.1:8000"
    ).split(",")
    
    @property
    def is_openai_configured(self) -> bool:
        """Verifica se OpenAI está configurado"""
        return bool(self.OPENAI_API_KEY)
    
    @property
    def is_supabase_configured(self) -> bool:
        """Verifica se Supabase está configurado"""
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY)


# Instância global de configurações
settings = Settings()

