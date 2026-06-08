# Tasks: Reader Statistics Page

> **Status:** Completed
> **Spec:** `../spec.md`
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Stats model

- **Files:** `src/lib/reader-stats.ts`, `tests/lib/reader-stats.test.ts`
- **Acceptance:** The pure helper covers hero metrics, favorite tags,
  highest-rated books, reading rhythm, shelf balance, sparse data, and
  deterministic tie-breakers.
- [x] Pure `buildReaderStats` covers hero, favorite tags, top-rated, rhythm,
      shelf, sparse/empty states, and deterministic tie-breakers.
      25 unit tests in `tests/lib/reader-stats.test.ts`.

## T2. Stats page states

- **Files:** `src/app/stats/page.tsx`, `src/app/stats/StatsClient.tsx`,
  `tests/app/StatsPage.test.tsx`
- **Acceptance:** `/stats` renders loading, error, empty, sparse ready, and
  populated ready states from `useBookLibrary`.
- [x] `StatsClient` reads `useBookLibrary.status` + `books` and renders
      loading / error / empty (via `EmptyShelf`) / ready portraits.
      Page-level tests in `tests/app/StatsPage.test.tsx` (13 tests total;
      7 cover T2 state branches, the rest cover T3 zones and sparse data).

## T3. Reader Portrait UI

- **Files:** `src/app/stats/StatsClient.tsx`
- **Acceptance:** The ready state renders hero portrait, favorite tags,
  highest-rated books, reading rhythm, and shelf balance with warm styling and
  English copy.
- [x] Five approved sections: `HeroPortrait`, `FavoriteTagsSection`,
      `TopRatedSection`, `ReadingRhythmSection`, `ShelfBalanceSection` —
      all in `src/features/stats/`. English copy, paper-card styling,
      no charts/dashboards. Assembled in `StatsClient`.

## T4. Verification and task closeout

- **Files:** `specs/021-reader-statistics/tasks.md`
- **Acceptance:** `npm run lint` and `npm run test` pass, acceptance criteria in
  `spec.md` are checked, and completed tasks are marked `[x]`.
- [x] `npm run lint` ✔ clean. `npm run test` ✔ 850 passed (54 files).
      Spec §10 acceptance criteria checked below.

### Spec §10 acceptance criteria

- [x] `/stats` no longer renders placeholder copy.
- [x] `/stats` handles loading, error, empty, sparse, and populated ready states.
- [x] A pure stats helper returns the complete display model and is unit-tested.
- [x] The UI renders the five approved zones: hero portrait, favorite tags,
      highest-rated books, reading rhythm, and shelf balance.
- [x] `npm run lint` and `npm run test` pass.
