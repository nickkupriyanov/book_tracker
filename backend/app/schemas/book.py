"""Pydantic schemas for the books endpoints.

The Book payload is intentionally permissive: we validate only the
fields the API actually relies on (id, title, author, status, createdAt)
and forward everything else as-is. This is the "pass-through" contract
documented in spec 023 §7.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ReadingStatus = Literal["want", "reading", "read"]


class BookCreateRequest(BaseModel):
    """Request payload for `POST /books`.

    The UI submits a `BookInput`, which lacks `id` and `createdAt`. The
    backend stamps those fields and returns the full `Book`.
    """

    model_config = ConfigDict(extra="allow")

    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=120)
    status: ReadingStatus
    createdAt: datetime | None = None
    id: str | None = Field(default=None, max_length=64)

    @field_validator("title", "author")
    @classmethod
    def _strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class BookUpdateRequest(BaseModel):
    """Request payload for `PUT /books/{id}`.

    The `id` and `createdAt` come from the path and existing record.
    """

    model_config = ConfigDict(extra="allow")

    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=120)
    status: ReadingStatus

    @field_validator("title", "author")
    @classmethod
    def _strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


def serialize_book(payload: dict[str, Any], *, book_id: str, created_at: datetime) -> dict[str, Any]:
    """Return the API response shape for a stored book.

    The frontend `Book` type expects `id` and `createdAt` at the top
    level. We rebuild them from the row's metadata so nested payload
    data is preserved untouched.
    """

    merged = dict(payload)
    merged["id"] = book_id
    merged["createdAt"] = created_at.isoformat()
    return merged
