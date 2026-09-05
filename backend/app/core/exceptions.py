from __future__ import annotations

import logging
from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("neuro.exceptions")

HTTP_422_UNPROCESSABLE = (
    status.HTTP_422_UNPROCESSABLE_CONTENT if hasattr(status, "HTTP_422_UNPROCESSABLE_CONTENT") else 422
)


class NeuroException(Exception):
    """Base exception for all Neuro application-level domain errors."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An internal error occurred",
        headers: dict[str, str] | None = None,
        context: dict[str, Any] | None = None,
    ) -> None:
        self.status_code = status_code
        self.detail = detail
        self.headers = headers
        self.context = context or {}
        super().__init__(detail)


class NotFoundException(NeuroException):
    def __init__(self, detail: str = "Resource not found", context: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, context=context)


class ForbiddenException(NeuroException):
    def __init__(self, detail: str = "Not enough permissions", context: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail, context=context)


class UnauthorizedException(NeuroException):
    def __init__(self, detail: str = "Could not validate credentials", context: dict[str, Any] | None = None) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
            context=context,
        )


class ConflictException(NeuroException):
    def __init__(self, detail: str = "Resource conflict", context: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, context=context)


class ValidationException(NeuroException):
    def __init__(self, detail: str = "Validation error", context: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=HTTP_422_UNPROCESSABLE, detail=detail, context=context)


class PathTraversalError(ForbiddenException):
    """Raised when an operation attempts to access or mutate files outside the vault boundary sandbox."""

    def __init__(
        self,
        detail: str = "Path traversal violation: target resolves outside vault sandbox",
        context: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail=detail, context=context)


class VaultIntegrityError(ConflictException):
    """Raised when vault transactions encounter state divergence, checksum mismatch, or unapplied mutations."""

    def __init__(self, detail: str = "Vault state integrity mismatch", context: dict[str, Any] | None = None) -> None:
        super().__init__(detail=detail, context=context)


class GraphAnalysisException(NeuroException):
    """Raised when AST extraction, graph clustering, or blast radius computation fails."""

    def __init__(
        self, detail: str = "Knowledge graph extraction or analysis failed", context: dict[str, Any] | None = None
    ) -> None:
        super().__init__(status_code=HTTP_422_UNPROCESSABLE, detail=detail, context=context)


class RoadmapGenerationError(NeuroException):
    """Raised when roadmap DAG creation fails due to invalid parameters or cyclic dependencies."""

    def __init__(self, detail: str = "Roadmap generation error", context: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail, context=context)


class ObsidianLintError(NeuroException):
    """Raised when parsing or linting Obsidian vault content encounters syntax or structural violations."""

    def __init__(self, detail: str = "Obsidian vault lint error", context: dict[str, Any] | None = None) -> None:
        super().__init__(status_code=HTTP_422_UNPROCESSABLE, detail=detail, context=context)


class DatabaseConnectionError(NeuroException):
    """Raised when database operations encounter connection timeouts, locks, or pool exhaustion."""

    def __init__(
        self, detail: str = "Database service unavailable or timed out", context: dict[str, Any] | None = None
    ) -> None:
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail, context=context)


class RateLimitExceededException(NeuroException):
    """Raised when sliding-window rate limit is exceeded."""

    def __init__(
        self, detail: str = "Too many requests. Please try again later.", context: dict[str, Any] | None = None
    ) -> None:
        super().__init__(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail, context=context)


async def neuro_exception_handler(request: Request, exc: NeuroException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        f"Domain error [{exc.__class__.__name__}] at {request.method} {request.url.path}: {exc.detail}",
        extra={
            "request_id": request_id,
            "status_code": exc.status_code,
            "exception_type": exc.__class__.__name__,
            "context": exc.context,
        },
    )
    content: dict[str, Any] = {
        "detail": exc.detail,
        "error_type": exc.__class__.__name__,
        "request_id": request_id,
    }
    if exc.context:
        content["context"] = exc.context

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=exc.headers,
    )
