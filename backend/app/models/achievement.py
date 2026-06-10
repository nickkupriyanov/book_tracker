"""Reader achievement unlock model (spec 024).

One row per (user, achievement). The unique constraint on
`(user_id, achievement_id)` is the source of truth for
idempotency — the service layer relies on it to short-circuit
re-saves and the API to reject duplicates. The earliest
`unlocked_at` wins, mirroring the frontend contract.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AchievementUnlock(Base):
    __tablename__ = "achievement_unlocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    achievement_id: Mapped[str] = mapped_column(String(64), nullable=False)
    # Stored in a timezone-aware column. The frontend stamps the
    # ISO 8601 string on discovery; the backend normalises to
    # UTC for storage.
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="achievement_unlocks")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "achievement_id",
            name="achievement_unlocks_user_id_achievement_id_key",
        ),
    )
