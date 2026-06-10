# Runbook

End-to-end runbook for running Book Tracker in local mode (default,
no backend) and in HTTP mode (FastAPI + PostgreSQL, authenticated).

If you only want to poke at the app locally, you need **Local mode**.
Pick **HTTP mode** when you want a real backend with persistence and
login — that is what the spec 023 backend is for.

---

## TL;DR

```bash
# Local mode (default). No backend, no login, data in localStorage.
npm install
npm run dev
# open http://localhost:3000

# HTTP mode. Backend + login + PostgreSQL.
# Terminal 1 — backend
brew services start postgresql@14
createdb -O book book_dev
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export DATABASE_URL=postgresql+psycopg://book:book@127.0.0.1:5432/book_dev
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
export CORS_ALLOW_ORIGINS=http://localhost:3000
alembic upgrade head
python -m app.scripts.create_user --email you@example.com --password 'choose-a-strong-password'
npm run backend:dev

# Terminal 2 — frontend
cd ../
export NEXT_PUBLIC_STORAGE_MODE=http
export NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
npm run dev
# open http://localhost:3000, sign in with the user above
```

---

## 1. Local mode (no backend)

What you get: the full app, no login, data lives in your browser's
`localStorage`. Suitable for demos and local testing.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Gates:

```bash
npm run lint
npm run test
```

To reset local data, clear the site's storage in DevTools
(Application → Local Storage → right-click → Clear).

---

## 2. HTTP mode (FastAPI + PostgreSQL, login)

What you get: a separate FastAPI service that owns books and
challenges in PostgreSQL, scoped to a single user, with JWT auth.
The frontend talks to it through `HttpStorageAdapter`.

You will need: **Node 18+**, **Python 3.11+**, a local
**PostgreSQL 14+** server. Two terminals (backend + frontend).

### 2.1 PostgreSQL

```bash
# macOS + Homebrew (one-off)
brew services start postgresql@14
createuser -s book            # role with CREATEDB
createdb -O book book_dev     # dev database
```

The default connection string in this runbook is
`postgresql+psycopg://book:book@127.0.0.1:5432/book_dev`. Adjust the
URL if your local Postgres is on a different host, port, user, or
database.

### 2.2 Backend virtualenv

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

The `[dev]` extra pulls in `pytest`, `pytest-asyncio`, `httpx`, and
`alembic`. It also pulls `pydantic[email]` which is required for the
`EmailStr` validator in `app/schemas/auth.py`. If you skip the extra,
`app.main` will fail to import and `pytest` will fail at collection.

### 2.3 Environment variables for the backend

The backend reads its config from environment variables (and from
`backend/.env` if it exists). At minimum, set:

```bash
export DATABASE_URL=postgresql+psycopg://book:book@127.0.0.1:5432/book_dev
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
export CORS_ALLOW_ORIGINS=http://localhost:3000
```

Optional (defaults shown):

```bash
export ACCESS_TOKEN_TTL_MINUTES=60
export APP_ENV=development
```

A complete template is in `backend/.env.example`.

### 2.4 Apply migrations and create the first user

```bash
alembic upgrade head
python -m app.scripts.create_user --email you@example.com --password 'choose-a-strong-password'
```

`create-user` is idempotent on email — re-running with the same
address updates the password rather than creating a duplicate. v1
has no public registration endpoint; the CLI is the only way to add
a user.

### 2.5 Run the backend

```bash
npm run backend:dev
```

This runs `uvicorn app.main:app --reload --port 8000` from the
`backend/` directory. The dev server reloads on code changes.

You should see `Uvicorn running on http://127.0.0.1:8000` in the
terminal.

### 2.6 Run the frontend

In a second terminal, from the repo root:

```bash
export NEXT_PUBLIC_STORAGE_MODE=http
export NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

Open <http://localhost:3000>. You will see the login form. Sign in
with the email and password from step 2.4.

A page reload in HTTP mode **logs you out** by design — the access
token is held in memory only (spec 023 §6 FR-21). To work across
reloads you would need refresh tokens, which are explicitly out of
scope for v1.

---

## 3. Smoke check (HTTP mode)

With both backend and frontend running, verify the stack end-to-end
from a third terminal:

```bash
# 1. Health endpoint (no auth).
curl -s http://127.0.0.1:8000/health
# → {"status":"ok","app_env":"development"}

# 2. Login (should return a JWT).
curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"choose-a-strong-password"}'
# → {"access_token":"<jwt>","token_type":"bearer","expires_in":3600}

# 3. List books with that token.
TOKEN="<paste access_token here>"
curl -s http://127.0.0.1:8000/books -H "Authorization: Bearer $TOKEN"
# → []
```

If any of those fail, jump to the [Troubleshooting](#7-troubleshooting-http-mode)
section below.

---

## 4. Environment variables reference

### Frontend

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_STORAGE_MODE` | optional | `local` | `local` or `http`. Unknown values fail loudly at startup. |
| `NEXT_PUBLIC_API_BASE_URL` | only in HTTP | — | URL of the FastAPI backend, e.g. `http://127.0.0.1:8000`. |

