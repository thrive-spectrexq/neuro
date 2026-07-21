from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai.provider import get_ai_provider
from app.services.search.engine import search_engine

router = APIRouter()
settings = get_settings()


class ChatRequest(BaseModel):
    message: str
    include_context: bool = True
    limit_context: int = 5


class SummarizeRequest(BaseModel):
    text: str


class ExtractTagsRequest(BaseModel):
    text: str


@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    provider = get_ai_provider()
    context = []
    if request.include_context:
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")
        context = await search_engine.hybrid_search(
            session=session,
            query=request.message,
            user_id=user_id,
            limit=request.limit_context,
        )

    async def response_stream():
        async for chunk in provider.generate_response_stream(request.message, context):
            yield chunk

    return StreamingResponse(response_stream(), media_type="text/event-stream")


@router.post("/summarize")
async def summarize_content(request: SummarizeRequest, current_user: User = Depends(get_current_user)):
    provider = get_ai_provider()
    summary = await provider.summarize_text(request.text)
    return {"summary": summary}


@router.post("/extract-tags")
async def extract_tags_content(request: ExtractTagsRequest, current_user: User = Depends(get_current_user)):
    provider = get_ai_provider()
    tags = await provider.extract_tags(request.text)
    return {"tags": tags}


@router.get("/status")
async def get_ai_status(current_user: User = Depends(get_current_user)):
    provider = get_ai_provider()
    provider_name = provider.__class__.__name__
    return {
        "active_provider": provider_name,
        "openai_configured": bool(getattr(settings, "OPENAI_API_KEY", None)),
        "anthropic_configured": bool(getattr(settings, "ANTHROPIC_API_KEY", None)),
        "ollama_url": settings.OLLAMA_BASE_URL,
        "embedding_model": settings.EMBEDDING_MODEL,
    }
