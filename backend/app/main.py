"""FastAPI application factory.

The factory wires CORS, the `/health` endpoint, and the authenticated
routers. Database engine creation is lazy — `/health` must work
without a running PostgreSQL instance.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_env: str


def _resolve_cors_origins(origins: Iterable[str]) -> list[str]:
    return [origin for origin in origins if origin]


def create_app(*, cors_allow_origins: Iterable[str] | None = None) -> FastAPI:
    """Build a FastAPI app with CORS and the routers wired in.

    Args:
        cors_allow_origins: explicit origin allowlist. When `None`, the
            application reads it from settings.
    """

    from app.core.config import get_settings

    settings = get_settings()
    allow_origins = (
        _resolve_cors_origins(cors_allow_origins)
        if cors_allow_origins is not None
        else _resolve_cors_origins(settings.cors_allow_origins_list)
    )

    app = FastAPI(
        title="Book Tracker Backend",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health", response_model=HealthResponse)
    def health() -> dict[str, Any]:
        return HealthResponse(status="ok", app_env=settings.app_env).model_dump()

    from app.api.routes import auth as auth_routes

    app.include_router(auth_routes.router)

    return app


app = create_app()
