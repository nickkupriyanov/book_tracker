# Tasks: Reader Achievements

> **Status:** Approved
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and all relevant frontend/backend gates pass.

---

## [x] T1. Add achievement domain types and catalog

- **Files:** `src/types/achievement.ts`, `src/lib/achievements.ts`
- **Acceptance:** The typed catalog contains exactly the eight approved IDs,
  exactly two secret definitions, stable catalog order, and no `any`.
- **Notes:** Keep display metadata and rule identity in code; persist unlocks
  only.

## [x] T2. Implement and test the pure achievement engine

- **Files:** `src/lib/achievements.ts`, `src/lib/achievements.test.ts`
- **Acceptance:** Unit tests cover all eight rules, boundary values, invalid
  dates/pages, duplicate reading dates, rich/plain review emptiness, stable
  sorting, and deterministic output.
- **Notes:** Reuse existing reading-date and rich-text helpers where possible.
  The engine returns eligible IDs and never reads storage or current time.

## [x] T3. Extend StorageAdapter and local persistence

- **Files:** `src/storage/storage-adapter.ts`,
  `src/storage/local-storage-adapter.ts`, relevant storage tests and test fakes
- **Acceptance:** Local adapter tests cover empty/corrupt data, entry
  validation, earliest-timestamp deduplication, request-order responses,
  idempotent batch save, and preservation of books/challenges.
- **Notes:** Use the separate `book-tracker:achievement-unlocks` key. Update all
  `StorageAdapter` test doubles so TypeScript remains green.

## [x] T4. Add the achievement Zustand store

- **Files:** `src/state/achievements.ts`, `tests/state/achievements.test.ts`
- **Acceptance:** Tests cover load states, silent initial reconciliation,
  discovery timestamps, permanent unlocks, one notification payload per batch,
  pending-save deduplication, explicit retry, and reset behavior for tests/auth
  changes.
- **Notes:** Keep the adapter reference outside reactive state, following the
  existing library-store pattern. Achievement errors must not set library
  status to `error`.

## [x] T5. Wire achievement lifecycle into local and HTTP roots

- **Files:** root/HTTP adapter wiring components and focused component tests
- **Acceptance:** Local and HTTP modes initialize achievements with the exact
  active `StorageAdapter`; initial books do not cause a toast; later successful
  book changes do; logout/remount cannot leak one user's state into another.
- **Notes:** Add a narrow provider/orchestrator rather than duplicating
  evaluation calls across add, edit, quote, review, rating, and progress UI.

## [x] T6. Add PostgreSQL model and migration

- **Files:** `backend/app/models/achievement.py`, model exports/user
  relationship, `backend/migrations/versions/0002_achievement_unlocks.py`,
  backend model tests
- **Acceptance:** The migration creates user-owned unlock rows with cascade
  deletion and unique `(user_id, achievement_id)`; model tests prove uniqueness
  and user separation.
- **Notes:** Store timestamps in a timezone-aware column and keep the migration
  additive.

## [x] T7. Add achievement backend API

- **Files:** backend achievement schema/service/router modules, app router
  registration, `backend/tests/test_achievements_api.py`
- **Acceptance:** Authenticated tests cover empty list, batch insert, repeated
  idempotent insert, preserved first timestamp, invalid IDs/timestamps, missing
  auth, and two-user isolation.
- **Notes:** `POST /achievements/unlocks` returns canonical records for every
  requested ID in request order.

## [x] T8. Implement HttpStorageAdapter achievement methods

- **Files:** `src/storage/http-storage-adapter.ts`,
  `tests/storage/http-storage-adapter.test.ts`
- **Acceptance:** Tests cover GET/POST paths, auth headers, request/response
  shapes, empty results, malformed/error responses, 401 propagation, and
  network failure.
- **Notes:** Keep HTTP details inside the adapter; store and UI consume only the
  interface.

## [x] T9. Build achievement cards and full collection page

- **Files:** `src/features/achievements/`, `src/app/achievements/`, focused UI
  tests
- **Acceptance:** `/achievements` renders loading, retryable error,
  locked-only, and populated states; ordering matches the spec; secret locked
  cards reveal neither title nor condition; unlocked cards show stable dates.
- **Notes:** Use existing shadcn/ui primitives and warm visual tokens. Avoid
  progress bars, dense dashboard presentation, and celebratory animation.

## [x] T10. Add home preview, navigation, and toast bridge

- **Files:** `src/app/ShelfClient.tsx`, `src/components/AppHeader.tsx`,
  achievement feature components, focused tests
- **Acceptance:** The ready home page shows at most three newest unlocks below
  the profile card or gentle empty copy; `View all` and the new navigation link
  reach `/achievements`; each post-init batch creates exactly one accessible
  Sonner toast.
- **Notes:** Preserve current home responsive ordering and active navigation
  behavior.

## [ ] T11. Complete failure, accessibility, and responsive polish

- **Files:** affected achievement UI/state files and tests
- **Acceptance:** Achievement load/save failure never blocks book operations;
  retry works; keyboard navigation, focus visibility, screen-reader copy,
  mobile layout, and reduced-motion expectations are manually verified.
- **Notes:** Pending in-memory unlocks remain visible with calm retry feedback.

## [ ] T12. End-to-end verification and acceptance pass

- **Files:** `specs/024-reader-achievements/spec.md`,
  `specs/024-reader-achievements/plan.md`,
  `specs/024-reader-achievements/tasks.md`, affected implementation and tests
- **Acceptance:** Every spec criterion is reviewed; `npm run lint` and
  `npm run test` pass; backend tests pass; local and HTTP manual QA confirm
  silent migration, one-toast batches, persistence, retry, and user isolation.
- **Notes:** Mark task and spec checkboxes only after their acceptance lines are
  met. Do not commit until the user reviews the implementation and explicitly
  approves `commit?`.
