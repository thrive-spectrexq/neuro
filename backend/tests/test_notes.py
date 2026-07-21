import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_note(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.post(
        "/api/v1/notes",
        json={"title": "Test Note", "content": "Test Content"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Note"
    assert data["content"] == "Test Content"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_note(test_client: AsyncClient, auth_headers: dict[str, str]):
    # First create
    create_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Get Note", "content": "Get Content"},
        headers=auth_headers
    )
    note_id = create_resp.json()["id"]

    # Then get
    get_resp = await test_client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == note_id

@pytest.mark.asyncio
async def test_get_note_not_found(test_client: AsyncClient, auth_headers: dict[str, str]):
    fake_id = str(uuid.uuid4())
    response = await test_client.get(f"/api/v1/notes/{fake_id}", headers=auth_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_list_notes_empty(test_client: AsyncClient, auth_headers: dict[str, str]):
    # Note: test DB is persistent per session, so there might be notes from other tests.
    # We will check if it returns a 200 and has a list.
    response = await test_client.get("/api/v1/notes", headers=auth_headers)
    assert response.status_code == 200
    assert "items" in response.json()
    assert isinstance(response.json()["items"], list)

@pytest.mark.asyncio
async def test_list_notes_pagination(test_client: AsyncClient, auth_headers: dict[str, str]):
    # Create multiple notes
    for i in range(5):
        await test_client.post(
            "/api/v1/notes",
            json={"title": f"Note {i}", "content": "Content"},
            headers=auth_headers
        )
    
    response = await test_client.get("/api/v1/notes?skip=0&limit=3", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 3
    assert "total" in data

@pytest.mark.asyncio
async def test_update_note(test_client: AsyncClient, auth_headers: dict[str, str]):
    create_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Old Title", "content": "Old Content"},
        headers=auth_headers
    )
    note_id = create_resp.json()["id"]

    update_resp = await test_client.put(
        f"/api/v1/notes/{note_id}",
        json={"title": "New Title"},
        headers=auth_headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "New Title"
    assert update_resp.json()["content"] == "Old Content"

@pytest.mark.asyncio
async def test_delete_note(test_client: AsyncClient, auth_headers: dict[str, str]):
    create_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Delete Me", "content": "Content"},
        headers=auth_headers
    )
    note_id = create_resp.json()["id"]

    del_resp = await test_client.delete(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    get_resp = await test_client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert get_resp.status_code == 404

@pytest.mark.asyncio
async def test_create_note_with_tags(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.post(
        "/api/v1/notes",
        json={"title": "Tagged Note", "content": "Content", "tags": ["important", "urgent"]},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "important" in data["tags"]
    assert "urgent" in data["tags"]

@pytest.mark.asyncio
async def test_link_notes(test_client: AsyncClient, auth_headers: dict[str, str]):
    target_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Target Note", "content": "Target content"},
        headers=auth_headers
    )
    target_id = target_resp.json()["id"]

    source_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Source Note", "content": f"Linking to [[Target Note]] and [{target_id}]({target_id})"},
        headers=auth_headers
    )
    assert source_resp.status_code == 200
    data = source_resp.json()
    
    # Check forward links
    fwd = [link["id"] for link in data.get("forward_links", [])]
    assert target_id in fwd
