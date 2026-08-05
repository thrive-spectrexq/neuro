import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.agent.tools import agent_tools_registry
from app.services.agent.orchestrator import agent_orchestrator


@pytest.mark.asyncio
async def test_agent_tools_registry_listing():
    tools = agent_tools_registry.list_tools()
    tool_names = [t.name for t in tools]
    assert "open_app" in tool_names
    assert "play_spotify" in tool_names
    assert "web_search" in tool_names
    assert "create_quick_note" in tool_names
    assert "set_reminder" in tool_names
    assert "search_knowledge_base" in tool_names
    assert "system_action" in tool_names


@pytest.mark.asyncio
async def test_agent_system_action_execution():
    res = await agent_tools_registry.execute("system_action", {"action": "time"})
    assert res.success is True
    assert "time" in res.data or "Current time" in res.message


@pytest.mark.asyncio
async def test_orchestrator_wake_command():
    res = await agent_orchestrator.execute_command("Neuro wake up")
    assert res.success is True
    assert "listening" in res.voice_response.lower() or "active" in res.display_text.lower()


@pytest.mark.asyncio
async def test_orchestrator_quick_note():
    res = await agent_orchestrator.execute_command("add this to note: meeting with product design team")
    assert res.success is True
    assert res.tool_name == "create_quick_note"
    assert "meeting with product design team" in res.parameters.get("content", "")


@pytest.mark.asyncio
async def test_agent_execute_api_route():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/agent/execute", json={"command": "what time is it"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["tool_name"] == "system_action"


@pytest.mark.asyncio
async def test_agent_tools_api_route():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/agent/tools")
    assert response.status_code == 200
    tools = response.json()
    assert len(tools) >= 7
