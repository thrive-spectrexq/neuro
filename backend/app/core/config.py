from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

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
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # JWT Settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
