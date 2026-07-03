from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai.provider import get_ai_provider
from app.services.search.engine import search_engine

router = APIRouter()
ai_provider = get_ai_provider()

class ChatRequest(BaseModel):
    message: str
    include_context: bool = True
    limit_context: int = 5

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    context = []
    if request.include_context:
        # Perform hybrid search to retrieve context
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
        context = await search_engine.hybrid_search(
            session=session,
            query=request.message,
            user_id=user_id,
            limit=request.limit_context
        )
        
    async def response_stream():
        async for chunk in ai_provider.generate_response_stream(request.message, context):
            yield chunk

    return StreamingResponse(response_stream(), media_type="text/event-stream")
