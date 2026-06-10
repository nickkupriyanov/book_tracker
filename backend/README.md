# Book Tracker — Backend

FastAPI + PostgreSQL backend for the Book Tracker app. This service is
optional — the frontend runs in localStorage demo mode by default and
does not require the backend.

## Stack

- Python 3.11+
- FastAPI + Uvicorn
- SQLAlchemy 2.x
- PostgreSQL (production), in-memory engine for tests that do not need
  a database
- JWT bearer auth (short-lived access tokens, in-memory only on the
  frontend)

## Required environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | HTTP mode | PostgreSQL DSN, e.g. `postgresql+psycopg://user:pass@host:5432/dbname` |
| `JWT_SECRET` | HTTP mode | Secret used to sign access tokens. Use a long random string. |
| `ACCESS_TOKEN_TTL_MINUTES` | HTTP mode | Access token lifetime, integer minutes (default `60`). |
| `CORS_ALLOW_ORIGINS` | HTTP mode | Comma-separated explicit origin allowlist, e.g. `http://localhost:3000,https://book.example.com` |
| `APP_ENV` | optional | `development` (default), `test`, or `production` |

`/health` is always available without authentication or a database.

## Local setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
export DATABASE_URL=postgresql+psycopg://book:book@127.0.0.1:5432/book
export JWT_SECRET=dev-secret-change-me
export CORS_ALLOW_ORIGINS=http://localhost:3000
uvicorn app.main:app --reload
```

## Create the first user

```bash
create-user --email you@example.com --password 'choose-a-strong-password'
```

The CLI is idempotent on email: re-running with the same email updates
the password instead of creating a duplicate.

## Tests

```bash
cd backend
pytest
```

Tests use an in-memory engine for `/health` and the application
configuration tests, and an isolated PostgreSQL test database selected
via test environment variables for database-touching tests.
