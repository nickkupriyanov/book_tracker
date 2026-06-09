"""Health endpoint and application factory tests.

These tests must not require a running PostgreSQL instance.
"""

from __future__ import annotations

import os

from fastapi.testclient import TestClient

from app.core.config import reset_settings_cache
from app.main import HealthResponse, create_app


def test_health_returns_ok_status() -> None:
    os.environ["APP_ENV"] = "test"
    reset_settings_cache()
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body == HealthResponse(status="ok", app_env="test").model_dump()


def test_health_works_without_database_url() -> None:
    os.environ.pop("DATABASE_URL", None)
    reset_settings_cache()
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_preflight_includes_authorization_header() -> None:
    os.environ["CORS_ALLOW_ORIGINS"] = "http://localhost:3000"
    reset_settings_cache()
    app = create_app()
    client = TestClient(app)

    response = client.options(
        "/books",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )

    assert response.status_code in (200, 204)
    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin == "http://localhost:3000"
    allowed_headers = response.headers.get("access-control-allow-headers", "")
    assert "Authorization" in allowed_headers
    assert "Content-Type" in allowed_headers
