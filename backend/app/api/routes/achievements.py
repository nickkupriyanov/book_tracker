"""Reader achievement routes — authenticated, user-scoped (spec 024)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.achievement import (
    SaveUnlocksRequest,
    serialize_unlock,
)
from app.services.achievements import list_unlocks_for_user, save_unlocks_for_user

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("")
def list_achievements(
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, list[dict[str, Any]]]:
    rows = list_unlocks_for_user(db, current_user.id)
    return {"unlocks": [serialize_unlock(row) for row in rows]}


@router.post("/unlocks")
def save_unlocks(
    payload: SaveUnlocksRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, list[dict[str, Any]]]:
    rows = save_unlocks_for_user(
        db,
        current_user.id,
        [(item.achievement_id, item.unlocked_at) for item in payload.unlocks],
    )
    return {"unlocks": [serialize_unlock(row) for row in rows]}
