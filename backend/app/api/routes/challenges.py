"""Annual reading challenge routes — authenticated, user-scoped."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.challenge import AnnualReadingChallengePayload, serialize_challenge
from app.services.challenges import (
    get_challenge_for_user,
    save_challenge_for_user,
)

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("/{year}")
def get_challenge(
    year: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, Any] | None:
    record = get_challenge_for_user(db, current_user.id, year)
    if record is None:
        return None
    return serialize_challenge(record)


@router.put("/{year}")
def save_challenge(
    year: int,
    payload: AnnualReadingChallengePayload,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, Any]:
    record = save_challenge_for_user(
        db, current_user.id, year, payload.target_books
    )
    return serialize_challenge(record)
