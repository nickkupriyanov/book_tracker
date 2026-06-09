"""CLI create-user tests."""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import reset_settings_cache
from app.core.security import verify_password
from app.db import session as db_session
from app.models import User
from app.scripts.create_user import create_or_update_user, main


@pytest.fixture
def cli_env(
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[Session, None, None]:
    """Provide a session bound to the test engine and set DATABASE_URL."""

    monkeypatch.setenv(
        "DATABASE_URL",
        os.environ.get(
            "TEST_DATABASE_URL",
            "postgresql+psycopg://book:book@127.0.0.1:5432/book_test",
        ),
    )
    reset_settings_cache()
    db_session.set_engine(engine)

    from sqlalchemy.orm import sessionmaker

    SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        db_session.reset_engine_cache()


def test_create_user_persists_hash_and_is_idempotent(cli_env) -> None:
    user, created = create_or_update_user("cli@example.com", "first-password")
    assert created is True
    assert user.id > 0
    assert verify_password("first-password", user.password_hash)

    same = cli_env.execute(
        select(User).where(User.email == "cli@example.com")
    ).scalar_one()
    assert same.id == user.id

    # Re-running with the same email updates the password rather than
    # creating a duplicate.
    again, created_again = create_or_update_user("cli@example.com", "new-password")
    assert created_again is False
    assert again.id == user.id
    assert verify_password("new-password", again.password_hash)
    assert not verify_password("first-password", again.password_hash)

    rows = (
        cli_env.execute(
            select(User).where(User.email == "cli@example.com")
        )
        .scalars()
        .all()
    )
    assert len(rows) == 1


def test_cli_main_returns_zero_on_success(
    cli_env, capsys: pytest.CaptureFixture[str]
) -> None:
    exit_code = main(["--email", "cli-main@example.com", "--password", "pw"])
    assert exit_code == 0
    captured = capsys.readouterr()
    assert "user created" in captured.out
