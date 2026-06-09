# Plan: Page-Based Reading Tracking

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-09

---

## 1. Architecture summary

The feature keeps the existing local-first architecture: React components read
and update books through `useBookLibrary`, which persists whole-book changes
through the current `StorageAdapter`. The main architectural shift is that page
logs become the only source of reading activity and progress. Shared pure helper
logic should calculate derived current page, pages left, daily log updates, and
completion state so Home, detail history, calendar, statistics, and tests all
use the same rules.

## 2. Module / file layout

- `src/types/book.ts` - remove Reading days from the domain contract and make
  page logs the reading activity model.
- `src/lib/validation/book.ts` - validate page logs, remove Reading days
  validation, and enforce one aggregate entry per date.
- `src/lib/page-progress.ts` - new pure helper module for deriving progress and
  applying target-current-page saves.
- `src/features/page-progress/PageProgressQuickUpdate.tsx` - update Home flow
  to save target current page through the shared helper and show completion
  next steps.
- `src/features/detail-view/PageHistorySection.tsx` - new compact history UI for
  adding, editing, and deleting dated page logs.
- `src/features/detail-view/BookDetail.tsx` - render Page history instead of
  Reading days.
- `src/lib/reading-calendar.ts` and `src/lib/reader-stats.ts` - use only page
  logs for reading activity.
- Relevant tests under `tests/lib`, `tests/features/page-progress`,
  `tests/features/detail-view`, and existing calendar/statistics tests.

## 3. Data flow

Home happy path:

1. User enters target current page `N` for the active reading book.
2. `PageProgressQuickUpdate` calls the shared helper with book, today's local
   date, and `N`.
3. Helper computes pages already logged before today.
4. Helper sets today's aggregate `pagesRead` so total logged pages becomes `N`.
5. If the new daily count is `0`, today's log is removed.
6. If the new daily count is negative or exceeds `totalPages`, helper returns a
   validation result for the UI to display.
7. Component validates the resulting `BookInput` and calls `updateBook`.
8. Store re-renders Home, calendar, and statistics from the updated logs.

Detail history flow:

1. User adds, edits, or deletes a dated page log.
2. `PageHistorySection` applies the change through the same helper rules.
3. Derived progress is recalculated from the full ordered log list.
4. The updated book is persisted through `updateBook`.

## 4. Component breakdown

### `PageProgressQuickUpdate`

- **Props:** `{ book: Book }`
- **State:** local draft current-page input, saving state, inline error/info.
- **Behavior:** saves target current page for today, renders derived progress,
  quick-add actions, and completion next steps when total pages are reached.
- **Tests:** correction sequence, quick-add behavior, total-pages validation,
  completion prompt, storage failure.

### `PageHistorySection`

- **Props:** `{ book: Book }`
- **State:** local add/edit drafts, currently editing log id, saving state,
  inline error.
- **Behavior:** lists dated aggregate page logs and allows add/edit/delete
  corrections.
- **Tests:** renders empty/history states, add entry, edit entry, delete entry,
  recalculates derived progress, blocks invalid negative corrections.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

All persistence continues through existing whole-book `addBook` and `updateBook`
methods. localStorage remains the MVP implementation.

## 6. Decisions & trade-offs

- Chose page logs over Reading days because the product now tracks reading by
  pages and should not maintain two activity models.
- Chose current-page input on Home because readers naturally know "where I am"
  more often than "how many pages this session added."
- Chose one aggregate log per book/day because it keeps the calendar and history
  calm and avoids session-accounting complexity.
- Chose Page history on detail page because corrections need to be possible, but
  they should not slow down the daily Home flow.
- Chose no legacy Reading days compatibility because the project is still MVP
  and the user explicitly prefers removing obsolete behavior over preserving it.

## 7. Risks

- Removing legacy `readingDays` may make old localStorage data appear to lose
  activity history. This is accepted for MVP.
- If `Book.currentPage` remains in the type temporarily, it can drift unless all
  writes synchronize it from logs. Tests should cover this until the field is
  removed or fully derived.
- Editing old logs can make later `currentPageAfter` snapshots stale. Prefer
  deriving progress from ordered `pagesRead` sums rather than trusting snapshots.
- The completion prompt must stay lightweight and avoid turning Home into a
  dashboard-like checklist.

## 8. Rollout

- Feature flag: no.
- Migration: no required user-facing migration.
- Manual QA:
  - Start with an empty library and verify empty states still render.
  - Add a reading book with total pages and update current page from Home.
  - Verify `30 -> 10 -> 30` totals 30 pages.
  - Reach total pages and verify rating/review/read next steps.
  - Add, edit, and delete Page history entries on detail.
  - Verify calendar and statistics reflect only page logs.
  - Run `npm run lint` and `npm run test`.
