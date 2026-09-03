"""
Unit tests for application configuration and validation.
"""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_defaults():
    settings = Settings(_env_file=None)
    assert settings.NEURO_ENV == "development"
    assert settings.NEURO_SECRET_KEY == "changeme"
    assert settings.DATABASE_URL == "sqlite+aiosqlite:///./neuro.db"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 60 * 24
    assert settings.REFRESH_TOKEN_EXPIRE_DAYS == 30
    assert settings.RATE_LIMIT_DEFAULT == 60
    assert settings.RATE_LIMIT_AI == 30
    assert settings.RATE_LIMIT_AUTH == 10
    assert settings.ENFORCE_HTTPS is False


def test_secret_key_validation_production_failure():
    with pytest.raises(ValidationError) as excinfo:
        Settings(
            _env_file=None,
            NEURO_ENV="production",
            NEURO_SECRET_KEY="changeme",
        )
    assert "at least 32 characters" in str(excinfo.value)

    with pytest.raises(ValidationError) as excinfo:
        Settings(
            _env_file=None,
            NEURO_ENV="production",
            NEURO_SECRET_KEY="short-key",
        )
    assert "at least 32 characters" in str(excinfo.value)


def test_secret_key_validation_production_success():
    strong_key = "a" * 32
    settings = Settings(
        _env_file=None,
        NEURO_ENV="production",
        NEURO_SECRET_KEY=strong_key,
    )
    assert settings.NEURO_SECRET_KEY == strong_key


def test_cors_origins_parsing():
    settings = Settings(_env_file=None)
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    assert "http://localhost:3000" in origins
    assert "http://localhost:5173" in origins
