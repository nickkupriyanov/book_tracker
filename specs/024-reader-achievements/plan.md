# Plan: Reader Achievements

> **Status:** Approved
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-10

---

## 1. Architecture summary

Reader achievements are a derived-and-persisted feature. A static typed catalog
describes the eight definitions, while a pure engine derives eligible IDs from
the current `Book[]`. A dedicated Zustand achievement store loads canonical
unlocks through the same `StorageAdapter` instance used by the library, performs
one silent reconciliation after initialization, and evaluates again after later
book changes. Persistence records only permanent unlock IDs and first-discovery
timestamps. Local mode uses a separate localStorage key; HTTP mode uses a
user-scoped FastAPI resource and PostgreSQL table. UI components consume the
achievement store and catalog without knowing which persistence mode is active.

## 2. Module / file layout

- `src/types/achievement.ts` - achievement IDs, catalog definition shape, and
  persisted unlock type.
- `src/lib/achievements.ts` - static catalog, rule evaluators, rich-review
  detection, streak calculation, and collection sorting helpers.
- `src/state/achievements.ts` - loading, reconciliation, pending-save retry,
  and new-unlock notification state.
- `src/storage/storage-adapter.ts` - batch list/save contract additions.
- `src/storage/local-storage-adapter.ts` - validated local unlock persistence.
- `src/storage/http-storage-adapter.ts` - authenticated achievement requests.
- `src/features/achievements/` - badge card, home preview, collection, and
  orchestration components.
- `src/app/achievements/` - route and client state surface.
- `src/app/ShelfClient.tsx` and `src/components/AppHeader.tsx` - home placement
  and navigation link.
- `backend/app/models/achievement.py` - user-owned unlock row and uniqueness.
- `backend/app/schemas/achievement.py` - strict achievement ID request/response
  models.
- `backend/app/services/achievements.py` - list and idempotent batch insert.
- `backend/app/api/routes/achievements.py` - authenticated HTTP endpoints.
- `backend/migrations/versions/0002_achievement_unlocks.py` - additive schema
  migration.
- Frontend and backend test files mirror the existing `tests/` and
  `backend/tests/` organization.

## 3. Data flow

### 3.1 Initialization and retrospective reconciliation

1. `RootClient` or `HttpLibrary` initializes the book library with the selected
   adapter as today.
2. Achievement orchestration receives that same adapter through a narrow store
   initializer; the adapter is not exposed as reactive Zustand state.
3. The achievement store loads saved unlocks and enters a reconciling state.
4. Once both books and unlocks are available, the pure engine returns all
   currently eligible achievement IDs.
5. Missing IDs receive one shared discovery timestamp and are passed to
   `saveAchievementUnlocks` as a single batch.
6. Canonical returned records replace matching optimistic records. This entire
   first reconciliation is marked silent and cannot enqueue a toast.
7. The store records the reconciled library revision so the same initial books
   do not immediately trigger a second evaluation.

### 3.2 New unlocks after user actions

1. An existing add/edit/progress/rating/review/quote flow updates `Book[]` only
   after its storage operation succeeds.
2. Achievement orchestration observes the changed books reference after initial
   reconciliation and calls the pure engine.
3. Eligible IDs absent from saved and pending unlocks are timestamped together,
   inserted into in-memory state, and saved as one batch.
4. The store exposes one notification payload for the entire batch. A bridge
   component renders one Sonner toast and acknowledges that payload.
5. A single unlock toast names the achievement; a multi-unlock toast shows the
   count. Both link to `/achievements`.

### 3.3 Failure and retry

Load failure sets achievement status to `error` without changing library state.
An explicit retry reuses the current adapter. Save failure keeps new unlocks in
the visible in-memory collection and in a deduplicated pending map. The next
book evaluation or explicit retry sends all pending records again. Canonical
storage responses preserve the earliest persisted timestamp. A 401 remains
available through the existing `lastError`/HTTP unauthenticated path rather
than introducing separate auth behavior.

```text
Book UI -> useBookLibrary -> StorageAdapter -> book persistence
              |
              v
      achievement orchestrator -> pure engine
              |                       |
              v                       v
      achievement store ------> new eligible IDs
              |
              v
        StorageAdapter -> localStorage OR FastAPI -> PostgreSQL
```

## 4. Component breakdown

- **AchievementProvider**
  - **Props:** `{ adapter: StorageAdapter; children: ReactNode }` or an
    equivalent root orchestrator colocated with existing adapter wiring.
  - **State:** no display state; initializes and retries the achievement store,
    observes book changes after reconciliation, and renders toast notifications.
  - **Behavior:** uses the exact adapter selected for the current storage mode;
    never creates a second independent adapter.
  - **Tests:** silent initial reconciliation, later evaluation, one-toast batch,
    save retry, and no interference with library errors.

