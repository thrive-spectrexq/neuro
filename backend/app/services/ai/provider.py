import json
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import List, Dict, Any

import httpx

from app.core.config import get_settings

settings = get_settings()

class AIProvider(ABC):
    @abstractmethod
    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        pass

    async def summarize_text(self, text: str) -> str:
        """Summarize text using the provider or fallback heuristic."""
        chunks = []
        async for chunk in self.generate_response_stream(
            prompt=f"Summarize the following text in 2-3 concise sentences:\n\n{text}",
            context=[]
        ):
            chunks.append(chunk)
        return "".join(chunks).strip()

    async def extract_tags(self, text: str) -> List[str]:
        """Extract relevant tags from content."""
        chunks = []
        async for chunk in self.generate_response_stream(
            prompt=f"Extract 3 to 5 relevant lower-case topic tags from the following note content. Return only a comma-separated list of words.\n\n{text}",
            context=[]
        ):
            chunks.append(chunk)
        raw_tags = "".join(chunks)
        tags = [t.strip().lower().replace("#", "") for t in raw_tags.split(",") if t.strip()]
        return tags[:5]


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


class AnthropicProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY

    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        context_str = "\n\n".join([f"Title: {c['title']}\nContent: {c['content']}" for c in context])
        system_prompt = "You are a helpful AI assistant. Use the provided notes as context to answer the user's message."
        if context_str:
            system_prompt += f"\n\nContext Notes:\n{context_str}"

        async with httpx.AsyncClient() as client:
            req = client.build_request(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key or "",
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": prompt}],
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
                    try:
                        data = json.loads(line[6:])
                        if data.get("type") == "content_block_delta":
                            delta = data.get("delta", {})
                            if delta.get("type") == "text_delta":
                                yield delta.get("text", "")
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
            try:
                response = await client.send(req, stream=True)
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                        except json.JSONDecodeError:
                            pass
            except Exception as e:
                yield f"[Local AI offline: {str(e)}]"


class MockAIProvider(AIProvider):
    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        response = f"This is a simulated AI response based on {len(context)} notes of context to query: '{prompt}'"
        for word in response.split(" "):
            yield word + " "


def get_ai_provider() -> AIProvider:
    if getattr(settings, "ANTHROPIC_API_KEY", None):
        return AnthropicProvider()
    if getattr(settings, "OPENAI_API_KEY", None):
        return OpenAIProvider()
    if settings.OLLAMA_BASE_URL:
        return OllamaProvider()
    return MockAIProvider()
