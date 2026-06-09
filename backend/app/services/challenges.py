"""Service-layer helpers for annual reading challenges."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AnnualReadingChallenge


def get_challenge_for_user(
    db: Session, user_id: int, year: int
) -> AnnualReadingChallenge | None:
    return db.execute(
        select(AnnualReadingChallenge).where(
            AnnualReadingChallenge.user_id == user_id,
            AnnualReadingChallenge.year == year,
        )
    ).scalar_one_or_none()


def save_challenge_for_user(
    db: Session, user_id: int, year: int, target_books: int
) -> AnnualReadingChallenge:
    """Create or update the user's challenge for `year`.

    One active challenge per (user_id, year) pair.
    """

    existing = get_challenge_for_user(db, user_id, year)
    if existing is not None:
        existing.target_books = target_books
        db.commit()
        db.refresh(existing)
        return existing
    record = AnnualReadingChallenge(
        user_id=user_id, year=year, target_books=target_books
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
