from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    context_ids: list[str] = []

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: str = Depends(get_current_user)
):
    # Stub for AI chat with RAG context
    return {"reply": f"AI response to: {request.message}", "context_used": request.context_ids}
