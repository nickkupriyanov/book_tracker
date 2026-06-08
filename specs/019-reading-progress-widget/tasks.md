# Tasks: Reading Progress Widget

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Create and verify rendering model helpers

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`
- **Acceptance:** The component derives percent, pages-left, progress text,
  today-pages text, and quick-action target pages without changing persisted
  behavior.
- **Notes:** Keep helpers local unless extraction clearly improves readability.

## T2. Redesign visual layout

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`
- **Acceptance:** `Where are you?` presents cover/title/author, secondary
  right-side `Open book`, progress-first summary, and bookmark-like progress
  line on desktop and mobile without overlap.
- **Notes:** Keep the existing warm palette and avoid dashboard-like stat cards.

## T3. Rename typed-save CTA and preserve behavior

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** The submit button reads `Update progress`, and existing typed
  save validation, storage failure, draft retention, and reading-log delta tests
  still pass.
- **Notes:** Reuse the current typed save path.

## T4. Implement instant `+10 pages` and `+25 pages`

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Clicking each quick action immediately saves the next page,
  creates/aggregates positive reading-log deltas, treats missing `currentPage`
  as `0`, and caps at `totalPages` when present.
- **Notes:** Disable quick actions while a save is in flight.

## T5. Implement `Finished`

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Clicking `Finished` marks the book read, sets
  `currentPage = totalPages` when total pages are known, and preserves page
  fields when total pages are unknown.
- **Notes:** Replace or adapt the existing reached-end-only mark-as-read action.

## T6. Add pages-left and today motivation line

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Known total-page books show pages left, books with today's
  reading log show `You read N pages today`, and no time estimate appears.
- **Notes:** Use the same local date basis as existing reading-log creation.

## T7. Update progress-widget tests

- **Files:** `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Tests cover progress fraction/percentage, accessible
  progressbar attributes, `Open book` link, missing-total behavior, quick
  actions, `Finished`, today motivation, and existing error paths.
- **Notes:** Prefer user-visible assertions plus existing `data-testid`s where
  stable selectors already exist.

## T8. Run verification gates

- **Files:** affected implementation and tests
- **Acceptance:** `npm run lint` and `npm run test` pass.
- **Notes:** Re-read `spec.md` acceptance criteria before marking this task
  done.
