"""Annual challenge API tests."""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from app.core.config import reset_settings_cache
from app.core.security import hash_password
from app.db import session as db_session
from app.main import create_app
from app.models import User


@pytest.fixture
def client(
    engine: Engine, monkeypatch: pytest.MonkeyPatch
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
    db_session.set_engine(engine)
    app = create_app()
    with TestClient(app) as c:
        yield c
    db_session.reset_engine_cache()


@pytest.fixture
def auth_client(
    client: TestClient, engine: Engine, request
) -> tuple[TestClient, dict, str]:
    email = f"chall-{request.node.name}@example.com"
    SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )
    session = SessionLocal()
    try:
        user = User(email=email, password_hash=hash_password("pw"))
        session.add(user)
        session.commit()
        session.refresh(user)
    finally:
        session.close()

    login = client.post(
        "/auth/login",
        json={"email": email, "password": "pw"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    return client, auth_headers, email


def test_get_missing_challenge_returns_null(auth_client) -> None:
    client, headers, _email = auth_client
    response = client.get("/challenges/2026", headers=headers)
    assert response.status_code == 200
    assert response.json() is None


def test_save_and_get_challenge(auth_client) -> None:
    client, headers, _email = auth_client
    response = client.put(
        "/challenges/2026",
        json={"year": 2026, "target_books": 12},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["year"] == 2026
    assert body["targetBooks"] == 12
    assert isinstance(body["updatedAt"], str) and body["updatedAt"]

    fetched = client.get("/challenges/2026", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json() == body


def test_save_challenge_updates_existing_record(auth_client) -> None:
    client, headers, _email = auth_client
    first = client.put(
        "/challenges/2026",
        json={"year": 2026, "target_books": 12},
        headers=headers,
    )
    assert first.status_code == 200

    second = client.put(
        "/challenges/2026",
        json={"year": 2026, "target_books": 24},
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["targetBooks"] == 24


def test_save_challenge_rejects_target_books_zero(auth_client) -> None:
    client, headers, _email = auth_client
    response = client.put(
        "/challenges/2026",
        json={"year": 2026, "target_books": 0},
        headers=headers,
    )
    assert response.status_code == 422


def test_save_challenge_rejects_invalid_year(auth_client) -> None:
    client, headers, _email = auth_client
    response = client.put(
        "/challenges/99",
        json={"year": 99, "target_books": 12},
        headers=headers,
    )
    assert response.status_code == 422


def test_challenge_requires_auth(client: TestClient) -> None:
    response = client.get("/challenges/2026")
    assert response.status_code == 401


def test_challenges_are_user_scoped(
    engine: Engine, client: TestClient, request
) -> None:
    suffix = request.node.name
    alice_email = f"alice-ch-{suffix}@example.com"
    bob_email = f"bob-ch-{suffix}@example.com"
    SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )
    session = SessionLocal()
    try:
        alice = User(email=alice_email, password_hash=hash_password("pw"))
        bob = User(email=bob_email, password_hash=hash_password("pw"))
        session.add_all([alice, bob])
        session.commit()
        session.refresh(alice)
        session.refresh(bob)
    finally:
        session.close()

    def login(email: str) -> str:
        return client.post(
            "/auth/login",
            json={"email": email, "password": "pw"},
        ).json()["access_token"]

    alice_h = {"Authorization": f"Bearer {login(alice_email)}"}
    bob_h = {"Authorization": f"Bearer {login(bob_email)}"}

    # Alice saves 2026 challenge.
    alice_save = client.put(
        "/challenges/2026",
        json={"year": 2026, "target_books": 12},
        headers=alice_h,
    )
    assert alice_save.status_code == 200
    assert alice_save.json()["targetBooks"] == 12

    # Bob's 2026 challenge is independent.
    bob_get = client.get("/challenges/2026", headers=bob_h)
    assert bob_get.status_code == 200
    assert bob_get.json() is None

    # Bob saves a different target.
    bob_save = client.put(
        "/challenges/2026",
        json={"year": 2026, "target_books": 99},
        headers=bob_h,
    )
    assert bob_save.status_code == 200
    assert bob_save.json()["targetBooks"] == 99

    # Alice's value is unchanged.
    alice_get = client.get("/challenges/2026", headers=alice_h)
    assert alice_get.json()["targetBooks"] == 12
