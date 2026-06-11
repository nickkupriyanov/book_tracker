# Spec: Reader Achievements

> **Status:** Approved
> **Author:** Codex
> **Created:** 2026-06-10
> **Spec ID:** 024-reader-achievements
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

Book Tracker records reading progress, reviews, quotes, ratings, and reading
rhythm, but it does not yet turn those moments into a lasting sense of personal
history. Readers need a small, warm form of recognition that celebrates varied
reading behavior without introducing competitive scores, pressure, or a cold
dashboard experience.

## 2. Goal

Add a quiet collection of reader achievements that permanently records
meaningful milestones and makes the app feel more personal and rewarding.

## 3. Non-goals

- No levels, points, leaderboards, rankings, streak pressure, or social sharing.
- No user-created achievements or editable achievement rules.
- No push notifications, email reminders, sounds, confetti, or animated reward
  sequences.
- No repeatable, seasonal, or time-limited achievements in v1.
- No achievement progress bars or exact progress toward locked achievements.
- No attempt to reconstruct historical unlock dates from incomplete book data.

## 4. Users & scenarios

This feature serves both the local demo reader and an authenticated HTTP-mode
reader.

- A reader with an existing library opens the upgraded app. Matching
  achievements appear in the collection without a burst of notifications.
- A reader completes an action that crosses one or more achievement thresholds.
  The app shows one calm notification and preserves every new unlock.
- A reader sees recent achievements below the home profile card, then opens the
  full collection to revisit earned milestones and discover visible goals.
- A reader changes or deletes a book after earning an achievement. The earned
  milestone remains part of their reading history.

## 5. UX

Achievements use the existing warm, book-inspired visual language: paper-like
cards, serif headings, soft borders, restrained icons, generous spacing, and
no dashboard grid density.

### Home preview

In the ready, non-empty home state, a compact block appears below the reader
profile card. It shows up to three most recently unlocked achievements and a
`View all` link to `/achievements`. If none are unlocked, it shows gentle copy
inviting the reader to keep reading rather than an empty metric.

### Full collection

The `/achievements` page handles loading, error, and ready states. In the ready
state it displays the complete eight-item catalog in this order:

1. unlocked achievements, newest unlock first;
2. visible locked achievements, in catalog order;
3. secret locked achievements, in catalog order.

Unlocked cards show their title, description, icon, and unlock date. Visible
locked cards show their title and condition. Secret locked cards show a muted
silhouette and neutral hidden copy; their title and condition appear only after
unlocking.

### Notifications

The first evaluation after achievement state loads is always silent, including
when it discovers achievements from an existing library. A later action that
unlocks one achievement shows one calm toast naming it. If one action unlocks
multiple achievements, the app shows one aggregate toast such as
`2 achievements unlocked`, with a link to `/achievements`.

All visible copy is in English to match the current application.

## 6. Functional requirements

- FR-1. The system defines exactly eight v1 achievements:
  - first book with `status === "read"`;
  - five books with `status === "read"`;
  - a read book with `totalPages >= 500`;
  - first saved quote;
  - first non-empty review;
  - five books with a rating;
  - a reading streak of at least seven consecutive local calendar days;
  - at least 1,000 total pages from `readingLogs[].pagesRead`.
- FR-2. The 500-page-book and seven-day-streak achievements are secret until
  unlocked. The other six locked achievements expose their title and condition.
- FR-3. Achievement rules are evaluated by a pure, typed engine using the
  current `Book[]` and the static catalog.
- FR-4. An unlock stores `achievementId` and the ISO 8601 `unlockedAt` timestamp
  assigned when the application first discovers and successfully records it.
- FR-5. Unlock persistence is idempotent: saving an already unlocked
  achievement does not create a duplicate or replace its original timestamp.
- FR-6. Unlocks are permanent. Later edits or deletions never revoke them.
- FR-7. The initial evaluation after loading books and saved unlocks is silent.
- FR-8. Retrospective unlocks use the discovery time; the app does not infer a
  historical timestamp from book fields.
- FR-9. After the initial evaluation, a book-state change triggers another
  evaluation and persists newly eligible achievements as one batch.
- FR-10. One book-state change produces at most one achievement toast, whether
  it unlocks one or several achievements.
- FR-11. The home preview shows up to three most recently unlocked achievements
  and links to the full collection.
- FR-12. `/achievements` renders the complete catalog with the approved sorting
  and secret-achievement behavior.
- FR-13. The global navigation includes an `Achievements` link.
- FR-14. Local mode and HTTP mode expose the same achievement behavior through
  `StorageAdapter`.
- FR-15. In HTTP mode, unlocks are authenticated and scoped to the current user.
- FR-16. Achievement load or save failures do not cancel or roll back book
  operations.
- FR-17. Failed new unlocks remain available in achievement state for the
  current session and are retried on the next evaluation or explicit retry.
