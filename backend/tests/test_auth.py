"""Auth endpoint tests."""

from __future__ import annotations

import os
import time
from collections.abc import Generator

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings, reset_settings_cache
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.session import reset_engine_cache
from app.main import create_app
from app.models import User


@pytest.fixture
def client(
    engine, monkeypatch: pytest.MonkeyPatch
) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    monkeypatch.setenv(
        "DATABASE_URL",
        os.environ.get(
            "TEST_DATABASE_URL",
            "postgresql+psycopg://book:book@127.0.0.1:5432/book_test",
        ),
    )
    reset_settings_cache()
    reset_engine_cache()
    app = create_app()
    with TestClient(app) as c:
        yield c
    reset_engine_cache()


def _seed_user(db_session, email: str, password: str) -> User:
    user = User(email=email, password_hash=hash_password(password))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_password_hashing_round_trip() -> None:
    hashed = hash_password("super-secret")
    assert hashed != "super-secret"
    assert verify_password("super-secret", hashed) is True
    assert verify_password("not-it", hashed) is False


def test_jwt_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    reset_settings_cache()
    token = create_access_token(subject="alice@example.com", user_id=42)
    claims = decode_access_token(token)
    assert claims["sub"] == "alice@example.com"
    assert claims["uid"] == 42
    assert claims["type"] == "access"


def test_jwt_rejects_wrong_type(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    reset_settings_cache()
    settings = get_settings()
    bad = jwt.encode(
        {"sub": "x", "uid": 1, "type": "refresh"},
        settings.jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(bad)


def test_jwt_rejects_expired(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    reset_settings_cache()
    token = create_access_token(
        subject="alice@example.com", user_id=1, expires_in_seconds=1
    )
    time.sleep(1.1)
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_login_succeeds_with_valid_credentials(
    client: TestClient, db
) -> None:
    _seed_user(db, "alice@example.com", "super-secret")

    response = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "super-secret"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert body["expires_in"] > 0


def test_login_rejects_invalid_password(client: TestClient, db) -> None:
    _seed_user(db, "bob@example.com", "right-password")

    response = client.post(
        "/auth/login",
        json={"email": "bob@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_login_rejects_unknown_email(client: TestClient, db) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "ghost@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


def test_login_rejects_empty_payload(client: TestClient) -> None:
    response = client.post("/auth/login", json={"email": "", "password": ""})
    assert response.status_code == 422


def test_me_requires_token(client: TestClient) -> None:
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_rejects_invalid_token(client: TestClient) -> None:
    response = client.get("/auth/me", headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401


def test_me_returns_current_user(client: TestClient, db) -> None:
    user = _seed_user(db, "carol@example.com", "pwpw")

    login = client.post(
        "/auth/login",
        json={"email": "carol@example.com", "password": "pwpw"},
    )
    token = login.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user.id
    assert body["email"] == "carol@example.com"


def test_login_response_includes_short_lived_claims(
    client: TestClient, db
) -> None:
    _seed_user(db, "dave@example.com", "pwpw")

    login = client.post(
        "/auth/login",
        json={"email": "dave@example.com", "password": "pwpw"},
    )
    token = login.json()["access_token"]
    claims = decode_access_token(token)
    # 60 minute default — but always positive and capped at one day in tests.
    assert 0 < claims["exp"] - claims["iat"] <= 60 * 60 * 24
