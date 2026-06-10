"""CLI command for creating the first backend user.

Usage:
    create-user --email you@example.com --password 'choose-a-strong-password'
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models import User


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="create-user",
        description=(
            "Create or update a Book Tracker backend user. "
            "Re-running with the same email updates the password."
        ),
    )
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    return parser.parse_args(argv)


def create_or_update_user(email: str, password: str) -> tuple[User, bool]:
    """Create a new user or update the password of an existing one.

    Returns:
        (user, created) tuple.
    """

    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set")
    session_factory = get_session_factory()
    session = session_factory()
    try:
        existing = session.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()
        if existing is not None:
            existing.password_hash = hash_password(password)
            session.commit()
            session.refresh(existing)
            return existing, False
        user = User(email=email, password_hash=hash_password(password))
        session.add(user)
        session.commit()
        session.refresh(user)
        return user, True
    finally:
        session.close()


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        user, created = create_or_update_user(args.email, args.password)
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 1
    action = "created" if created else "updated"
    print(f"user {action}: id={user.id} email={user.email}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
