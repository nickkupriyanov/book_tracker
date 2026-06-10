"""Settings tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings, reset_settings_cache


def test_settings_defaults() -> None:
    settings = Settings()
    assert settings.app_env == "development"
    assert settings.database_url is None
    assert settings.jwt_secret is None
    assert settings.access_token_ttl_minutes == 60
    assert settings.cors_allow_origins_list == []


def test_settings_parses_cors_allow_origins_string() -> None:
    settings = Settings(
        cors_allow_origins="http://localhost:3000, https://book.example.com "
    )
    assert settings.cors_allow_origins_list == [
        "http://localhost:3000",
        "https://book.example.com",
    ]


def test_settings_rejects_unknown_app_env() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="staging")


def test_settings_reads_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@h:5432/d")
    monkeypatch.setenv("JWT_SECRET", "secret")
    monkeypatch.setenv("ACCESS_TOKEN_TTL_MINUTES", "15")
    monkeypatch.setenv(
        "CORS_ALLOW_ORIGINS", "http://localhost:3000,https://book.example.com"
    )
    reset_settings_cache()

    settings = Settings()

    assert settings.app_env == "production"
    assert settings.database_url == "postgresql+psycopg://u:p@h:5432/d"
    assert settings.jwt_secret == "secret"
    assert settings.access_token_ttl_minutes == 15
    assert settings.cors_allow_origins_list == [
        "http://localhost:3000",
        "https://book.example.com",
    ]
