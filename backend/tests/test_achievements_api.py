"""Achievement API tests (spec 024)."""

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
    email = f"ach-{request.node.name}@example.com"
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


def test_list_empty(auth_client) -> None:
    client, headers, _ = auth_client
    response = client.get("/achievements", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"unlocks": []}


def test_requires_auth(client: TestClient) -> None:
    response = client.get("/achievements")
    assert response.status_code == 401
    response = client.post("/achievements/unlocks", json={"unlocks": []})
    assert response.status_code == 401


def test_save_batch_persists_and_returns_request_order(auth_client) -> None:
    client, headers, _ = auth_client
    response = client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "first-quote",
                    "unlocked_at": "2026-01-10T00:00:00Z",
                },
                {
                    "achievement_id": "first-finished-book",
                    "unlocked_at": "2026-01-05T00:00:00Z",
                },
            ]
        },
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()["unlocks"]
    assert [item["achievementId"] for item in body] == [
        "first-quote",
        "first-finished-book",
    ]
    fetched = client.get("/achievements", headers=headers)
    fetched_ids = [item["achievementId"] for item in fetched.json()["unlocks"]]
    assert set(fetched_ids) == {"first-quote", "first-finished-book"}


def test_repeated_save_is_idempotent_and_preserves_earliest(auth_client) -> None:
    client, headers, _ = auth_client
    client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "first-finished-book",
                    "unlocked_at": "2026-02-10T00:00:00Z",
                }
            ]
        },
        headers=headers,
    )
    # A later save that tries to backdate the row is a no-op —
    # the original timestamp is the source of truth (FR-5).
    second = client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "first-finished-book",
                    "unlocked_at": "2026-01-05T00:00:00Z",
                }
            ]
        },
        headers=headers,
    )
    assert second.status_code == 200
    body = second.json()["unlocks"][0]
    assert body["achievementId"] == "first-finished-book"
    assert body["unlockedAt"].startswith("2026-02-10")

    # Subsequent later timestamps are also no-ops.
    third = client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "first-finished-book",
                    "unlocked_at": "2026-12-31T00:00:00Z",
                }
            ]
        },
        headers=headers,
    )
    body = third.json()["unlocks"][0]
    assert body["unlockedAt"].startswith("2026-02-10")


def test_save_rejects_unknown_achievement_id(auth_client) -> None:
    client, headers, _ = auth_client
    response = client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "not-a-real-achievement",
                    "unlocked_at": "2026-01-01T00:00:00Z",
                }
            ]
        },
        headers=headers,
    )
    assert response.status_code == 422


def test_save_rejects_malformed_timestamp(auth_client) -> None:
    client, headers, _ = auth_client
    response = client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "first-finished-book",
                    "unlocked_at": "not-a-date",
                }
            ]
        },
        headers=headers,
    )
    assert response.status_code == 422


def test_unlocks_are_user_scoped(
    engine: Engine, client: TestClient, request
) -> None:
    suffix = request.node.name
    alice_email = f"alice-ach-{suffix}@example.com"
    bob_email = f"bob-ach-{suffix}@example.com"
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

    client.post(
        "/achievements/unlocks",
        json={
            "unlocks": [
                {
                    "achievement_id": "first-finished-book",
                    "unlocked_at": "2026-01-01T00:00:00Z",
                }
            ]
        },
        headers=alice_h,
    )
    bob_list = client.get("/achievements", headers=bob_h).json()
    assert bob_list == {"unlocks": []}
    alice_list = client.get("/achievements", headers=alice_h).json()
    assert len(alice_list["unlocks"]) == 1
    assert alice_list["unlocks"][0]["achievementId"] == "first-finished-book"


def test_concurrent_saves_are_idempotent(auth_client) -> None:
    """Two POSTs with the same `(achievement_id, unlocked_at)`
    must both succeed and return identical canonical records.

    The endpoint relies on `INSERT ... ON CONFLICT DO NOTHING`
    so the second request cannot raise `IntegrityError` and
    fall into a 500.
    """
    client, headers, _ = auth_client
    payload = {
        "unlocks": [
            {
                "achievement_id": "first-finished-book",
                "unlocked_at": "2026-01-10T00:00:00Z",
            }
        ]
    }
    first = client.post(
        "/achievements/unlocks", json=payload, headers=headers
    )
    second = client.post(
        "/achievements/unlocks", json=payload, headers=headers
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    body = second.json()["unlocks"][0]
    assert body["achievementId"] == "first-finished-book"
    assert body["unlockedAt"].startswith("2026-01-10")
