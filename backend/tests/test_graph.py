import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_graph_empty_or_existing(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/graph", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "links" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["links"], list)


@pytest.mark.asyncio
async def test_graph_with_linked_notes_and_tags(test_client: AsyncClient, auth_headers: dict[str, str]):
    # 1. Create Target Note
    target_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Graph Target Concept", "content": "Foundation of the knowledge graph", "tags": ["graph", "core"]},
        headers=auth_headers,
    )
    assert target_resp.status_code in [200, 201]
    target_data = target_resp.json()

    # 2. Create Source Note linking to target
    source_resp = await test_client.post(
        "/api/v1/notes",
        json={"title": "Graph Source Idea", "content": "Linking to [[Graph Target Concept]] directly.", "tags": ["research"]},
        headers=auth_headers,
    )
    assert source_resp.status_code in [200, 201]
    source_data = source_resp.json()

    # 3. Fetch Knowledge Graph
    graph_resp = await test_client.get("/api/v1/graph", headers=auth_headers)
    assert graph_resp.status_code == 200
    graph_data = graph_resp.json()

    nodes = graph_data["nodes"]
    links = graph_data["links"]

    node_ids = {node["id"] for node in nodes}
    node_names = {node["name"] for node in nodes}

    # Verify both notes exist as nodes
    assert target_data["id"] in node_ids
    assert source_data["id"] in node_ids
    assert "Graph Target Concept" in node_names
    assert "Graph Source Idea" in node_names

    # Verify tags exist as nodes
    assert "#graph" in node_names or "graph" in node_names or any(n.get("type") == "tag" for n in nodes)

    # Verify valid links between source and target
    has_note_link = any(
        link["source"] == source_data["id"] and link["target"] == target_data["id"]
        for link in links
    )
    assert has_note_link, f"Expected link from {source_data['id']} to {target_data['id']} in links: {links}"

    # Verify all link sources and targets are in node_ids
    for link in links:
        assert link["source"] in node_ids, f"Dangling link source: {link['source']}"
        assert link["target"] in node_ids, f"Dangling link target: {link['target']}"
