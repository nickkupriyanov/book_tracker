"""Annual reading challenge model.

One challenge per user/year. The frontend shape is mirrored in the
`target_books` column; the response also includes the `year` and
`user_id` so the frontend can rebuild the `AnnualReadingChallenge`
object.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class AnnualReadingChallenge(Base, TimestampMixin):
    __tablename__ = "annual_reading_challenges"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    target_books: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped["User"] = relationship(back_populates="challenges")

    __table_args__ = (
        UniqueConstraint(
            "user_id", "year", name="annual_reading_challenges_user_id_year_key"
        ),
        CheckConstraint("target_books >= 1", name="target_books_positive"),
        CheckConstraint(
            "year >= 1900 AND year <= 9999", name="year_four_digit"
        ),
    )
