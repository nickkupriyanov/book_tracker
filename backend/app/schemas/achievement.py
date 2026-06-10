"""Pydantic schemas for the achievement endpoints (spec 024).

The list of `unlocks` is echoed back in the same order it was
requested, so the frontend can reconcile optimistic entries with
the canonical server response without re-sorting.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

ALLOWED_ACHIEVEMENT_IDS: tuple[str, ...] = (
    "first-finished-book",
    "five-finished-books",
    "long-read",
    "first-quote",
    "first-review",
    "five-rated-books",
    "seven-day-streak",
    "thousand-pages",
)

AchievementIdLiteral = Literal[
    "first-finished-book",
    "five-finished-books",
    "long-read",
    "first-quote",
    "first-review",
    "five-rated-books",
    "seven-day-streak",
    "thousand-pages",
]


class AchievementUnlockPayload(BaseModel):
    achievement_id: AchievementIdLiteral
    unlocked_at: datetime

    @field_validator("unlocked_at")
    @classmethod
    def _ensure_timezone(cls, value: datetime) -> datetime:
        # Frontend may submit either naive or aware timestamps. The
        # backend normalises to a UTC-aware value to keep storage
        # consistent with the timezone-aware column.
        if value.tzinfo is None:
            return value.replace(tzinfo=datetime.utcnow().astimezone().tzinfo)
        return value


class SaveUnlocksRequest(BaseModel):
    unlocks: Annotated[
        list[AchievementUnlockPayload],
        Field(max_length=64),
    ]


def serialize_unlock(record) -> dict:
    """Return the API response shape for an `AchievementUnlock` row."""

    return {
        "achievementId": record.achievement_id,
        "unlockedAt": record.unlocked_at.isoformat(),
    }
