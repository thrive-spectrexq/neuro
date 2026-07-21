import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_system_stats(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/analytics/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_notes" in data
    assert "total_projects" in data
    assert "total_tasks" in data


@pytest.mark.asyncio
async def test_get_recent_activity(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/analytics/activity", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_export_audit_logs_json(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/analytics/audit/export?format=json", headers=auth_headers)
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_export_audit_logs_csv(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/analytics/audit/export?format=csv", headers=auth_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "id,user_id,project_id" in response.text
