from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.security import get_current_user

router = APIRouter()

@router.get("")
async def search_notes(
    q: str = Query(..., description="Search query"),
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    # Stub for hybrid search (Full-text + Semantic)
    return {"query": q, "results": []}
