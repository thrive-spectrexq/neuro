import pytest
from app.services.ai.provider import MockAIProvider, get_ai_provider

@pytest.mark.asyncio
async def test_mock_ai_provider_stream():
    provider = MockAIProvider()
    chunks = []
    async for chunk in provider.generate_response_stream("Hello", context=[]):
        chunks.append(chunk)
    
    full_text = "".join(chunks)
    assert "simulated AI response" in full_text
    assert "Hello" in full_text

@pytest.mark.asyncio
async def test_mock_ai_provider_summarize():
    provider = MockAIProvider()
    summary = await provider.summarize_text("Neuro is an AI second brain application.")
    assert len(summary) > 0

@pytest.mark.asyncio
async def test_mock_ai_provider_extract_tags():
    provider = MockAIProvider()
    tags = await provider.extract_tags("Python FastAPI Machine Learning")
    assert isinstance(tags, list)
