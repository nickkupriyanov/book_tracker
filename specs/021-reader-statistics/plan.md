# Plan: Reader Statistics Page

> **Status:** Approved
> **Spec:** `../spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-08

---

## 1. Architecture summary

The Statistics page remains a frontend-only feature. `src/app/stats/page.tsx`
should delegate to a client component that reads the existing `useBookLibrary`
store. A new pure helper builds a display model from `Book[]` so calculations
stay testable and independent from React, storage, and DOM concerns.

## 2. Module / file layout

- `src/lib/reader-stats.ts` — pure whole-library stats model and calculation
  rules.
- `src/app/stats/page.tsx` — server page wrapper that renders the client
  stats experience.
- `src/app/stats/StatsClient.tsx` — client UI for loading/error/empty/ready
  states and the Reader Portrait sections.
- `tests/lib/reader-stats.test.ts` — unit coverage for calculations and
  tie-breakers.
- `tests/app/StatsPage.test.tsx` — component coverage for page states and
  rendered sections.

## 3. Data flow

`RootClient` initializes the storage adapter and hydrates `useBookLibrary`.
The `/stats` client component selects `status` and `books` from the store. When
ready, it passes `books` to `buildReaderStats`, then renders the display model.
No persistence calls occur on the stats page.

## 4. Component breakdown

- **StatsClient**
  - Props: none.
  - State: none beyond store-derived values.
  - Behavior: renders loading, error, empty, or ready portrait sections.
  - Tests: loading/error/empty/populated/sparse states.

- **Stats section components**
  - Props: slices of the stats display model.
  - State: none.
  - Behavior: render hero metrics, favorite tags, highest-rated books, reading
    rhythm, and shelf balance in compact warm cards.
  - Tests: covered through `StatsClient` render assertions unless behavior
    becomes non-obvious.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

## 6. Decisions & trade-offs

- Chose whole-library scope over current-year scope because it produces a more
  useful MVP portrait with sparse local data.
- Chose visible empty prompts over hiding sections because the page should stay
  stable and teach the reader what data enriches the portrait.
- Chose a pure helper over component-local calculations because the tie-breakers
  and sparse-data states need clear unit tests.
- Chose compact counters and shelf strips over charts to respect the
  constitution's "cozy over clever" and "avoid dashboard-like layouts"
  principles.

## 7. Risks

- Sparse libraries may still feel light; visible prompts mitigate this.
- Tag quality depends on user-entered tags; no tag normalization changes are in
  scope.
- Reading rhythm can be incomplete when users do not log pages; the page must
  avoid implying missing logs mean no reading.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA: load an empty library, a sparse library with tags but no ratings,
  and a populated library with ratings and logs; verify the page remains warm,
  readable, and non-dashboard-like on mobile and desktop.
