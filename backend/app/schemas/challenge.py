"""Pydantic schemas for the annual challenge endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AnnualReadingChallengePayload(BaseModel):
    year: int = Field(ge=1900, le=9999)
    target_books: int = Field(ge=1)


def serialize_challenge(record) -> dict:
    """Return the API response shape for an `AnnualReadingChallenge` row."""

    return {
        "year": record.year,
        "targetBooks": record.target_books,
        "updatedAt": record.updated_at.isoformat(),
    }