- FR-18. The achievements page and home preview provide accessible loading,
  error, empty-unlocked, and populated states where relevant.

## 7. Data

Add achievement domain types under `src/types/achievement.ts`:

```ts
export type AchievementId =
  | "first-finished-book"
  | "five-finished-books"
  | "long-read"
  | "first-quote"
  | "first-review"
  | "five-rated-books"
  | "seven-day-streak"
  | "thousand-pages";

export interface AchievementUnlock {
  achievementId: AchievementId;
  unlockedAt: string;
}
```

The static catalog also defines each achievement's title, description,
condition copy, icon key, catalog order, and `secret` flag. Catalog definitions
are application code, not persisted user data.

The engine reads existing `Book` fields only: `status`, `totalPages`, `quotes`,
`review`, `rating`, and `readingLogs`. The streak rule uses unique valid local
dates from `readingLogs[].date`; the pages rule sums positive
`readingLogs[].pagesRead` values. Review eligibility accepts a non-empty plain
review or rich review with non-empty textual content, using the existing rich
text helpers rather than raw JSON string matching.

Local mode stores unlocks under a separate versioned localStorage key. HTTP mode
adds a PostgreSQL `achievement_unlocks` table with `user_id`, `achievement_id`,
and `unlocked_at`, plus a unique constraint on `(user_id, achievement_id)` and
user cascade deletion.

## 8. Storage interface

Extend `StorageAdapter` with batch-oriented achievement methods:

```ts
listAchievementUnlocks(): Promise<AchievementUnlock[]>;

saveAchievementUnlocks(
  unlocks: AchievementUnlock[]
): Promise<AchievementUnlock[]>;
```

`listAchievementUnlocks` returns all saved unlocks for the active storage
scope. `saveAchievementUnlocks` is idempotent by `achievementId`, preserves the
first stored timestamp, and returns the canonical persisted records for every
requested ID.

`LocalStorageAdapter` validates unknown persisted input and treats malformed
entries as absent while preserving valid entries. `HttpStorageAdapter` maps the
methods to authenticated achievement endpoints. Store and feature components
depend only on `StorageAdapter`; they do not import localStorage, backend URLs,
FastAPI, PostgreSQL, or auth internals.

## 9. Edge cases & errors

- Empty library: no rules match; `/achievements` still shows the locked catalog.
- Existing library on first load: matching unlocks are persisted silently with
  the current discovery timestamp.
- Several thresholds crossed by one update: all are persisted in one batch and
  represented by one toast.
- Duplicate reading-log dates across books: each local date counts once toward
  the streak.
- Invalid dates, malformed optional values, and non-positive page counts are
  ignored by the pure engine.
- A 500-page book counts only when its status is `read`.
- A rating counts once per rated book, regardless of rating value.
- Deleting or editing qualifying data does not remove saved unlocks.
- Achievement load failure: the library remains usable; achievement surfaces
  show a friendly retry state.
- Achievement save failure: book mutation remains successful; pending unlocks
  remain in memory and retry without duplicate records.
- HTTP 401 follows the existing HTTP-mode unauthenticated handling.
- Concurrent or repeated saves are protected by local deduplication and the
  backend unique constraint.

## 10. Acceptance criteria

- [x] A typed catalog contains exactly the eight approved achievements and
  marks exactly two as secret.
- [x] A pure, unit-tested engine evaluates every rule deterministically.
- [x] Initial retrospective evaluation persists matching unlocks without a
  toast and uses discovery time.
- [x] Later evaluations show at most one toast and persist all newly matched
  achievements in one batch.
- [x] Saved unlocks remain after qualifying book data is changed or deleted.
- [x] `StorageAdapter`, localStorage, HTTP adapter, FastAPI, and PostgreSQL all
  support idempotent achievement unlock persistence.
- [x] HTTP unlock data is isolated by authenticated user.
- [x] The home preview shows the three latest unlocks or gentle empty copy.
- [x] `/achievements` handles loading, error, locked-only, and unlocked states.
- [x] Locked secret achievements do not reveal their title or condition.
- [x] Navigation includes `Achievements` and active-link behavior remains
  correct.
- [x] Achievement failures never roll back successful book operations.
- [x] Frontend lint and tests pass.
- [x] Backend tests pass.

## 11. Out of scope (for this spec)

- More than eight achievements or remote catalog management.
- Achievement progress percentages, counters, filters, or categories in the UI.
- Sharing, public profiles, friends, comparisons, or leaderboards.
- Manually granting, revoking, hiding, or resetting achievements.
- Importing achievements between local and HTTP storage modes.
- Reconstructing historical unlock dates.

## 12. Open questions

None. The catalog, secret items, persistence behavior, notification policy,
routes, and UI placement are approved for v1.
