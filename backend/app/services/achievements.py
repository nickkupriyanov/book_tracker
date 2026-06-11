"""Service-layer helpers for reader achievement unlocks (spec 024)."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
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

    Uses a PostgreSQL `INSERT ... ON CONFLICT DO NOTHING` upsert
    keyed on `(user_id, achievement_id)` so two concurrent
    requests cannot race to insert the same row and produce an
    `IntegrityError`. The first-timestamp-wins rule (FR-5) is
    satisfied by the `DO NOTHING` clause: a later save never
    overwrites the original `unlocked_at`.

    Returns one row per requested `achievement_id`, in the order
    the IDs were requested. Each returned row's `unlocked_at` is
    whatever the database has stored (the original first save).
    """

    requested: list[tuple[str, datetime]] = list(unlocks)
    if not requested:
        return []

    # Pre-load existing rows so we can return them untouched.
    requested_ids = [item[0] for item in requested]
    existing_rows = list(
        db.execute(
            select(AchievementUnlock).where(
                AchievementUnlock.user_id == user_id,
                AchievementUnlock.achievement_id.in_(requested_ids),
            )
        ).scalars()
    )
    existing = {row.achievement_id: row for row in existing_rows}

    # Issue one upsert per new pair. `DO NOTHING` is race-safe:
    # if a parallel request already inserted the row, our insert
    # is a no-op and the original `unlocked_at` is preserved.
    for achievement_id, unlocked_at in requested:
        if achievement_id in existing:
            continue
        stmt = (
            pg_insert(AchievementUnlock)
            .values(
                user_id=user_id,
                achievement_id=achievement_id,
                unlocked_at=unlocked_at,
            )
            .on_conflict_do_nothing(
                index_elements=["user_id", "achievement_id"],
            )
        )
        db.execute(stmt)
    db.commit()

    # Re-read all requested IDs (the upsert may have created the
    # row; the existing map may have been populated by a parallel
    # request between the SELECT and the commit). One final query
    # guarantees the canonical timestamps.
    canonical = {
        row.achievement_id: row
        for row in db.execute(
            select(AchievementUnlock).where(
                AchievementUnlock.user_id == user_id,
                AchievementUnlock.achievement_id.in_(requested_ids),
            )
        ).scalars()
    }
    return [canonical[item[0]] for item in requested if item[0] in canonical]
