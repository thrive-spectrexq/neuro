import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger("neuro.sentry")
settings = get_settings()


def _scrub_pii(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any]:
    def scrub(data: Any) -> Any:
        if isinstance(data, dict):
            return {k: ("***" if k.lower() in {"password", "token", "api_key"} else scrub(v)) for k, v in data.items()}
        elif isinstance(data, list):
            return [scrub(i) for i in data]
        return data

    if "request" in event and "data" in event["request"]:
        event["request"]["data"] = scrub(event["request"]["data"])

    return event


def init_sentry(dsn: str | None, environment: str = "development") -> None:
    if not dsn:
        logger.info("Sentry DSN not provided. Sentry SDK will not be initialized.")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        traces_sample_rate = 0.1 if environment == "production" else 1.0

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            traces_sample_rate=traces_sample_rate,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            before_send=_scrub_pii,
        )
        logger.info("Sentry SDK initialized successfully.")
    except ImportError:
        logger.warning("sentry-sdk is not installed. Sentry will not be initialized.")
