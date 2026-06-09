"""Books API tests."""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine

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
def auth_client(client: TestClient, engine: Engine, request) -> tuple[TestClient, dict]:
    # Use a session bound to the same engine so the test client sees
    # the seeded user when it calls /auth/login. Each test gets a
    # unique email so tests can run in any order.
    from sqlalchemy.orm import sessionmaker

    email = f"reader-{request.node.name}@example.com"

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
    return client, auth_headers


def _payload(title: str = "Hobbit", author: str = "Tolkien", status: str = "reading") -> dict:
    return {
        "title": title,
        "author": author,
        "status": status,
        "tags": ["cozy"],
        "review": {"format": "plain", "body": "good"},
        "quotes": [
            {"id": "q1", "text": "In a hole", "createdAt": "2024-05-01T00:00:00Z"}
        ],
        "readingLogs": [
            {
                "id": "l1",
                "date": "2024-05-01",
                "pagesRead": 12,
                "currentPageAfter": 12,
                "createdAt": "2024-05-01T00:00:00Z",
                "updatedAt": "2024-05-01T00:00:00Z",
            }
        ],
    }


def test_list_books_requires_auth(client: TestClient) -> None:
    response = client.get("/books")
    assert response.status_code == 401


def test_list_books_starts_empty(auth_client) -> None:
    client, headers = auth_client
    response = client.get("/books", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


def test_add_book_returns_book_with_id_and_createdAt(auth_client) -> None:
    client, headers = auth_client
    response = client.post("/books", json=_payload(), headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], str) and body["id"]
    assert isinstance(body["createdAt"], str) and body["createdAt"]
    assert body["title"] == "Hobbit"
    assert body["author"] == "Tolkien"
    assert body["status"] == "reading"
    # Nested data preserved exactly as submitted.
    assert body["quotes"][0]["id"] == "q1"
    assert body["review"] == {"format": "plain", "body": "good"}


def test_add_book_rejects_duplicate_id(auth_client) -> None:
    client, headers = auth_client
    first = client.post("/books", json=_payload(), headers=headers)
    assert first.status_code == 201
    book_id = first.json()["id"]
    second = client.post(
        "/books", json={**_payload(), "id": book_id}, headers=headers
    )
    assert second.status_code == 409


def test_add_book_rejects_empty_title(auth_client) -> None:
    client, headers = auth_client
    response = client.post(
        "/books",
        json={**_payload(), "title": ""},
        headers=headers,
    )
    assert response.status_code == 422


def test_add_book_rejects_invalid_status(auth_client) -> None:
    client, headers = auth_client
    response = client.post(
        "/books",
        json={**_payload(), "status": "finished"},
        headers=headers,
    )
    assert response.status_code == 422


def test_add_book_rejects_missing_fields(auth_client) -> None:
    client, headers = auth_client
    response = client.post("/books", json={"title": "x"}, headers=headers)
    assert response.status_code == 422


def test_list_books_after_add(auth_client) -> None:
    client, headers = auth_client
    client.post("/books", json=_payload("A", "Author A", "want"), headers=headers)
    client.post("/books", json=_payload("B", "Author B", "reading"), headers=headers)
    response = client.get("/books", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert [b["title"] for b in body] == ["A", "B"]


def test_update_book_preserves_nested_data(auth_client) -> None:
    client, headers = auth_client
    created = client.post("/books", json=_payload(), headers=headers).json()
    book_id = created["id"]
    original_created_at = created["createdAt"]

    update_payload = {
        **created,
        "title": "The Hobbit (annotated)",
        "status": "read",
        "rating": 5,
    }
    response = client.put(f"/books/{book_id}", json=update_payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "The Hobbit (annotated)"
    assert body["status"] == "read"
    assert body["rating"] == 5
    # createdAt preserved; nested data preserved.
    assert body["createdAt"] == original_created_at
    assert body["quotes"][0]["id"] == "q1"
    assert body["readingLogs"][0]["id"] == "l1"


def test_update_unknown_book_returns_404(auth_client) -> None:
    client, headers = auth_client
    response = client.put(
        "/books/missing-id",
        json=_payload(),
        headers=headers,
    )
    assert response.status_code == 404


def test_delete_book(auth_client) -> None:
    client, headers = auth_client
    created = client.post("/books", json=_payload(), headers=headers).json()
    book_id = created["id"]

    response = client.delete(f"/books/{book_id}", headers=headers)
    assert response.status_code == 204

    listing = client.get("/books", headers=headers).json()
    assert listing == []


def test_delete_unknown_book_returns_404(auth_client) -> None:
    client, headers = auth_client
    response = client.delete("/books/missing-id", headers=headers)
    assert response.status_code == 404


def test_books_are_user_scoped(engine: Engine, client: TestClient, request) -> None:
    # Seed two users.
    from sqlalchemy.orm import sessionmaker

    suffix = request.node.name
    alice_email = f"alice-scope-{suffix}@example.com"
    bob_email = f"bob-scope-{suffix}@example.com"

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
        response = client.post(
            "/auth/login",
            json={"email": email, "password": "pw"},
        )
        return response.json()["access_token"]

    alice_token = login(alice_email)
    bob_token = login(bob_email)

    alice_h = {"Authorization": f"Bearer {alice_token}"}
    bob_h = {"Authorization": f"Bearer {bob_token}"}

    created = client.post("/books", json=_payload("Alice's Book"), headers=alice_h).json()
    book_id = created["id"]

    # Bob cannot see Alice's book.
    bob_list = client.get("/books", headers=bob_h).json()
    assert bob_list == []

    # Bob cannot update Alice's book.
    update = client.put(
        f"/books/{book_id}",
        json={**_payload("Hacked"), "title": "Hacked"},
        headers=bob_h,
    )
    assert update.status_code == 404

    # Bob cannot delete Alice's book.
    delete = client.delete(f"/books/{book_id}", headers=bob_h)
    assert delete.status_code == 404

    # Alice still owns the book.
    alice_list = client.get("/books", headers=alice_h).json()
    assert len(alice_list) == 1
    assert alice_list[0]["id"] == book_id
