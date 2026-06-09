# Tasks: Post-MVP Python Backend With Switchable Storage

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and the relevant frontend/backend gates pass.

---

## T0. Amend post-MVP project rules

- **Files:** `.specify/memory/constitution.md`, `AGENTS.md`,
  `specs/023-python-backend/spec.md`
- **Acceptance:** Constitution and AGENTS explicitly allow post-MVP backend,
  auth, and user-scoped HTTP mode for approved specs while preserving
  localStorage/no-auth demo mode. The amendment diffs are written in this same
  PR and reviewed as T0's change.
- **Notes:** This must happen before backend implementation because the current
  constitution excludes backend/auth from MVP.

## T1. Scaffold FastAPI backend

- **Files:** `backend/pyproject.toml`, `backend/README.md`,
  `backend/app/main.py`, `backend/app/core/config.py`, `backend/tests/`
- **Acceptance:** `backend/` has a runnable FastAPI app with `/health`, typed
  settings, documented env vars, and one passing TestClient smoke test for
  `/health` that does not require PostgreSQL.
- **Notes:** Do not wire frontend yet. Define settings for `DATABASE_URL`,
  `JWT_SECRET`, `ACCESS_TOKEN_TTL_MINUTES`, `CORS_ALLOW_ORIGINS`, and
  `APP_ENV`, but keep database engine creation lazy until T2. Configure
  FastAPI CORSMiddleware so preflight works for authenticated JSON requests:
  explicit allowlist origins, `allow_credentials=False`, needed HTTP methods,
  and `Authorization` / `Content-Type` headers.

## T2. Add PostgreSQL session and models

- **Files:** `backend/app/db/base.py`, `backend/app/db/session.py`,
  `backend/app/models/user.py`, `backend/app/models/book.py`,
  `backend/app/models/challenge.py`, `backend/tests/test_db_models.py`
- **Acceptance:** Tests can create users, user-scoped books, and user-scoped
  annual challenges in an isolated test database/session. Book records use a
  JSONB payload column for the frontend `Book` shape.
- **Notes:** Include `user_id` ownership from the first model pass. Nested
  review, quotes, and reading logs are stored pass-through in the JSONB payload.
  Add the Alembic baseline migration in this task. Backend tests use a real
  PostgreSQL test database selected by test env settings, with a transaction
  rollback fixture per test.

## T3. Implement backend auth and create-user CLI

- **Files:** `backend/app/core/security.py`, `backend/app/schemas/auth.py`,
  `backend/app/api/deps.py`, `backend/app/api/routes/auth.py`,
  `backend/app/scripts/create_user.py`, `backend/app/main.py`,
  `backend/tests/test_auth.py`, `backend/tests/test_create_user.py`
- **Acceptance:** Tests cover successful login, invalid password, missing token,
  invalid token, short-lived JWT claims, `GET /auth/me`, and CLI user creation.
- **Notes:** Use password hashing and bearer tokens. No public registration,
  refresh token, logout endpoint, or persistent browser token in v1.

## T4. Implement backend books API

- **Files:** `backend/app/schemas/book.py`, `backend/app/services/books.py`,
  `backend/app/api/routes/books.py`, `backend/app/main.py`,
  `backend/tests/test_books_api.py`
- **Acceptance:** Authenticated tests cover list, create, update, delete,
  not-found errors, validation errors, and user scoping.
- **Notes:** API responses must match the frontend `Book` shape. Preserve nested
  review, quote, and reading-log data exactly as submitted. Use a permissive
  Pydantic payload model for books, validating only the required top-level
  fields needed by the API while allowing nested frontend-owned structures to
  pass through unchanged.

## T5. Implement backend annual challenge API

- **Files:** `backend/app/schemas/challenge.py`,
  `backend/app/services/challenges.py`,
  `backend/app/api/routes/challenges.py`, `backend/app/main.py`,
  `backend/tests/test_challenges_api.py`
- **Acceptance:** Authenticated tests cover missing challenge returning `null`,
  create/update by year, invalid target, and user scoping.
- **Notes:** One active challenge per user/year.

## T6. Add frontend storage mode resolver

- **Files:** `src/storage/storage-mode.ts`,
  `tests/storage/storage-mode.test.ts`
- **Acceptance:** Tests cover default local mode, explicit local mode, explicit
  HTTP mode, invalid mode, missing API URL in HTTP mode, and local mode without
  API URL.
- **Notes:** This task may expose resolver functions and a local-only adapter
  factory. Full HTTP adapter construction is completed in T7.

## T7. Implement HttpStorageAdapter

- **Files:** `src/storage/http-storage-adapter.ts`,
  `tests/storage/http-storage-adapter.test.ts`
- **Acceptance:** Tests cover all `StorageAdapter` methods, auth header usage,
  JSON request bodies, `null` challenge response, 401/404 failures, and network
  failure. `createStorageAdapter()` can now return `HttpStorageAdapter` in HTTP
  mode.
- **Notes:** Do not change `StorageAdapter` signatures.

## T8. Add HTTP-mode auth UI/state

- **Files:** `src/features/auth/LoginForm.tsx`,
  `src/features/auth/AuthGate.tsx`, `src/features/auth/index.ts`,
  `tests/features/auth/LoginForm.test.tsx`,
  `tests/features/auth/AuthGate.test.tsx`
- **Acceptance:** Tests cover local-mode bypass, HTTP-mode login form,
  successful login, invalid login error, loading state, in-memory token handoff,
  and token clearing on remount/reload. Tests also assert the token is not
  written to `localStorage`, `sessionStorage`, or cookies.
- **Notes:** Use existing shadcn/ui controls and warm app styling. No dashboard
  layout, no glassmorphism. AuthGate owns auth UI/token state only; RootClient
  owns store initialization. Test remount clearing by unmounting the component
  and asserting a fresh mount returns to the unauthenticated login state.

## T9. Wire adapter selection into RootClient

- **Files:** `src/components/RootClient.tsx`,
  `tests/components/RootClient.test.tsx`
- **Acceptance:** Tests prove local mode initializes `LocalStorageAdapter`,
  HTTP mode initializes only after auth, and existing localStorage behavior is
  unchanged. Deep links in HTTP mode show login before library initialization.
- **Notes:** Zustand should still receive only a `StorageAdapter`. This is the
  task that replaces the current hard-coded `new LocalStorageAdapter()` call.
  RootClient receives the token from `AuthGate`'s render prop or an equivalent
  narrow context; it must not create its own independent token state.
  Initialization is guarded with `useEffect`/`useRef` or equivalent so token
  re-handoff does not re-init the store repeatedly.

## T10. Document local and HTTP run modes

- **Files:** `README.md`, `backend/README.md`, optional `.env.example`
- **Acceptance:** Docs explain local demo mode, HTTP mode, required frontend env
  vars, required backend env vars, PostgreSQL setup, backend run command, and
  backend test command. Docs include the create-user CLI command.
- **Notes:** Do not include real secrets.

## T11. End-to-end verification and acceptance pass

- **Files:** `specs/023-python-backend/spec.md`,
  `specs/023-python-backend/plan.md`, `specs/023-python-backend/tasks.md`,
  affected implementation files and tests
- **Acceptance:** Spec acceptance criteria are reviewed, frontend lint passes,
  frontend tests pass, backend tests pass, local mode works without backend, and
  HTTP mode works against backend. Manual QA includes two users proving data
  scoping, and reload in HTTP mode proving the token is not persisted.
- **Notes:** Do not commit until the user explicitly approves after reviewing
  the changes.
