import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import or_, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.tool_registry import ToolCategory, ToolDefinition
from app.models.user import User
from app.schemas.tool_registry import ToolCategoryResponse, ToolCreate, ToolResponse, ToolUpdate

router = APIRouter()


@router.get("", response_model=list[ToolResponse])
async def list_tools(
    category: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id

    # Allow fetching global tools (user_id is None) and user-specific tools
    stmt = select(ToolDefinition).where(or_(ToolDefinition.user_id.is_(None), ToolDefinition.user_id == user_uuid))

    if category:
        try:
            tool_cat = ToolCategory(category)
            stmt = stmt.where(ToolDefinition.category == tool_cat)
        except ValueError:
            pass

    result = await session.execute(stmt)
    tools = result.scalars().all()
    return tools


@router.post("", response_model=ToolResponse)
async def create_tool(
    tool_in: ToolCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id

    # Check if a tool with the same name already exists
    stmt = select(ToolDefinition).where(ToolDefinition.name == tool_in.name)
    result = await session.execute(stmt)
    existing_tool = result.scalar_one_or_none()

    if existing_tool:
        raise HTTPException(status_code=400, detail="Tool with this name already exists")

    try:
        category = ToolCategory(tool_in.category)
    except ValueError:
        category = ToolCategory.custom

    tool_data = tool_in.model_dump(exclude={"category"})
    tool = ToolDefinition(**tool_data, category=category, user_id=user_uuid)

    session.add(tool)
    await session.commit()
    await session.refresh(tool)
    return tool


@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: uuid.UUID,
    tool_in: ToolUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tool = await session.get(ToolDefinition, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id

    # Cannot modify global tools or tools belonging to someone else
    if tool.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to modify this tool")

    update_data = tool_in.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(tool, key, value)

    session.add(tool)
    await session.commit()
    await session.refresh(tool)
    return tool


@router.delete("/{tool_id}", status_code=204, response_class=Response)
async def delete_tool(
    tool_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tool = await session.get(ToolDefinition, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id

    # Cannot delete global tools or tools belonging to someone else
    if tool.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tool")

    await session.delete(tool)
    await session.commit()


@router.get("/categories", response_model=ToolCategoryResponse)
async def list_categories(
    current_user: User = Depends(get_current_user),
):
    categories = [cat.value for cat in ToolCategory]
    return ToolCategoryResponse(categories=categories)
