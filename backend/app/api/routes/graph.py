from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.security import get_current_user

router = APIRouter()

@router.get("")
async def get_graph(
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    # Stub for returning notes and their relationships (nodes and edges)
    return {"nodes": [], "edges": []}
