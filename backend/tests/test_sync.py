import base64

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_device_key(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.post(
        "/api/v1/sync/devices",
        json={
            "device_name": "MacBook Pro M3",
            "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0\n-----END PUBLIC KEY-----",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["device_name"] == "MacBook Pro M3"
    assert "key_fingerprint" in data
    assert ":" in data["key_fingerprint"]


@pytest.mark.asyncio
async def test_list_device_keys(test_client: AsyncClient, auth_headers: dict[str, str]):
    await test_client.post(
        "/api/v1/sync/devices",
        json={
            "device_name": "iPhone 15 Pro",
            "public_key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1",
        },
        headers=auth_headers,
    )
    response = await test_client.get("/api/v1/sync/devices", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_sync_push_and_pull(test_client: AsyncClient, auth_headers: dict[str, str]):
    dummy_payload = base64.b64encode(b"Super secret encrypted note payload").decode("utf-8")
    dummy_iv = base64.b64encode(b"123456789012").decode("utf-8")
    dummy_salt = base64.b64encode(b"1234567890123456").decode("utf-8")

    # Push batch
    push_resp = await test_client.post(
        "/api/v1/sync/push",
        json={
            "blobs": [
                {
                    "encrypted_data": dummy_payload,
                    "iv": dummy_iv,
                    "salt": dummy_salt,
                    "version": 1,
                }
            ]
        },
        headers=auth_headers,
    )
    assert push_resp.status_code == 200
    pushed = push_resp.json()
    assert len(pushed) == 1
    assert pushed[0]["encrypted_data"] == dummy_payload
    blob_id = pushed[0]["id"]

    # Pull delta
    pull_resp = await test_client.get("/api/v1/sync/pull?since_sequence=0", headers=auth_headers)
    assert pull_resp.status_code == 200
    pull_data = pull_resp.json()
    assert "blobs" in pull_data
    assert pull_data["latest_sequence"] >= 1

    # Verify envelope
    verify_resp = await test_client.post(f"/api/v1/sync/verify/{blob_id}", headers=auth_headers)
    assert verify_resp.status_code == 200
    vdata = verify_resp.json()
    assert vdata["valid"] is True
    assert vdata["algorithm"] == "AES-256-GCM"


@pytest.mark.asyncio
async def test_sync_status(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/sync/status", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "blob_count" in data
    assert "registered_devices" in data
