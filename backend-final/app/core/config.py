"""
Configuration centrale — toutes les variables d'environnement.
Lire depuis le fichier .env — aucune valeur sensible dans le code.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Marche-IA Cameroun"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"          # development | staging | production
    DEBUG: bool = False
    SECRET_KEY: str
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    def get_allowed_origins(self) -> List[str]:
        return self.ALLOWED_ORIGINS

    # PostgreSQL
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 3600

    # LLM Provider : "groq" (gratuit) | "gemini" (test) | "anthropic" (production)
    LLM_PROVIDER: str = "groq"
    LLM_MODEL: str = "llama3-70b-8192"
    LLM_MAX_TOKENS: int = 4096
    LLM_TEMPERATURE: float = 0.1

    # Groq (gratuit — 14 400 req/jour)
    GROQ_API_KEY: str = ""

    # Anthropic (production)
    ANTHROPIC_API_KEY: str = ""

    # Google Gemini (test — gratuit jusqu'à 1500 req/jour)
    GEMINI_API_KEY: str = ""

    # Qdrant (base vectorielle)
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "marche_ia_knowledge"

    # Embeddings
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIM: int = 384
    RAG_TOP_K: int = 8
    RAG_MIN_SCORE: float = 0.65

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Email (alertes)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@marche-ia.cm"

    # WhatsApp (Meta Cloud API)
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""

    # Synchronisation ARMP
    ARMP_FEED_URL: str = "https://armp.cm/rss"
    SYNC_INTERVAL_MINUTES: int = 60

    # Monitoring
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    SENTRY_DSN: str = ""

settings = Settings()
