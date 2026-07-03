import json
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator

import httpx

from app.core.config import get_settings

settings = get_settings()

class AIProvider(ABC):
    @abstractmethod
    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        pass

class OpenAIProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        
    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        context_str = "\n\n".join([f"Title: {c['title']}\nContent: {c['content']}" for c in context])
        system_prompt = "You are a helpful AI assistant. Use the provided notes as context to answer the user's message."
        if context_str:
            system_prompt += f"\n\nContext Notes:\n{context_str}"
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        async with httpx.AsyncClient() as client:
            req = client.build_request(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",
                    "messages": messages,
                    "stream": True
                }
            )
            response = await client.send(req, stream=True)
            if response.status_code != 200:
                error = await response.aread()
                yield json.dumps({"error": error.decode()})
                return
                
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if data["choices"][0]["delta"].get("content"):
                            yield data["choices"][0]["delta"]["content"]
                    except json.JSONDecodeError:
                        pass

class OllamaProvider(AIProvider):
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        
    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        context_str = "\n\n".join([f"Title: {c['title']}\nContent: {c['content']}" for c in context])
        system_prompt = "You are a helpful AI assistant. Use the provided notes as context to answer the user's message."
        if context_str:
            system_prompt += f"\n\nContext Notes:\n{context_str}"
            
        async with httpx.AsyncClient() as client:
            req = client.build_request(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": "llama3",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "stream": True
                }
            )
            response = await client.send(req, stream=True)
            async for line in response.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                    except json.JSONDecodeError:
                        pass

def get_ai_provider() -> AIProvider:
    if settings.OPENAI_API_KEY:
        return OpenAIProvider()
    return OllamaProvider()
