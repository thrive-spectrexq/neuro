from abc import ABC, abstractmethod
from app.core.config import get_settings

settings = get_settings()

class AIProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str, context: list[str]) -> str:
        pass

class OpenAIProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        
    async def generate_response(self, prompt: str, context: list[str]) -> str:
        # Implementation would use langchain or openai client
        return "OpenAI generated response"

class OllamaProvider(AIProvider):
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        
    async def generate_response(self, prompt: str, context: list[str]) -> str:
        # Implementation would use httpx to talk to local Ollama
        return "Ollama generated response"
