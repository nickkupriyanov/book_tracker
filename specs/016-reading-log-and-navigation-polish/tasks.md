# Tasks: Reading Log And Navigation Polish

> **Status:** Complete
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. [x] Add shared header and stats route tests

- **Files:** `tests/components/AppHeader.test.tsx`, `tests/app/StatsPage.test.tsx`
- **Acceptance:** Tests cover nav links, active route state, and `/stats` placeholder content.
- **Notes:** Mock pathname where needed; keep assertions user-visible.

## T2. [x] Implement shared header and stats placeholder

- **Files:** `src/components/AppHeader.tsx`, `src/app/layout.tsx`, `src/app/stats/page.tsx`, page clients as needed
- **Acceptance:** Shared header appears across app routes, active route is visible, and `/stats` renders a placeholder.
- **Notes:** Remove duplicated app-title navigation from page-local headers.

## T3. [x] Move calendar to home only

- **Files:** `src/app/ShelfClient.tsx`, `src/app/library/LibraryClient.tsx`, `tests/app/ShelfClient.test.tsx`, `tests/app/LibraryClient.test.tsx`
- **Acceptance:** Home renders Reading Calendar when ready/non-empty; library does not render Reading Calendar.
- **Notes:** Keep library full shelf controls intact.

## T4. [x] Add reading log domain and validation tests

- **Files:** `tests/lib/validation/book.test.ts`, `tests/validation/book.test.ts`
- **Acceptance:** Tests cover valid logs, invalid dates/pages, duplicate book/date normalization, and legacy books without logs.
- **Notes:** Use strict unknown-input validation patterns; no `any`.

## T5. [x] Implement reading log type and validation

- **Files:** `src/types/book.ts`, `src/lib/validation/book.ts`
- **Acceptance:** `Book.readingLogs` validates and normalizes correctly while preserving existing behavior.
- **Notes:** No storage adapter changes and no migration.

## T6. [x] Add progress-to-log behavior tests

- **Files:** `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Positive current-page delta creates/updates today's aggregate log; non-positive delta and clearing current page do not add log pages.
- **Notes:** Cover first save with no previous `currentPage` as `pagesRead = newCurrentPage`.

## T7. [x] Implement progress-to-log saving

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`
- **Acceptance:** Saving current page updates `currentPage` and aggregates positive deltas into today's reading log.
- **Notes:** Keep draft/error behavior from spec 015.

## T8. [x] Redesign home reading cards and focus panel

- **Files:** `src/features/page-progress/ReadingBookCard.tsx`, `src/features/page-progress/ReadingBooksList.tsx`, `src/features/page-progress/PageProgressQuickUpdate.tsx`, related tests
- **Acceptance:** Home cards are vertical cover-led cards around 160px, card selects active book, tag overflow is first two + `+N`, focus panel shows cover/placeholder without jumping, and focus panel links to detail.
- **Notes:** Use the approved visual direction A.

## T9. [x] Update calendar model for reading logs

- **Files:** `src/lib/reading-calendar.ts`, `src/features/reading-calendar/*`, `tests/lib/reading-calendar.test.ts`, `tests/features/reading-calendar/*`
- **Acceptance:** Calendar groups logs by date/book, sorts visible colors by pages read, caps at three, includes page counts in labels, and keeps legacy `readingDays` rendering.
- **Notes:** Tie handling should be deterministic.

## T10. [x] Polish and gates

- **Files:** affected docs, implementation, and test files
- **Acceptance:** Manual QA checklist in `plan.md` passes, `npm run lint` passes, and `npm run test` passes.
- **Notes:** Re-read `spec.md` acceptance criteria before marking done.
