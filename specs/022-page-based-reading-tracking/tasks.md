# Tasks: Page-Based Reading Tracking

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Add pure page-progress helpers

- **Files:** `src/lib/page-progress.ts`, `tests/lib/page-progress.test.ts`
- **Acceptance:** Helpers derive current page from logs and apply target
  current-page saves, including `30 -> 10 -> 30` totaling 30 pages.
- **Notes:** Cover same-day correction, zero-day removal, negative correction
  error, missing total pages, and target beyond total pages.

## T2. Update domain types and validation

- **Files:** `src/types/book.ts`, `src/lib/validation/book.ts`,
  `tests/lib/validation/book.test.ts`, `tests/validation/book.test.ts`
- **Acceptance:** `readingDays` is no longer accepted as product data, page logs
  validate and normalize to one aggregate entry per date, and invalid logs
  return field-specific errors.
- **Notes:** Avoid `any`; narrow unknown input through existing validation
  patterns.

## T3. Refactor Home page progress

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Home saves target current page through the shared helper,
  renders derived progress, preserves quick actions, handles storage errors, and
  shows completion next steps at total pages.
- **Notes:** Keep the UI warm and compact; no modal interruption is required.

## T4. Replace Reading days with Page history

- **Files:** `src/features/detail-view/PageHistorySection.tsx`,
  `src/features/detail-view/BookDetail.tsx`,
  `tests/features/detail-view/PageHistorySection.test.tsx`,
  `tests/features/detail-view/BookDetail.test.tsx`
- **Acceptance:** Detail page no longer renders Reading days and instead lets
  the user add, edit, and delete dated page-log entries.
- **Notes:** Corrections must persist through `updateBook` and recalculate
  progress from logs.

## T5. Remove Reading days from calendar and statistics

- **Files:** `src/lib/reading-calendar.ts`, `src/lib/reader-stats.ts`,
  `tests/lib/reading-calendar.test.ts`, `tests/lib/reader-stats.test.ts`
- **Acceptance:** Calendar and statistics ignore `readingDays` and derive
  activity, logged pages, best day, and rhythm only from page logs.
- **Notes:** Keep sparse-data copy gentle when no page logs exist.

## T6. Clean up obsolete Reading days code

- **Files:** `src/features/detail-view/ReadingDaysSection.tsx`,
  `tests/features/detail-view/ReadingDaysSection.test.tsx`, exports and imports
  that reference Reading days
- **Acceptance:** Obsolete Reading days component/tests/exports are removed and
  no app code imports them.
- **Notes:** Use `rg "ReadingDays|readingDays|Reading days"` to verify cleanup.

## T7. Final regression and spec closeout

- **Files:** `specs/022-page-based-reading-tracking/spec.md`,
  `specs/022-page-based-reading-tracking/plan.md`,
  `specs/022-page-based-reading-tracking/tasks.md`
- **Acceptance:** Acceptance criteria are still accurate, task checkboxes remain
  unchecked until implementation work is done, and `npm run lint && npm run test`
  pass.
- **Notes:** Do not commit until the user reviews and explicitly approves.
