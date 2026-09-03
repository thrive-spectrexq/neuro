"""
End-to-end smoke tests for key API endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(test_client: AsyncClient):
    # Basic health probe
    res = await test_client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data

    # Liveness probe
    res_live = await test_client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.json() == {"status": "ok"}

    # Readiness probe
    res_ready = await test_client.get("/health/ready")
    assert res_ready.status_code == 200
    ready_data = res_ready.json()
    assert "status" in ready_data
    assert "checks" in ready_data


@pytest.mark.asyncio
async def test_auth_and_user_flow(test_client: AsyncClient):
    # Register new user
    reg_payload = {
        "email": "smoketest@example.com",
        "username": "smokeuser",
        "password": "smokepassword123",
    }
    reg_res = await test_client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code in (200, 201)

    # Login
    login_data = {
        "username": "smokeuser",
        "password": "smokepassword123",
    }
    login_res = await test_client.post("/api/v1/auth/login", data=login_data)
    assert login_res.status_code == 200
    token_info = login_res.json()
    assert "access_token" in token_info
    assert token_info["token_type"] == "bearer"

    token = token_info["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify me endpoint
    me_res = await test_client.get("/api/v1/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "smokeuser"


@pytest.mark.asyncio
async def test_note_lifecycle(test_client: AsyncClient, auth_headers: dict[str, str]):
    # Create note
    note_data = {
        "title": "Smoke Note Title",
        "content": "This is a smoke test note content for verification.",
    }
    create_res = await test_client.post("/api/v1/notes", json=note_data, headers=auth_headers)
    assert create_res.status_code in (200, 201)
    created = create_res.json()
    note_id = created["id"]
    assert created["title"] == note_data["title"]

    # Read notes list
    list_res = await test_client.get("/api/v1/notes", headers=auth_headers)
    assert list_res.status_code == 200
    notes = list_res.json()
    assert any(n["id"] == note_id for n in notes)

    # Read note by id
    get_res = await test_client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["content"] == note_data["content"]

    # Delete note
    del_res = await test_client.delete(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert del_res.status_code in (200, 204)
