import time
from collections import defaultdict

from fastapi import Request

from app.core.exceptions import RateLimitExceededException


class RateLimiter:
    """
    In-memory sliding window rate limiter for endpoint protection.
    """

    def __init__(self, requests_per_minute: int = 10, error_message: str | None = None):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.error_message = error_message or f"Too many requests. Limit is {requests_per_minute} per minute."
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = [t for t in self.requests[client_ip] if t > cutoff]
        if len(timestamps) >= self.requests_per_minute:
            raise RateLimitExceededException(
                detail=self.error_message,
                context={
                    "limit": self.requests_per_minute,
                    "window_seconds": self.window_seconds,
                    "client_ip": client_ip,
                },
            )

        timestamps.append(now)
        self.requests[client_ip] = timestamps


login_rate_limiter = RateLimiter(requests_per_minute=10, error_message="Too many login attempts. Please wait 1 minute.")
register_rate_limiter = RateLimiter(requests_per_minute=5, error_message="Too many registration attempts.")
heavy_computation_limiter = RateLimiter(
    requests_per_minute=15,
    error_message="Heavy computation rate limit exceeded. Please allow previous jobs to complete.",
)
ai_prompt_limiter = RateLimiter(requests_per_minute=30, error_message="AI generation rate limit exceeded.")
