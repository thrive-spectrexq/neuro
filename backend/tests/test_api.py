import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_note_crud(test_client: AsyncClient, auth_headers: dict[str, str]):
    # Create
    create_data = {
        "title": "Test Note",
        "content": "This is a test note.",
        "tags": ["test", "api"],
    }
    res_create = await test_client.post("/api/v1/notes", json=create_data, headers=auth_headers)
    assert res_create.status_code in [200, 201], res_create.text
    note_id = res_create.json()["id"]
    assert res_create.json()["title"] == "Test Note"
    assert set(res_create.json()["tags"]) == {"test", "api"}

    # Read
    res_get = await test_client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == note_id

    # Update
    update_data = {"title": "Updated Title", "tags": ["test", "updated"]}
    res_update = await test_client.put(f"/api/v1/notes/{note_id}", json=update_data, headers=auth_headers)
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "Updated Title"
    assert set(res_update.json()["tags"]) == {"test", "updated"}

    # Bi-directional link extraction
    target_id = str(uuid.uuid4())
    link_content = f"Linking to another note: [[{target_id}]]"
    res_link = await test_client.put(f"/api/v1/notes/{note_id}", json={"content": link_content}, headers=auth_headers)
    assert res_link.status_code == 200

    # Delete
    res_delete = await test_client.delete(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert res_delete.status_code == 204

    res_get_deleted = await test_client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert res_get_deleted.status_code == 404
