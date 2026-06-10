"""Service-layer helpers for book persistence."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Book


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _strip_top_level(payload: dict, *, keep: set[str]) -> dict:
    """Return a copy of the payload with reserved top-level fields stripped.

    The payload is a frontend `Book` object. The backend supplies `id`
    and `createdAt` from the path/storage; we never accept those from
    the request body.
    """

    return {key: value for key, value in payload.items() if key not in keep}


def list_books_for_user(db: Session, user_id: int) -> list[dict]:
    """Return serialized books for the user, oldest first."""

    rows = (
        db.execute(
            select(Book)
            .where(Book.user_id == user_id)
            .order_by(Book.created_at.asc())
        )
        .scalars()
        .all()
    )
    return [
        {
            **row.payload,
            "id": row.id,
            "createdAt": row.book_created_at.isoformat(),
        }
        for row in rows
    ]


def get_book_for_user(db: Session, user_id: int, book_id: str) -> Book | None:
    return db.execute(
        select(Book).where(Book.user_id == user_id, Book.id == book_id)
    ).scalar_one_or_none()


def add_book_for_user(
    db: Session, user_id: int, request_payload: dict
) -> dict:
    """Create a new book for the user and return the serialized shape.

    The backend stamps `id` and `createdAt` and preserves the rest of
    the frontend payload as-is.
    """

    new_id = request_payload.get("id") or str(uuid.uuid4())
    existing = get_book_for_user(db, user_id, new_id)
    if existing is not None:
        # Per the StorageAdapter contract addBook creates new books; a
        # duplicate id should be reported as a conflict.
        raise ValueError(f"book {new_id!r} already exists for this user")

    now = _utc_now()
    payload = _strip_top_level(request_payload, keep={"id", "createdAt"})
    payload["id"] = new_id
    payload["createdAt"] = now.isoformat()

    book = Book(
        id=new_id,
        user_id=user_id,
        payload=payload,
        book_created_at=now,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return {
        **book.payload,
        "id": book.id,
        "createdAt": book.book_created_at.isoformat(),
    }


def update_book_for_user(
    db: Session, user_id: int, book_id: str, request_payload: dict
) -> dict | None:
    """Update an existing book. Returns None when the book is missing."""

    book = get_book_for_user(db, user_id, book_id)
    if book is None:
        return None
    # Preserve the original createdAt/id; rewrite the rest.
    payload = _strip_top_level(request_payload, keep={"id", "createdAt"})
    payload["id"] = book_id
    payload["createdAt"] = book.book_created_at.isoformat()
    book.payload = payload
    db.commit()
    db.refresh(book)
    return {
        **book.payload,
        "id": book.id,
        "createdAt": book.book_created_at.isoformat(),
    }


def delete_book_for_user(db: Session, user_id: int, book_id: str) -> bool:
    """Delete a book. Returns True when a row was removed."""

    book = get_book_for_user(db, user_id, book_id)
    if book is None:
        return False
    db.delete(book)
    db.commit()
    return True
