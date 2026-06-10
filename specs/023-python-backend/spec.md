# Spec: Post-MVP Python Backend With Switchable Storage

> **Status:** Implemented
> **Author:** Codex
> **Created:** 2026-06-09
> **Spec ID:** 023-python-backend
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** localStorage MVP, `StorageAdapter`, spec 018 (yearly reading challenge), spec 022 (page-based reading tracking)

---

## 1. Problem

Book Tracker currently persists all user data in browser `localStorage`. That
works well for a public demo and for local MVP testing, but it is fragile for a
real deployed app: data is tied to one browser, cannot be restored easily, and
is not suitable for VPS hosting or future paid/social features.

The project already has a `StorageAdapter` boundary. This means backend
persistence can be introduced as a second storage mode without breaking the
current localStorage-backed app.

This spec is explicitly **post-MVP**. It introduces backend persistence,
authentication, user accounts, and user-scoped data for HTTP mode. That
conflicts with the current MVP-only constitution language in §1 and §5, so the
implementation must include a constitution amendment before backend code is
added. The amendment should keep localStorage/no-auth as the demo mode while
allowing authenticated HTTP persistence for post-MVP deployments.

## 2. Goal

Add a real Python-backed persistence mode while keeping the current localStorage
mode working and selectable.

## 3. Non-goals

- No migration from existing browser localStorage data in this spec.
- No subscriptions, payments, social features, sharing, friends, feeds, or
  public profiles.
- No public guest backend mode. Public demo/testing continues to use
  localStorage.
- No full admin panel.
- No separate backend repository yet.
- No rewrite of the current frontend state model.
- No replacement or behavioral change to `LocalStorageAdapter`.
- No refresh tokens, token rotation, persistent sessions, or logout endpoint in
  v1.

## 4. Users & scenarios

**Story.** The app owner deploys Book Tracker to a VPS, signs in, and stores
books in PostgreSQL through the FastAPI backend.

**Story.** A tester opens the demo/local build with
`NEXT_PUBLIC_STORAGE_MODE=local` and can use the current app without backend or
login.

**Story.** A developer switches between localStorage and HTTP persistence by
changing environment variables, without touching UI components or Zustand store
logic.

**Story.** A future implementation can add monetization or social features on
top of user-owned backend data because books and challenge settings already
belong to a user.

## 5. UX

### 5.1 Local mode

Local mode keeps the current experience. The app initializes from
`LocalStorageAdapter`, requires no login, and remains suitable for demos and
public testers.

### 5.2 HTTP mode

HTTP mode requires authentication before the library can load. The login surface
should feel calm and book-inspired, matching the existing app tone. It should
not introduce dashboard-like UI.

Once authenticated, the rest of the app should feel the same as local mode:
books, progress, reviews, quotes, statistics, and the yearly challenge continue
to use the existing screens and states.

### 5.3 Errors

Backend failures should reuse existing loading/error states where possible. For
mutation failures, keep the user's draft visible and show the same kind of
friendly inline or toast feedback already used by localStorage failures.

## 6. Functional requirements

- **FR-1.** Backend code lives under `backend/` in this repository.
- **FR-2.** Backend uses FastAPI.
- **FR-3.** Backend uses PostgreSQL for durable persistence.
- **FR-4.** Backend stores users from v1.
- **FR-5.** Books and annual reading challenges are scoped to `user_id`.
- **FR-6.** HTTP mode requires login and authenticated API requests.
- **FR-7.** localStorage mode remains unauthenticated and does not require the
  backend to run.
- **FR-8.** Frontend chooses storage mode by environment variable:
  `NEXT_PUBLIC_STORAGE_MODE=local` or `NEXT_PUBLIC_STORAGE_MODE=http`.
- **FR-9.** `NEXT_PUBLIC_STORAGE_MODE=local` initializes
  `LocalStorageAdapter`.
- **FR-10.** Missing or empty `NEXT_PUBLIC_STORAGE_MODE` defaults to `local`.
- **FR-11.** Unknown `NEXT_PUBLIC_STORAGE_MODE` values fail loudly.
- **FR-12.** `NEXT_PUBLIC_STORAGE_MODE=http` initializes `HttpStorageAdapter`
  only after login.
