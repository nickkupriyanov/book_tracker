"""Database fixtures for the backend test suite.

Tests run against a real PostgreSQL test database. We use a per-test
transactional rollback fixture so each test starts with a clean
schema, and we only create the schema once per session.
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
    """Session-scoped engine for the test database.

    We create the schema once per session and drop it at the end.
    """

    reset_settings_cache()
    test_url = _resolve_test_url()
    eng = create_engine(test_url, future=True, pool_pre_ping=True)

    # Ensure schema is clean.
    Base.metadata.drop_all(bind=eng)
    Base.metadata.create_all(bind=eng)
    try:
        yield eng
    finally:
        Base.metadata.drop_all(bind=eng)
        eng.dispose()


@pytest.fixture
def db(engine: Engine) -> Generator[Session, None, None]:
    """Per-test session wrapped in a transaction that rolls back.

    The application code is pointed at this session via `set_engine`
    so unit-of-work boundaries match production behavior.
    """

    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(
        bind=connection,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )
    session = SessionLocal()

    # Inject this session into the app via a connection-bound engine.
    bind_engine = create_engine(
        "postgresql+psycopg://",
        creator=lambda: connection,
        future=True,
    )
    db_session.set_engine(bind_engine)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
        db_session.reset_engine_cache()
