# Plan: Post-MVP Python Backend With Switchable Storage

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-09

---

## 1. Architecture summary

This feature adds a second persistence implementation behind the existing
`StorageAdapter` boundary. The current Next.js app keeps localStorage as the
default/demo path, while HTTP mode uses `HttpStorageAdapter` to talk to a
Python FastAPI backend in `backend/`. The backend owns authentication,
PostgreSQL persistence, and user scoping; the frontend store remains adapter
driven and should not learn about PostgreSQL, FastAPI, or backend table shape.

## 2. Module / file layout

- `backend/pyproject.toml` - Python package metadata, runtime dependencies, and
  test tooling.
- `backend/README.md` - local setup, environment variables, PostgreSQL, test
  command, and run command.
- `backend/app/main.py` - FastAPI app factory, routers, health endpoint, CORS.
- `backend/app/core/config.py` - typed settings from environment.
- `.specify/memory/constitution.md` - amended post-MVP principles for
  authenticated HTTP mode.
- `AGENTS.md` - practical instruction updated so backend work is allowed for
  spec 023 and later post-MVP backend specs.
- `backend/app/core/security.py` - password hashing and short-lived JWT
  helpers.
- `backend/app/db/session.py` - SQLAlchemy engine/session setup.
- `backend/app/db/base.py` - shared declarative base and metadata.
- `backend/app/models/*.py` - SQLAlchemy models for users, books, challenges.
- `backend/app/schemas/*.py` - Pydantic request/response schemas.
- `backend/app/scripts/create_user.py` - CLI command for creating the first VPS
  user.
- `backend/app/api/deps.py` - database session and current-user dependencies.
- `backend/app/api/routes/auth.py` - login and current-user endpoints.
- `backend/app/api/routes/books.py` - authenticated books CRUD.
- `backend/app/api/routes/challenges.py` - authenticated challenge load/save.
- `backend/app/services/*.py` - small persistence/auth helpers used by routes.
- `backend/tests/` - pytest coverage for auth, books, challenges, validation,
  and user scoping.
- `src/storage/http-storage-adapter.ts` - HTTP implementation of
  `StorageAdapter`.
- `src/storage/storage-mode.ts` - environment parsing and adapter factory.
- `src/components/RootClient.tsx` - initialize the adapter selected by env.
- `src/features/auth/` - small HTTP-mode login surface and auth state.
- `tests/storage/http-storage-adapter.test.ts` - fetch-level adapter tests.
- `tests/storage/storage-mode.test.ts` - env selection tests.
- `tests/components/RootClient.test.tsx` - local/http initialization coverage.
- `tests/features/auth/` - login behavior and HTTP-mode error coverage.

## 3. Data flow

### 3.1 Local mode

1. App starts with `NEXT_PUBLIC_STORAGE_MODE=local` or no explicit mode.
2. `RootClient` creates `LocalStorageAdapter`.
3. `useBookLibrary.init(adapter)` loads books and the current challenge from
   browser storage.
4. Existing UI flows call the same store actions as today.

### 3.2 HTTP mode

1. App starts with `NEXT_PUBLIC_STORAGE_MODE=http` and
   `NEXT_PUBLIC_API_BASE_URL`.
2. `RootClient` sees HTTP mode and renders the login flow until an in-memory
   access token is available. It does not call `useBookLibrary.init()` before
   login.
3. After login, `AuthGate` calls its render prop with the in-memory token.
   `RootClient` receives that token and creates `HttpStorageAdapter` with the
   API base URL and token provider.
4. `useBookLibrary.init(adapter)` calls `GET /books` and
   `GET /challenges/{currentYear}`.
5. Add/edit/delete/challenge saves call existing store actions, which delegate
   to `HttpStorageAdapter`.
6. `HttpStorageAdapter` maps store calls to authenticated HTTP requests.
7. FastAPI validates the token, scopes queries by `user_id`, persists to
   PostgreSQL, and returns payloads matching frontend domain types.

```text
UI -> useBookLibrary -> StorageAdapter
                         | local mode -> LocalStorageAdapter -> localStorage
                         | http mode  -> HttpStorageAdapter  -> FastAPI -> PostgreSQL
```

## 4. Component breakdown

- **AuthGate**
  - **Props:** `children: (token: string) => ReactNode`, `mode: StorageMode`.
  - **State:** login email/password draft, auth token, login status, login
    error.
  - **Behavior:** renders children immediately in local mode; in HTTP mode,
    renders login until authenticated, then calls the render prop with the
    in-memory token. It does not call the book store directly.
  - **Tests:** local mode bypass, successful login, invalid login, missing API
    config, reload-equivalent remount clears token.

- **LoginForm**
  - **Props:** `onLogin(email: string, password: string): Promise<void>`,
    `isSubmitting: boolean`, `error: string | null`.
  - **State:** controlled email/password fields.
  - **Behavior:** validates non-empty credentials, submits, shows friendly
    errors, and stays visually aligned with the cozy app style.
  - **Tests:** required fields, submit payload, loading state, error render.