Template: `.env.example` at the repo root.

### Backend

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes (HTTP) | — | PostgreSQL DSN, e.g. `postgresql+psycopg://user:pass@host:5432/dbname`. |
| `JWT_SECRET` | yes (HTTP) | — | Secret for signing access tokens. Use a long random string — `python -c "import secrets; print(secrets.token_urlsafe(64))"`. |
| `ACCESS_TOKEN_TTL_MINUTES` | optional | `60` | Access token lifetime in minutes. |
| `CORS_ALLOW_ORIGINS` | yes (HTTP) | — | Comma-separated origin allowlist, e.g. `http://localhost:3000,https://book.example.com`. |
| `APP_ENV` | optional | `development` | `development`, `test`, or `production`. |

Template: `backend/.env.example`. The backend reads it via
`pydantic-settings`.

---

## 5. Gating commands

These are the same commands CI runs. They must pass before any task
is "done" (see `AGENTS.md`).

```bash
# Frontend
npm run lint        # ESLint
npm run test        # 910 vitest cases, ~8s
npm run build       # Next.js production build, no env required

# Backend
cd backend
pytest              # 51 pytest cases against PostgreSQL test DB
```

`npm run test` exits 0 even when there are no matching tests, so it
is safe to run as a pre-commit hook.

---

## 6. Common errors

| Symptom | Cause | Fix |
| --- | --- | --- |
| `email-validator is not installed` | Installed backend without the `[dev]` extra. | `pip install -e ".[dev]"` (or `pydantic[email]>=2.6` explicitly). |
| `psycopg.OperationalError ... database "book_dev" does not exist` | DB not created. | `createdb -O book book_dev`. |
| `relation "books" does not exist` | Migrations not applied. | `cd backend && alembic upgrade head`. |
| `CORS preflight ... 400` | Forgot `CORS_ALLOW_ORIGINS` on the backend. | `export CORS_ALLOW_ORIGINS=http://localhost:3000` before `npm run backend:dev`. |
| `NEXT_PUBLIC_API_BASE_URL is required when NEXT_PUBLIC_STORAGE_MODE=http` | Frontend env missing. | `export NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` before `npm run dev`. |
| HTTP mode: I log in, then the login form comes back. | The backend rejected the token (usually 401 on init). | Reload and try again. The token is in-memory only, so a fresh attempt is the only path. The reason is almost always a backend that is down or a wrong `NEXT_PUBLIC_API_BASE_URL`. |
| `InsecureKeyLengthWarning: The HMAC key is 11 bytes long` | Test fixtures use a short `JWT_SECRET` on purpose. | Safe in tests. In production, use at least 32 random bytes — see `JWT_SECRET` row above. |
| `Address already in use` on `npm run backend:dev` | Another process on port 8000. | `lsof -ti:8000 | xargs kill` (macOS/Linux) or change the port. |

---

## 7. Troubleshooting HTTP mode

When the UI behaves unexpectedly in HTTP mode, look at the
**Network** tab in DevTools. The expected sequence after a successful
login is:

1. `POST /auth/login` → 200 with `access_token` in the JSON body.
2. `GET /books` → 200 with `[]` (or your books).
3. `GET /challenges/{year}` → 200 with `null` (or the saved challenge).

Common deviations:

- **Step 1 fails with 401** — wrong email or password. The login form
  shows a friendly "invalid email or password" error.
- **Step 1 fails with 0 / network error** — backend not running, or
  CORS preflight rejected, or wrong `NEXT_PUBLIC_API_BASE_URL`. Check
  the backend terminal; check `CORS_ALLOW_ORIGINS`; check the URL.
- **Step 1 succeeds, step 2 or 3 fails with 401** — token was issued
  but the backend rejected it on the second request. This usually
  means a clock skew or that `JWT_SECRET` changed between issuing and
  verifying. Stop the backend, leave the env alone, restart.
- **Steps 2 / 3 fail with 401 mid-session** — token expired (default
  lifetime is 60 minutes). Reload to clear the in-memory token and
  log in again. The UI returns to the login form automatically.
- **Steps 2 / 3 fail with 5xx** — backend error. Check the uvicorn
  logs; usually a database or migration problem.
- **Steps 2 / 3 fail with CORS** — same as above; fix
  `CORS_ALLOW_ORIGINS`.

The frontend does not surface backend error bodies to the user; the
inline error in the login form (and the in-app `error` state for
mutations) is intentionally generic. The Network tab is the source
of truth.

---

## 8. Pointers

- Spec for the backend: [`specs/023-python-backend/spec.md`](../specs/023-python-backend/spec.md).
- Constitution (post-MVP amendment): [`.specify/memory/constitution.md`](../.specify/memory/constitution.md).
- Backend architecture: [`backend/README.md`](../backend/README.md).
- Top-level project docs: [`README.md`](../README.md).
