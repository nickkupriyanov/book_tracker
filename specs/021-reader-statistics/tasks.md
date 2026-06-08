# Tasks: Reader Statistics Page

> **Status:** Approved
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

## T2. Stats page states

- **Files:** `src/app/stats/page.tsx`, `src/app/stats/StatsClient.tsx`,
  `tests/app/StatsPage.test.tsx`
- **Acceptance:** `/stats` renders loading, error, empty, sparse ready, and
  populated ready states from `useBookLibrary`.

## T3. Reader Portrait UI

- **Files:** `src/app/stats/StatsClient.tsx`
- **Acceptance:** The ready state renders hero portrait, favorite tags,
  highest-rated books, reading rhythm, and shelf balance with warm styling and
  English copy.

## T4. Verification and task closeout

- **Files:** `specs/021-reader-statistics/tasks.md`
- **Acceptance:** `npm run lint` and `npm run test` pass, acceptance criteria in
  `spec.md` are checked, and completed tasks are marked `[x]`.
