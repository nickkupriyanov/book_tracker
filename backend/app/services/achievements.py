"""Service-layer helpers for reader achievement unlocks (spec 024)."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AchievementUnlock


def list_unlocks_for_user(db: Session, user_id: int) -> list[AchievementUnlock]:
    return list(
        db.execute(
            select(AchievementUnlock).where(AchievementUnlock.user_id == user_id)
        ).scalars()
    )


def get_unlock(
    db: Session, user_id: int, achievement_id: str
) -> AchievementUnlock | None:
    return db.execute(
        select(AchievementUnlock).where(
            AchievementUnlock.user_id == user_id,
            AchievementUnlock.achievement_id == achievement_id,
        )
    ).scalar_one_or_none()


def save_unlocks_for_user(
    db: Session,
    user_id: int,
    unlocks: Iterable[tuple[str, datetime]],
) -> list[AchievementUnlock]:
    """Idempotently insert a batch of unlocks for the user.

    For each `(achievement_id, unlocked_at)` pair:
      - if no row exists, insert it;
      - if a row exists, keep the **earliest** `unlocked_at`.

    Returns one row per requested `achievement_id`, in the order
    the IDs were requested.
    """

    requested: list[tuple[str, datetime]] = list(unlocks)
    if not requested:
        return []

    requested_ids = [item[0] for item in requested]
    existing = {
        row.achievement_id: row
        for row in db.execute(
            select(AchievementUnlock).where(
                AchievementUnlock.user_id == user_id,
                AchievementUnlock.achievement_id.in_(requested_ids),
            )
        ).scalars()
    }

    for achievement_id, unlocked_at in requested:
        row = existing.get(achievement_id)
        if row is None:
            row = AchievementUnlock(
                user_id=user_id,
                achievement_id=achievement_id,
                unlocked_at=unlocked_at,
            )
            db.add(row)
            existing[achievement_id] = row
        # First-timestamp-wins: a row's original `unlocked_at`
        # is never overwritten by a later save (spec 024 FR-5).
    db.commit()
    for row in existing.values():
        db.refresh(row)
    return [existing[item[0]] for item in requested]