- **AchievementsPreview**
  - **Props:** none; selects status and sorted unlocks from the achievement
    store, or receives a narrow display model from its home parent.
  - **State:** derived only.
  - **Behavior:** renders up to three newest unlocked cards below
    `ReaderProfileCard`, gentle no-unlocks copy, retry copy on error, and
    `View all`.
  - **Tests:** placement contract, three-item limit, newest-first order, empty
    copy, and error retry.

- **AchievementsClient**
  - **Props:** optional injected `now` only if needed for deterministic date
    formatting tests.
  - **State:** derived from achievement status, catalog, and unlocks.
  - **Behavior:** renders loading, error, locked-only, and populated collection
    states with approved sorting.
  - **Tests:** every state, secret masking, visible conditions, unlocked dates,
    and sorting groups.

- **AchievementCard**
  - **Props:** catalog definition plus optional `AchievementUnlock`.
  - **State:** none.
  - **Behavior:** renders unlocked, visible-locked, or secret-locked appearance
    with accessible text and decorative icon handling.
  - **Tests:** copy exposure and accessible output for all three variants.

## 5. Storage adapter and backend changes

Add exact frontend signatures:

```ts
listAchievementUnlocks(): Promise<AchievementUnlock[]>;
saveAchievementUnlocks(
  unlocks: AchievementUnlock[]
): Promise<AchievementUnlock[]>;
```

Local mode uses `book-tracker:achievement-unlocks` and validates the stored
array entry by entry. Duplicate IDs collapse to the entry with the earliest
valid timestamp. Batch save merges by ID, preserves existing timestamps, writes
once, and returns records in request order.

HTTP mode uses:

- `GET /achievements` -> all current-user unlocks;
- `POST /achievements/unlocks` with `{ unlocks: AchievementUnlock[] }` ->
  canonical records for the requested IDs.

The backend validates IDs against the fixed v1 ID set, rejects malformed
timestamps, scopes every query by `current_user.id`, and inserts conflicts
idempotently. PostgreSQL owns the uniqueness guarantee on
`(user_id, achievement_id)`. Existing rows keep their first `unlocked_at` even
when later requests contain a different timestamp.

The migration is additive and requires no book-data migration. The `User` model
gains an `achievement_unlocks` relationship with cascade delete. The API router
is registered in the existing FastAPI app factory.

## 6. Decisions & trade-offs

- Chose a catalog plus pure rule engine over event sourcing because all v1
  rules can be derived from the current library and retrospective discovery is
  required.
- Chose permanent stored unlocks over recomputing display state because earned
  milestones must survive edits and deletes.
- Chose a dedicated achievement store over expanding `useBookLibrary` because
  achievement load/save failures must not change the library's operational
  status.
- Chose batch persistence over one request per unlock to keep multi-unlock
  actions atomic from the UI's perspective and to support one notification.
- Chose discovery time for retrospective unlocks because historical timestamps
  cannot be reconstructed consistently from existing records.
- Chose two secret definitions only, preserving surprise without making the
  collection opaque.
- Chose a full navigation destination plus a small home preview so achievements
  are discoverable without turning the home page into a dashboard.

## 7. Risks

- Store orchestration can accidentally classify the initial reconciliation as
  a later update. Guard it with an explicit lifecycle state and test the exact
  initialization sequence in local and HTTP modes.
- Optimistic unlocks may briefly exist without persistence during an outage.
  Keep them in a deduplicated pending set and clearly expose retry state.
- Rich review emptiness can drift from editor semantics. Reuse the existing
  rich-text walker/helper boundary and add focused fixtures.
- Streak calculations may diverge from profile/statistics calculations. Reuse
  or extract the existing date normalization logic instead of creating a third
  independent interpretation.
- Adding methods to `StorageAdapter` breaks all test doubles at compile time.
  Update shared fakes in the same early task so later work remains type-safe.
- HTTP clients can submit known IDs with fabricated timestamps. This is
  acceptable for v1 because the backend is persistence behind the frontend
  contract, not an authoritative event-verification service.

## 8. Rollout

- Behind a flag? No separate feature flag. The feature follows the existing
  `NEXT_PUBLIC_STORAGE_MODE` selection.
- Migration needed? Yes, one additive PostgreSQL migration and one new isolated
  localStorage key. Existing books and challenges are untouched.
- Compatibility: missing achievement storage means an empty saved collection
  followed by silent retrospective reconciliation.
- Manual QA:
  - Open an existing local library and confirm unlocks appear without toasts.
  - Trigger one and several unlocks through normal book actions; confirm one
    toast per action and permanent cards.
  - Reload and confirm timestamps and ordering remain stable.
  - Remove qualifying data and confirm earned cards remain.
  - Corrupt the achievement localStorage key and confirm books still load.
  - Verify loading, retry, locked-only, secret, and mobile layouts.
  - Repeat in HTTP mode with two users and confirm isolation.
  - Run frontend lint/tests and backend tests before acceptance.
