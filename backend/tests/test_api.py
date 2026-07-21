import uuid

import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_note_crud():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Create
        create_data = {
            "title": "Test Note",
            "content": "This is a test note.",
            "tags": ["test", "api"],
        }
        res_create = await ac.post("/api/v1/notes", json=create_data)
        assert res_create.status_code == 200, res_create.text
        note_id = res_create.json()["id"]
        assert res_create.json()["title"] == "Test Note"
        assert set(res_create.json()["tags"]) == {"test", "api"}

        # Read
        res_get = await ac.get(f"/api/v1/notes/{note_id}")
        assert res_get.status_code == 200
        assert res_get.json()["id"] == note_id

        # Update
        update_data = {"title": "Updated Title", "tags": ["test", "updated"]}
        res_update = await ac.put(f"/api/v1/notes/{note_id}", json=update_data)
        assert res_update.status_code == 200
        assert res_update.json()["title"] == "Updated Title"
        assert set(res_update.json()["tags"]) == {"test", "updated"}

        # Bi-directional link extraction
        target_id = str(uuid.uuid4())
        link_content = f"Linking to another note: [[{target_id}]]"
        res_link = await ac.put(f"/api/v1/notes/{note_id}", json={"content": link_content})
        assert res_link.status_code == 200

        # Ideally we'd verify the link is stored in DB directly or via an API endpoint.
        # But this tests that extraction didn't crash.

        # Delete
        res_delete = await ac.delete(f"/api/v1/notes/{note_id}")
        assert res_delete.status_code == 204

        res_get_deleted = await ac.get(f"/api/v1/notes/{note_id}")
        assert res_get_deleted.status_code == 404
