"""SQLAlchemy engine and session factory.

The engine is created lazily on first access. Tests inject their own
engine via the FastAPI dependency in `app.api.deps`.
"""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def _build_engine(url: str) -> Engine:
    """Create an engine with sensible PostgreSQL defaults.

    Tests that need an isolated database pass an explicit engine via
    `set_engine` and bypass the cached factory.
    """

    return create_engine(
        url,
        pool_pre_ping=True,
        future=True,
    )


def get_engine() -> Engine:
    """Return the process-wide engine, creating it on first use."""

    global _engine
    if _engine is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL is not set. Required for HTTP mode."
            )
        _engine = _build_engine(settings.database_url)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the session factory bound to the active engine."""

    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
    return _SessionLocal


def get_db() -> Generator[Session, Any, None]:
    """FastAPI dependency that yields a database session.

    The session is closed at the end of the request, even on errors.
    """

    factory = get_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()


def set_engine(engine: Engine | None) -> None:
    """Replace the cached engine and session factory.

    Passing `None` clears the cache. Tests use this to point the
    application at an isolated PostgreSQL test database.
    """

    global _engine, _SessionLocal
    _engine = engine
    _SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    ) if engine is not None else None


def reset_engine_cache() -> None:
    """Discard any cached engine. Intended for tests only."""

    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None
