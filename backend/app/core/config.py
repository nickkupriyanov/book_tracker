"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["development", "test", "production"]


def _parse_csv(value: object) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    raise ValueError("expected a comma-separated string or a list of strings")


class Settings(BaseSettings):
    """Typed settings for the backend.

    All values are read from environment variables. The settings object is
    intentionally small — anything secret must come from the environment,
    never from code.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: AppEnv = "development"
    database_url: str | None = Field(default=None)
    jwt_secret: str | None = Field(default=None)
    access_token_ttl_minutes: int = Field(default=60, ge=1)
    cors_allow_origins: str | None = Field(default=None)

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return _parse_csv(self.cors_allow_origins)

    @field_validator("app_env", mode="before")
    @classmethod
    def _normalize_env(cls, value: object) -> object:
        if value is None or value == "":
            return "development"
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered not in {"development", "test", "production"}:
                raise ValueError(f"unknown APP_ENV: {value!r}")
            return lowered
        return value

    def is_production(self) -> bool:
        return self.app_env == "production"

    def is_test(self) -> bool:
        return self.app_env == "test"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance.

    The cache is process-local. Tests that need a different settings object
    should clear the cache or instantiate `Settings` directly.
    """

    return Settings()


def reset_settings_cache() -> None:
    """Clear the cached settings instance. Intended for tests only."""

    get_settings.cache_clear()