- **HttpStorageAdapter**
  - **Props/constructor:** `{ baseUrl: string; getToken(): string | null }`.
  - **State:** none beyond constructor dependencies.
  - **Behavior:** sends authenticated JSON requests, converts HTTP failures to
    thrown errors, and returns `Book` / `AnnualReadingChallenge` shapes.
  - **Tests:** every `StorageAdapter` method success path, auth header, 401,
    404, malformed responses where feasible.

- **RootClient HTTP wiring**
  - **Props:** existing `{ children: ReactNode }`.
  - **State:** no token state of its own.
  - **Behavior:** in HTTP mode, receives the token from `AuthGate`'s render prop
    and initializes the store only after that token exists.
  - **Tests:** local initialization, HTTP deep link login-before-init, token
    handoff, no token persistence.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

Add `HttpStorageAdapter` as a second concrete implementation:

```ts
export class HttpStorageAdapter implements StorageAdapter {
  listBooks(): Promise<Book[]>;
  addBook(input: BookInput): Promise<Book>;
  updateBook(id: string, input: BookInput): Promise<Book>;
  deleteBook(id: string): Promise<void>;
  getAnnualReadingChallenge(year: number): Promise<AnnualReadingChallenge | null>;
  saveAnnualReadingChallenge(input: AnnualReadingChallengeInput): Promise<AnnualReadingChallenge>;
}
```

Add a small mode resolver and adapter factory so `RootClient` does not
hard-code either implementation:

```ts
export type StorageMode = "local" | "http";

export function resolveStorageMode(): StorageMode;
export function requireHttpApiBaseUrl(mode: StorageMode): string | null;
export function createStorageAdapter(options: {
  mode: StorageMode;
  apiBaseUrl: string | null;
  getToken: () => string | null;
}): StorageAdapter;
```

`resolveStorageMode()` returns `local` for missing or empty env values and
throws for unknown values. `createStorageAdapter()` returns
`LocalStorageAdapter` in local mode. In HTTP mode it requires
`NEXT_PUBLIC_API_BASE_URL` and returns `HttpStorageAdapter`.

## 6. Decisions & trade-offs

- Chose FastAPI over Next.js API routes because the user explicitly wants a
  Python backend.
- Chose PostgreSQL over SQLite because the intended first real deployment is a
  VPS and the project should start with production-shaped persistence.
- Chose JSONB book payload storage over fully normalized book columns for v1
  because the frontend `Book` type contains nested review, quote, and reading
  log payloads that should remain pass-through.
- Chose one repository with `backend/` over a separate repo because frontend
  and backend contracts will evolve together during this phase.
- Chose users and `user_id` from v1 because future monetization/social features
  need ownership, even if the first backend deployment has one real user.
- Chose a CLI create-user command over public registration because v1 needs a
  VPS owner account without opening signup.
- Chose localStorage for public demo/testing because it preserves the existing
  no-login experience and avoids shared demo data cleanup.
- Chose env-based storage switching over a UI toggle because the switch is a
  deployment/runtime concern, not an end-user setting.
- Chose in-memory short-lived JWT storage over localStorage/cookie persistence
  for v1, accepting that reload logs the user out.
- Chose no localStorage import in this spec to keep backend introduction
  focused and reversible.

## 7. Risks

- Auth changes the product boundary from MVP no-auth to post-MVP login. The
  implementation must keep localStorage mode unauthenticated.
- Backend validation can drift from TypeScript validators. Backend schemas
  should be permissive enough for existing nested book payloads but strict
  enough to reject invalid top-level inputs.
- Token storage is intentionally in-memory for v1. This is safer than
  localStorage token persistence but means reloads require login again.
- CORS and environment configuration can make local development brittle. Keep
  required env vars documented and error messages direct.
- PostgreSQL setup adds infrastructure. Backend tests should use an isolated
  PostgreSQL test database with per-test transaction rollback fixtures.
- JSONB payload storage for books is simple but can make future querying harder.
  Future social/search specs may add derived columns or normalized tables.

## 8. Rollout

- Behind a flag? Yes: `NEXT_PUBLIC_STORAGE_MODE=local|http`.
- Default mode: `local`, so existing demos and tests do not require backend.
- Migration needed? No. Existing browser localStorage data is not imported.
- Backend deployment target: VPS with PostgreSQL.
- Manual QA steps:
  - Run frontend in local mode with no backend running; verify current app
    works and no login appears.
  - Run backend with PostgreSQL and create/seed a user.
  - Run frontend in HTTP mode; verify login appears.
  - Log in; verify books load from backend.
  - Add, edit, delete a book; reload and verify persistence.
  - Save annual challenge; reload and verify persistence.
  - Create a second user through the CLI and verify user B cannot see user A's
    books or challenge.
  - Reload the app in HTTP mode; verify the in-memory token is gone and login
    appears again.
  - Stop backend in HTTP mode; verify app reports an error.
  - Use an invalid password; verify friendly login error.
  - Run frontend `npm run lint`.
  - Run frontend `npm run test`.
  - Run backend test command from `backend/README.md`.