- **FR-13.** `HttpStorageAdapter` conforms to the existing `StorageAdapter`
  interface.
- **FR-14.** Zustand store code continues to depend only on `StorageAdapter`,
  not directly on HTTP, auth, PostgreSQL, or localStorage.
- **FR-15.** Backend validates incoming book and challenge payloads before
  writing.
- **FR-16.** API responses for books match `src/types/book.ts`.
- **FR-17.** API responses for annual challenges match
  `src/types/challenge.ts`.
- **FR-18.** A user can only read and mutate their own books and annual
  challenges.
- **FR-19.** Missing backend configuration in HTTP mode fails loudly during app
  setup or initialization.
- **FR-20.** Missing backend configuration does not affect localStorage mode.
- **FR-21.** The frontend HTTP token is kept in memory only for v1. A page
  reload in HTTP mode logs the user out and shows login again. See FR-26.
- **FR-22.** The backend issues short-lived JWT access tokens. No refresh token
  or persistent browser token storage is included in this spec.
- **FR-23.** Backend CORS is configured by an explicit origin allowlist for
  local development and VPS deployment.
- **FR-24.** The backend includes a CLI seed/create-user command so the VPS
  owner can create the first user without exposing public registration.
- **FR-25.** The implementation includes a constitution/AGENTS amendment task
  before backend implementation starts.
- **FR-26.** HTTP mode does not persist the access token to `localStorage`,
  `sessionStorage`, cookies, or any other browser storage.

## 7. Data

Frontend domain types remain the contract for API payloads:

- `Book` and `BookInput` from `src/types/book.ts`
- `AnnualReadingChallenge` and `AnnualReadingChallengeInput` from
  `src/types/challenge.ts`

Backend v1 owns these minimum entities:

```text
users
  id
  email
  password_hash
  created_at

books
  id
  user_id
  payload JSONB matching Book
  created_at
  updated_at

annual_reading_challenges
  id
  user_id
  year
  target_books
  updated_at
```

Backend v1 stores books as a JSONB payload plus ownership/persistence metadata.
The API returns the payload as the frontend `Book` shape. This keeps v1 focused
on backend introduction rather than duplicating the whole frontend validation
model in Python.

The backend should preserve frontend-generated nested data such as reviews,
quotes, and reading logs. The backend is pass-through for nested
`review`, `quotes`, and `readingLogs` content. It validates top-level book
shape and ownership, but does not rewrite nested `Quote.id`,
`Quote.createdAt`, `ReadingLog.id`, `ReadingLog.createdAt`, or
`ReadingLog.updatedAt` values.

On `addBook`, the backend stamps the top-level `Book.id` and
`Book.createdAt`, matching the existing `StorageAdapter` contract. On
`updateBook`, the backend uses the path `id`, preserves the existing top-level
`createdAt`, and stores the submitted mutable `BookInput` fields. Backend row
metadata such as `books.updated_at` may be updated internally, but it is not a
replacement for frontend-facing `Book.createdAt`.

Required frontend env vars:

```text
NEXT_PUBLIC_STORAGE_MODE=local|http
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

`NEXT_PUBLIC_API_BASE_URL` is required only in HTTP mode.

Required backend env vars:

```text
DATABASE_URL=postgresql+psycopg://...
JWT_SECRET=...
ACCESS_TOKEN_TTL_MINUTES=...
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
APP_ENV=development|test|production
```

## 8. Storage interface

No changes to `StorageAdapter` are required.

The existing interface remains:

```ts
export interface StorageAdapter {
  listBooks(): Promise<Book[]>;
  addBook(input: BookInput): Promise<Book>;
  updateBook(id: string, input: BookInput): Promise<Book>;
  deleteBook(id: string): Promise<void>;
  getAnnualReadingChallenge(
    year: number
  ): Promise<AnnualReadingChallenge | null>;
  saveAnnualReadingChallenge(
    input: AnnualReadingChallengeInput
  ): Promise<AnnualReadingChallenge>;
}
```

The new frontend implementation is `HttpStorageAdapter`. It maps the existing
methods to authenticated HTTP calls.

### 8.1 Backend API

The backend API mirrors the storage contract:

```text
POST   /auth/login
GET    /auth/me

