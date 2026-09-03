import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from prometheus_client import Counter, Gauge, Histogram

    REQUEST_COUNT = Counter("neuro_http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"])
    REQUEST_LATENCY = Histogram("neuro_http_request_duration_seconds", "HTTP request duration", ["method", "endpoint"])
    AI_TOKEN_USAGE = Counter("neuro_ai_tokens_total", "AI token usage", ["provider", "model", "type"])
    AI_REQUEST_LATENCY = Histogram("neuro_ai_request_duration_seconds", "AI request duration", ["provider"])
    EMBEDDING_QUEUE_DEPTH = Gauge("neuro_embedding_queue_depth", "Embedding queue depth")
    EMBEDDING_LATENCY = Histogram("neuro_embedding_duration_seconds", "Embedding duration")
    SEARCH_LATENCY = Histogram("neuro_search_duration_seconds", "Search duration", ["search_type"])
    ACTIVE_CONNECTIONS = Gauge("neuro_active_websocket_connections", "Active websocket connections")
    DB_QUERY_LATENCY = Histogram("neuro_db_query_duration_seconds", "DB query duration", ["operation"])

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

    class MockMetric:
        def __init__(self, *args, **kwargs):
            pass

        def labels(self, *args, **kwargs):
            return self

        def inc(self, *args, **kwargs):
            pass

        def dec(self, *args, **kwargs):
            pass

        def set(self, *args, **kwargs):
            pass

        def observe(self, *args, **kwargs):
            pass

    REQUEST_COUNT = MockMetric()
    REQUEST_LATENCY = MockMetric()
    AI_TOKEN_USAGE = MockMetric()
    AI_REQUEST_LATENCY = MockMetric()
    EMBEDDING_QUEUE_DEPTH = MockMetric()
    EMBEDDING_LATENCY = MockMetric()
    SEARCH_LATENCY = MockMetric()
    ACTIVE_CONNECTIONS = MockMetric()
    DB_QUERY_LATENCY = MockMetric()


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if not PROMETHEUS_AVAILABLE:
            return await call_next(request)

        start_time = time.perf_counter()
        method = request.method
        endpoint = request.url.path

        try:
            response = await call_next(request)
            status_code = str(response.status_code)
        except Exception:
            status_code = "500"
            raise
        finally:
            duration = time.perf_counter() - start_time
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()
            REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)

        return response
