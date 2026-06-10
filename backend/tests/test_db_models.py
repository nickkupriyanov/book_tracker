"""Model and database session tests."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import AchievementUnlock, AnnualReadingChallenge, Book, User


def _make_user(db, email: str = "alice@example.com") -> User:
    user = User(email=email, password_hash="x" * 60)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_user_creation_and_lookup(db) -> None:
    user = _make_user(db, "alice@example.com")

    found = db.execute(select(User).where(User.email == "alice@example.com")).scalar_one()

    assert found.id == user.id
    assert found.email == "alice@example.com"
    assert isinstance(found.created_at, datetime)


def test_user_email_is_unique(db) -> None:
    _make_user(db, "dup@example.com")
    db.add(User(email="dup@example.com", password_hash="y" * 60))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_book_persists_jsonb_payload(db) -> None:
    user = _make_user(db, "books@example.com")
    payload = {
        "id": "book-1",
        "title": "The Hobbit",
        "author": "Tolkien",
        "review": {"rating": 5, "text": "cozy"},
        "quotes": [{"id": "q1", "text": "In a hole in the ground..."}],
        "readingLogs": [
            {
                "id": "l1",
                "createdAt": "2024-05-01T00:00:00Z",
                "updatedAt": "2024-05-01T00:00:00Z",
                "pagesRead": 12,
            }
        ],
    }

    book = Book(id="book-1", user_id=user.id, payload=payload)
    db.add(book)
    db.commit()
    db.refresh(book)

    assert book.user_id == user.id
    assert book.payload == payload
    # JSONB round-trips as a plain dict
    assert isinstance(book.payload, dict)
    assert book.payload["quotes"][0]["id"] == "q1"
    assert isinstance(book.book_created_at, datetime)
    assert isinstance(book.created_at, datetime)
    assert isinstance(book.updated_at, datetime)


def test_book_cascade_deletes_with_user(db) -> None:
    user = _make_user(db, "cascade@example.com")
    db.add(
        Book(
            id="b1",
            user_id=user.id,
            payload={"id": "b1", "title": "T"},
        )
    )
    db.commit()

    db.delete(user)
    db.commit()

    remaining = db.execute(select(Book)).scalars().all()
    assert remaining == []


def test_annual_challenge_is_unique_per_user_year(db) -> None:
    user = _make_user(db, "chal@example.com")
    db.add(AnnualReadingChallenge(user_id=user.id, year=2026, target_books=12))
    db.commit()

    db.add(AnnualReadingChallenge(user_id=user.id, year=2026, target_books=24))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_annual_challenge_target_books_must_be_positive(db) -> None:
    user = _make_user(db, "chal2@example.com")
    db.add(AnnualReadingChallenge(user_id=user.id, year=2026, target_books=0))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_annual_challenge_year_must_be_four_digit(db) -> None:
    user = _make_user(db, "chal3@example.com")
    db.add(AnnualReadingChallenge(user_id=user.id, year=99, target_books=12))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_user_scoped_queries_filter_by_user_id(db) -> None:
    alice = _make_user(db, "scope-a@example.com")
    bob = _make_user(db, "scope-b@example.com")
    db.add_all(
        [
            Book(id="a1", user_id=alice.id, payload={"id": "a1", "title": "Alice 1"}),
            Book(id="a2", user_id=alice.id, payload={"id": "a2", "title": "Alice 2"}),
            Book(id="b1", user_id=bob.id, payload={"id": "b1", "title": "Bob 1"}),
        ]
    )
    db.add_all(
        [
            AnnualReadingChallenge(user_id=alice.id, year=2026, target_books=12),
            AnnualReadingChallenge(user_id=bob.id, year=2026, target_books=20),
        ]
    )
    db.commit()

    alice_books = (
        db.execute(select(Book).where(Book.user_id == alice.id))
        .scalars()
        .all()
    )
    bob_books = (
        db.execute(select(Book).where(Book.user_id == bob.id)).scalars().all()
    )

    assert {b.id for b in alice_books} == {"a1", "a2"}
    assert {b.id for b in bob_books} == {"b1"}

    alice_chal = (
        db.execute(
            select(AnnualReadingChallenge).where(
                AnnualReadingChallenge.user_id == alice.id
            )
        )
        .scalars()
        .one()
    )
    bob_chal = (
        db.execute(
            select(AnnualReadingChallenge).where(
                AnnualReadingChallenge.user_id == bob.id
            )
        )
        .scalars()
        .one()
    )
    assert alice_chal.target_books == 12
    assert bob_chal.target_books == 20


def test_payload_supports_arbitrary_nested_frontend_shapes(db) -> None:
    """The payload column is opaque — it accepts any nested frontend Book shape."""

    user = _make_user(db, "shape@example.com")
    payload = {
        "id": "s1",
        "title": "S",
        "author": "A",
        "status": "finished",
        "rating": 4,
        "review": {"rating": 4, "text": "good"},
        "quotes": [
            {"id": "q1", "text": "t", "createdAt": "2024-01-01T00:00:00Z"}
        ],
        "readingLogs": [
            {
                "id": "l1",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-02T00:00:00Z",
                "pagesRead": 10,
                "note": "first session",
            }
        ],
        "tags": ["cozy", "short"],
    }
    db.add(Book(id="s1", user_id=user.id, payload=payload))
    db.commit()

    fetched = db.execute(select(Book).where(Book.id == "s1")).scalar_one()
    # JSONB normalises key order, so the dict equality above is the
    # right check — the round-trip preserves value, type, and key set
    # but not necessarily key order.
    assert fetched.payload == payload
    assert set(fetched.payload.keys()) == set(payload.keys())
    assert json.dumps(fetched.payload, sort_keys=True) == json.dumps(
        payload, sort_keys=True
    )


def test_payload_column_is_postgres_jsonb(db) -> None:
    """Spec 023 §7: book payload must be JSONB, not plain JSON.

    Confirms by reading the actual column type from PostgreSQL.
    """

    from sqlalchemy import text

    type_name = db.execute(
        text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = 'books' AND column_name = 'payload'"
        )
    ).scalar_one()
    assert type_name == "jsonb"


def test_achievement_unlock_is_unique_per_user(db) -> None:
    user = _make_user(db, "ach@example.com")
    db.add(
        AchievementUnlock(
            user_id=user.id,
            achievement_id="first-finished-book",
            unlocked_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
    )
    db.commit()

    db.add(
        AchievementUnlock(
            user_id=user.id,
            achievement_id="first-finished-book",
            unlocked_at=datetime(2026, 1, 11, tzinfo=timezone.utc),
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_achievement_unlock_user_isolation(db) -> None:
    alice = _make_user(db, "alice-ach@example.com")
    bob = _make_user(db, "bob-ach@example.com")
    db.add(
        AchievementUnlock(
            user_id=alice.id,
            achievement_id="first-finished-book",
            unlocked_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
    )
    db.add(
        AchievementUnlock(
            user_id=bob.id,
            achievement_id="first-finished-book",
            unlocked_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
    )
    db.commit()

    alice_unlocks = (
        db.execute(
            select(AchievementUnlock).where(
                AchievementUnlock.user_id == alice.id
            )
        )
        .scalars()
        .all()
    )
    bob_unlocks = (
        db.execute(
            select(AchievementUnlock).where(AchievementUnlock.user_id == bob.id)
        )
        .scalars()
        .all()
    )
    assert {u.achievement_id for u in alice_unlocks} == {"first-finished-book"}
    assert {u.achievement_id for u in bob_unlocks} == {"first-finished-book"}


def test_achievement_unlock_cascades_with_user(db) -> None:
    user = _make_user(db, "cascade-ach@example.com")
    db.add(
        AchievementUnlock(
            user_id=user.id,
            achievement_id="first-finished-book",
            unlocked_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
    )
    db.commit()

    db.delete(user)
    db.commit()

    remaining = (
        db.execute(select(AchievementUnlock)).scalars().all()
    )
    assert remaining == []
