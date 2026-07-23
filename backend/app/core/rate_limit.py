import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class RateLimiter:
    """
    In-memory sliding window rate limiter for endpoint protection.
    """

    def __init__(self, requests_per_minute: int = 10):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = [t for t in self.requests[client_ip] if t > cutoff]
        if len(timestamps) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again in a minute.",
            )

        timestamps.append(now)
        self.requests[client_ip] = timestamps


login_rate_limiter = RateLimiter(requests_per_minute=10)
register_rate_limiter = RateLimiter(requests_per_minute=5)
