"""Password hashing and JWT helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"
TOKEN_TYPE = "access"


class InvalidTokenError(Exception):
    """Raised when a JWT cannot be decoded or is otherwise invalid."""


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when the password matches the stored hash."""

    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(
    *,
    subject: str,
    user_id: int,
    expires_in_minutes: int | None = None,
    expires_in_seconds: int | None = None,
) -> str:
    """Issue a signed JWT access token.

    Args:
        subject: stable user identifier (we use the email).
        user_id: numeric user id stored in the token for convenience.
        expires_in_minutes: optional override for the lifetime, in minutes.
        expires_in_seconds: optional override for the lifetime, in seconds.
            Intended primarily for tests.
    """

    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not configured")
    if expires_in_seconds is not None and expires_in_minutes is not None:
        raise ValueError(
            "pass either expires_in_minutes or expires_in_seconds, not both"
        )
    if expires_in_seconds is not None:
        lifetime = timedelta(seconds=expires_in_seconds)
    elif expires_in_minutes is not None:
        lifetime = timedelta(minutes=expires_in_minutes)
    else:
        lifetime = timedelta(minutes=settings.access_token_ttl_minutes)
    issued_at = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "uid": user_id,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + lifetime).timestamp()),
        "type": TOKEN_TYPE,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode a JWT access token and return its claims.

    Raises:
        InvalidTokenError: when the token is missing, malformed, has the
            wrong type, or has expired.
    """

    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not configured")
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError("invalid token") from exc
    if claims.get("type") != TOKEN_TYPE:
        raise InvalidTokenError("wrong token type")
    return claims
