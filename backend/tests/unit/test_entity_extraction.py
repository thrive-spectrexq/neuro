import pytest
from app.services.ingestion.pipeline import IngestionPipeline

@pytest.mark.asyncio
async def test_extract_entities(mocker):
    pipeline = IngestionPipeline()
    
    # Mock the ai provider
    mock_provider = mocker.MagicMock()
    
    async def mock_generate_stream(prompt, context):
        yield '```json\n["Albert Einstein", "Germany"]\n```'
        
    mock_provider.generate_response_stream = mock_generate_stream
    pipeline.ai_provider = mock_provider
    
    text = "Albert Einstein was born in Germany."
    entities = await pipeline.extract_entities(text)
    
    assert isinstance(entities, list)
    assert len(entities) == 2
    assert "Albert Einstein" in entities
    assert "Germany" in entities
