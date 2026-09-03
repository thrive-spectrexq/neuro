import time

import pytest
from fastapi import Request

from app.core.exceptions import RateLimitExceededException
from app.core.rate_limit import RateLimiter


class MockClient:
    def __init__(self, host):
        self.host = host


class MockRequest(Request):
    def __init__(self, host="127.0.0.1"):
        self._client = MockClient(host)

    @property
    def client(self):
        return self._client


@pytest.mark.asyncio
async def test_rate_limiter_basic():
    limiter = RateLimiter(requests_per_minute=2)
    request = MockRequest()

    # First request should pass
    await limiter(request)

    # Second request should pass
    await limiter(request)

    # Third request should fail
    with pytest.raises(RateLimitExceededException):
        await limiter(request)


@pytest.mark.asyncio
async def test_sliding_window_expiry():
    limiter = RateLimiter(requests_per_minute=1)
    limiter.window_seconds = 0.1  # short window for testing
    request = MockRequest()

    await limiter(request)

    # Immediate second request should fail
    with pytest.raises(RateLimitExceededException):
        await limiter(request)

    time.sleep(0.2)

    # Should pass after window expires
    await limiter(request)


@pytest.mark.asyncio
async def test_different_clients_independent():
    limiter = RateLimiter(requests_per_minute=1)
    req1 = MockRequest(host="192.168.1.1")
    req2 = MockRequest(host="192.168.1.2")

    await limiter(req1)

    with pytest.raises(RateLimitExceededException):
        await limiter(req1)

    # Second client should not be blocked
    await limiter(req2)


@pytest.mark.asyncio
async def test_custom_error_message():
    limiter = RateLimiter(requests_per_minute=1, error_message="Custom error")
    req = MockRequest()

    await limiter(req)

    with pytest.raises(RateLimitExceededException) as exc:
        await limiter(req)

    assert exc.value.detail == "Custom error"
