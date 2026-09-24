import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.agent_registry import AgentDefinition, AgentExecution
from app.models.user import User
from app.schemas.agent_registry import (
    AgentCreate,
    AgentExecuteRequest,
    AgentExecuteResponse,
    AgentExecutionHistoryResponse,
    AgentResponse,
    AgentUpdate,
)
from app.services.agent.orchestrator import agent_orchestrator

router = APIRouter()


@router.get("", response_model=list[AgentResponse])
async def list_agents(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    stmt = select(AgentDefinition).where(AgentDefinition.user_id == user_uuid)
    result = await session.execute(stmt)
    agents = result.scalars().all()
    return agents


@router.post("", response_model=AgentResponse)
async def create_agent(
    agent_in: AgentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    agent_data = agent_in.model_dump()
    agent = AgentDefinition(**agent_data, user_id=user_uuid)
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if agent.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    agent_in: AgentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if agent.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = agent_in.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(agent, key, value)
        agent.updated_at = datetime.now(UTC)
        
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=204, response_class=Response)
async def delete_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if agent.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Clean up executions before deleting agent
    await session.execute(delete(AgentExecution).where(AgentExecution.agent_id == agent.id))
    
    await session.delete(agent)
    await session.commit()


@router.post("/{agent_id}/execute", response_model=AgentExecuteResponse)
async def execute_agent(
    agent_id: uuid.UUID,
    request_in: AgentExecuteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if agent.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not agent.is_active:
        raise HTTPException(status_code=400, detail="Agent is not active")

    # Call orchestrator
    result = await agent_orchestrator.execute(
        session=session,
        user_id=user_uuid,
        agent_id=agent.id,
        command=request_in.command,
        context=request_in.context
    )
    
    return result


@router.post("/execute", response_model=AgentExecuteResponse)
async def auto_route_execute(
    request_in: AgentExecuteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    
    # Try to find first active agent
    stmt = select(AgentDefinition).where(
        AgentDefinition.user_id == user_uuid, 
        AgentDefinition.is_active == True
    ).limit(1)
    result = await session.execute(stmt)
    agent = result.scalar_one_or_none()
    
    if not agent:
        # Create a default agent
        agent = AgentDefinition(
            name="Default Assistant",
            description="Auto-created default assistant",
            user_id=user_uuid
        )
        session.add(agent)
        await session.commit()
        await session.refresh(agent)
        
    # Call orchestrator
    result = await agent_orchestrator.execute(
        session=session,
        user_id=user_uuid,
        agent_id=agent.id,
        command=request_in.command,
        context=request_in.context
    )
    
    return result


@router.get("/{agent_id}/history", response_model=list[AgentExecutionHistoryResponse])
async def agent_history(
    agent_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if agent.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    stmt = select(AgentExecution).where(
        AgentExecution.agent_id == agent.id
    ).order_by(AgentExecution.created_at.desc()).limit(limit)
    
    result = await session.execute(stmt)
    history = result.scalars().all()
    return history
