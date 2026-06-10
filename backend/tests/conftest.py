"""Database fixtures for the backend test suite.

Tests run against a real PostgreSQL test database. The session-scoped
`engine` fixture creates the schema once per session. The `db`
fixture truncates the tables between tests so each test starts clean
and is fully isolated.
"""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import reset_settings_cache
from app.db import session as db_session
from app.db.base import Base


def _resolve_test_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        return url
    return "postgresql+psycopg://book:book@127.0.0.1:5432/book_test"


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    """Session-scoped engine for the test database."""

    reset_settings_cache()
    test_url = _resolve_test_url()
    eng = create_engine(test_url, future=True, pool_pre_ping=True)

    Base.metadata.drop_all(bind=eng)
    Base.metadata.create_all(bind=eng)
    try:
        yield eng
    finally:
        Base.metadata.drop_all(bind=eng)
        eng.dispose()


@pytest.fixture
def db(engine: Engine) -> Generator[Session, None, None]:
    """Per-test session with truncated tables.

    We point the application's session factory at the test engine for
    the duration of the test, then reset the cache so subsequent tests
    can reconfigure.
    """

    # Clear any pre-existing rows so tests are isolated.
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE TABLE books, annual_reading_challenges, "
                "achievement_unlocks, users RESTART IDENTITY CASCADE"
            )
        )

    db_session.set_engine(engine)
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
