"""Book model.

Books are stored as a JSONB payload that matches the frontend `Book`
type. The backend keeps a small set of metadata columns for ownership
and persistence. The payload is opaque to the backend: nested
`review`, `quotes`, and `readingLogs` are passed through unchanged.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Book(Base, TimestampMixin):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    book_created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="books")

    __table_args__ = (
        Index("ix_books_user_id_updated_at", "user_id", "updated_at"),
    )
