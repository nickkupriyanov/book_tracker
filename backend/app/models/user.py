"""User model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.achievement import AchievementUnlock
    from app.models.book import Book
    from app.models.challenge import AnnualReadingChallenge


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )

    books: Mapped[list["Book"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    challenges: Mapped[list["AnnualReadingChallenge"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    achievement_unlocks: Mapped[list["AchievementUnlock"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