GET    /books
POST   /books
PUT    /books/{id}
DELETE /books/{id}

GET    /challenges/{year}
PUT    /challenges/{year}
```

`POST /auth/login` returns an access token usable by the frontend for
subsequent HTTP-mode requests.

`GET /challenges/{year}` returns the saved challenge for that year or `null`
when none exists.

`PUT /challenges/{year}` creates or updates the challenge for the authenticated
user and year.

## 9. Edge cases & errors

- Backend unavailable in HTTP mode sets the library to an error state.
- Backend unavailable in localStorage mode has no effect.
- Invalid login shows a friendly authentication error and does not load the
  library.
- Expired or invalid token returns the app to an unauthenticated HTTP-mode
  state.
- Reloading the page in HTTP mode clears the in-memory token and returns the
  user to login.
- In HTTP mode, `useBookLibrary.init()` is not called before authentication.
  Deep links such as `/book/<id>` render the login gate first, then initialize
  after a successful login.
- A user cannot access another user's books or challenge settings.
- Deleting a missing book returns a not-found error.
- Updating a missing book returns a not-found error.
- Duplicate challenge year for the same user updates the existing record rather
  than creating multiple active records.
- Invalid book payloads are rejected before persistence.
- localStorage mode still handles corrupt or missing browser storage exactly as
  it does today.
- HTTP mode fails clearly if the API base URL is missing.

## 10. Acceptance criteria

- [x] `backend/` contains a FastAPI project scaffold.
- [x] Constitution and AGENTS instructions are amended to allow post-MVP
  authenticated HTTP mode while preserving localStorage demo mode.
- [x] Backend configuration documents PostgreSQL connection requirements.
- [x] Backend configuration documents `DATABASE_URL`, `JWT_SECRET`,
  `ACCESS_TOKEN_TTL_MINUTES`, `CORS_ALLOW_ORIGINS`, and `APP_ENV`.
- [x] Backend exposes a CLI command to create the first user.
- [x] Backend has user persistence with password hashing.
- [x] Backend exposes login and current-user endpoints.
- [x] Authenticated books CRUD works through the backend API.
- [x] Authenticated annual challenge load/save works through the backend API.
- [x] Books and challenges are scoped by `user_id`.
- [x] `HttpStorageAdapter` is implemented and conforms to `StorageAdapter`.
- [x] `NEXT_PUBLIC_STORAGE_MODE=local` keeps current localStorage behavior.
- [x] Missing/empty `NEXT_PUBLIC_STORAGE_MODE` defaults to local mode.
- [x] Unknown `NEXT_PUBLIC_STORAGE_MODE` fails loudly.
- [x] `NEXT_PUBLIC_STORAGE_MODE=http` uses backend persistence.
- [x] localStorage mode does not render or require login.
- [x] HTTP mode handles login before loading the library.
- [x] Reloading in HTTP mode clears the token and shows login again.
- [x] HTTP mode stores no token in localStorage.
- [x] HTTP mode handles backend/API errors cleanly.
- [x] Existing localStorage tests still pass.
- [x] New `HttpStorageAdapter` tests cover successful reads/writes and common
  failures.
- [x] Backend tests cover auth, book CRUD, challenge save/load, validation, and
  user scoping.
- [x] Frontend `npm run lint` passes.
- [x] Frontend `npm run test` passes.
- [x] Backend test command passes.

## 11. Out of scope (for this spec)

- Importing existing browser localStorage data into the backend.
- Multi-user social behavior.
- Paid plans, subscriptions, billing, or entitlements.
- Public demo data stored in backend.
- Conflict resolution across multiple active sessions.
- Offline-first sync.
- Admin dashboard.
- Public registration endpoint.
- Moving frontend code into a monorepo `apps/web` layout.

## 12. Open questions

- **Q1.** Confirm T0's constitution/AGENTS amendment diff is reviewed and
  accepted as part of T0's PR. T1 does not start until that PR is merged.

The draft assumes:

- FastAPI is the Python backend framework.
- PostgreSQL is preferred because VPS deployment is the intended direction.
- Public testers use the existing localStorage mode.
- Backend v1 has users and `user_id` ownership from day one.
- Full monetization and social features are future specs.
