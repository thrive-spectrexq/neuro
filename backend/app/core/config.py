from functools import lru_cache
import logging
from typing import Any

from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("neuro.config")


class Settings(BaseSettings):
    NEURO_ENV: str = "development"
    NEURO_SECRET_KEY: str = "changeme"
    DATABASE_URL: str = "sqlite+aiosqlite:///./neuro.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    OLLAMA_MODEL: str = "llama3"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # JWT Settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # App Settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # 'json' or 'text'
    CORS_ORIGINS: str = "*"
    MAX_PAGE_SIZE: int = 100
    DEFAULT_PAGE_SIZE: int = 20

    @field_validator("NEURO_SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info: ValidationInfo) -> str:
        env = info.data.get("NEURO_ENV", "development")
        if env == "production":
            if v == "changeme" or len(v) < 32:
                raise ValueError("In production, NEURO_SECRET_KEY must be at least 32 characters and not 'changeme'")
        elif v == "changeme":
            logger.warning("Using default insecure 'changeme' NEURO_SECRET_KEY in non-production mode.")
        return v

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
