import platform
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user_optional
from app.models.user import User
from app.services.agent.orchestrator import agent_orchestrator, AgentExecutionResult
from app.services.agent.tools import agent_tools_registry, Tool

router = APIRouter()


class AgentExecuteRequest(BaseModel):
    command: str = Field(..., description="Natural language command or transcribed voice query")
    include_voice: bool = Field(default=True, description="Whether to include text for speech synthesis")


class DirectToolExecuteRequest(BaseModel):
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters to pass to the tool")


@router.post("/execute", response_model=AgentExecutionResult)
async def execute_agent_command(
    request: AgentExecuteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Execute a natural language voice or text command through the JARVIS Agent.
    Runs the zero-latency deterministic offline intent parser first, falling back to LLM if needed.
    """
    user_id = None
    if current_user:
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")

    context = {
        "session": session,
        "user_id": user_id,
        "current_user": current_user,
    }

    result = await agent_orchestrator.execute_command(request.command, context)
    return result


@router.get("/tools", response_model=List[Tool])
async def list_available_tools():
    """
    List all available OS-native and internal tools registered in the JARVIS Agent.
    """
    return agent_tools_registry.list_tools()


@router.post("/tools/{tool_name}/execute")
async def direct_execute_tool(
    tool_name: str,
    request: DirectToolExecuteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Directly execute a registered tool with explicit typed parameters.
    """
    tool = agent_tools_registry.get_tool(tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

    user_id = None
    if current_user:
        user_id = current_user.id if hasattr(current_user, "id") else current_user.get("id")

    context = {
        "session": session,
        "user_id": user_id,
    }

    result = await agent_tools_registry.execute(tool_name, request.parameters, context)
    return result


@router.get("/status")
async def get_agent_status():
    """
    Get runtime status of the JARVIS Agent execution engine.
    """
    tools = agent_tools_registry.list_tools()
    return {
        "status": "ready",
        "agent_name": "Neuro JARVIS Engine",
        "platform": platform.system(),
        "total_tools": len(tools),
        "offline_capable": True,
        "categories": list(set(t.category for t in tools)),
    }
