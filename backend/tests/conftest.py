"""Pytest fixtures shared by the test suite."""

from __future__ import annotations

import os

import pytest


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    """Reset the settings cache around every test.

    Tests that override environment variables should mutate `os.environ`
    inside the test; the cache is cleared here so each test reads the
    current environment.
    """

    from app.core.config import reset_settings_cache

    reset_settings_cache()
    yield
    reset_settings_cache()


@pytest.fixture
def app_env() -> str:
    """Default to a development environment for tests that need one."""

    previous = os.environ.get("APP_ENV")
    os.environ["APP_ENV"] = "test"
    yield "test"
    if previous is None:
        os.environ.pop("APP_ENV", None)
    else:
        os.environ["APP_ENV"] = previous
