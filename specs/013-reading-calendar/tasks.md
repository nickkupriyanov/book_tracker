# Tasks: Reading Calendar

> **Status:** Complete
> **Spec:** `./spec.md` (Complete)
> **Plan:** `./plan.md` (Complete)

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

Order: T1 adds the domain contract and validation. T2 builds pure calendar
and color helpers. T3 wires cover color into the book form. T4 adds the
book-detail reading-day editor. T5 adds the home Reading Calendar. T6 is
polish and full verification.

---

## T1. Domain fields + validator (TDD) — [x]

- **Files:**
  `src/types/book.ts`,
  `src/lib/validation/book.ts`,
  `tests/validation/book.test.ts`.
- **Acceptance:**
  - `Book` has optional `readingDays?: string[]` and
    `coverColor?: string` fields with spec-013 JSDoc.
  - `validateBookInput` accepts missing/empty `readingDays` and
    `coverColor`.
  - `validateBookInput` accepts valid `readingDays` values in
    `YYYY-MM-DD` form and valid `coverColor` values in `#RGB` or
    `#RRGGBB` form.
  - `validateBookInput` rejects malformed dates, calendar-invalid dates,
    non-array `readingDays`, non-string date entries, and invalid color
    strings.
  - Duplicate reading days normalize to one sorted unique date.
  - Empty `readingDays` normalizes to `undefined`; empty `coverColor`
    normalizes to `undefined`.
  - Existing validator tests still pass.
  - `npm run lint && npm run test` green.
- **Notes:**
  - Reuse the existing validator style: field helpers collect errors into
    the local `errors` map and `validateBookInput` spreads optional fields
    into the final value only when defined.
  - Date validity should round-trip the `YYYY-MM-DD` string, not rely on
    `Date` rollover behavior.

## T2. Calendar and color helpers (TDD) — [x]

- **Files:**
  `src/lib/reading-calendar.ts` (new),
  `src/lib/cover-color.ts` (new),
  `tests/lib/reading-calendar.test.ts` (new),
  `tests/lib/cover-color.test.ts` (new).
- **Acceptance:**
  - `cover-color.ts` exports
    `READING_CALENDAR_FALLBACK_COLOR`,
    `normalizeCoverColor`,
    `isCoverColor`,
    `colorForBook`,
    and `extractDominantCoverColor`.
  - `normalizeCoverColor` trims, accepts `#RGB` / `#RRGGBB`, lowercases
    valid values, and returns `undefined` for empty input.
  - `colorForBook` returns a normalized `book.coverColor` or the fallback
    color.
  - `extractDominantCoverColor` resolves `null` rather than throwing on
    load/canvas/CORS failure.
  - `reading-calendar.ts` exports the model types and functions named in
    `plan.md`: `currentCalendarMonth`, `shiftCalendarMonth`, and
    `buildReadingCalendarMonth`.
  - Month helpers use local calendar dates and output `YYYY-MM-DD`.
  - `buildReadingCalendarMonth` returns exactly the real days in the
    visible month, no leading/trailing placeholder models.
  - Day books sort by `title`, then `id`; visible colors include at most
    three colors.
  - Legend entries include only books with reading days in the visible
    month and sort by first visible date, then title, then id.
  - Day `ariaLabel` / `title` includes the full book title list, including
    books beyond the three visible colors.
  - Tests cover empty month, one-book day, two-book day, more-than-three
    book day, fallback color, legend filtering, month shifting across
    years, and leap-year February.
  - `npm run lint && npm run test` green.
- **Notes:**
  - Keep these helpers pure except `extractDominantCoverColor`.
  - Do not import React in either helper file.

## T3. Cover color in BookForm (TDD) — [x]

- **Files:**
  `src/components/BookForm.tsx`,
  `src/features/edit-book/EditBookDialog.tsx`,
  `tests/components/BookForm.test.tsx`,
  `tests/features/edit-book/EditBookDialog.test.tsx`.
- **Acceptance:**
  - `BookForm` has local `coverColor` state initialized from
    `initialValues.coverColor ?? ""`.
  - The form renders an optional cover color field near the cover URL
    field, with an inline swatch and validation error rendering for
    `errors.coverColor`.
  - The submitted `BookInput` includes `coverColor` only when non-empty.
  - `EditBookDialog` pre-fills `coverColor` when the book has one.
  - A "Use cover color" action attempts best-effort extraction from
    `coverUrl` only when clicked and never overwrites a non-empty
    manual color without that click.
  - Extraction failure leaves the form usable and does not show a blocking
    error.
  - Tests cover rendering the color field, submitting a valid color,
    rejecting an invalid color, edit prefill, and extraction failure.
  - `npm run lint && npm run test` green.
- **Notes:**
  - If the color UI makes `BookForm` hard to read, extract a small
    `CoverColorField` component under `src/components/` in this task and
    include it in the same commit.
  - Add no npm dependency.

## T4. ReadingDaysSection on detail page (TDD) — [x]

- **Files:**
  `src/features/detail-view/ReadingDaysSection.tsx` (new),
  `src/features/detail-view/BookDetail.tsx`,
  `src/features/detail-view/index.ts`,
  `tests/features/detail-view/ReadingDaysSection.test.tsx` (new),
  `tests/features/detail-view/BookDetail.test.tsx`.
- **Acceptance:**
  - `ReadingDaysSection` renders inside the detail page after the existing
    memory sections.
  - It shows an empty state when `book.readingDays` is missing or empty.
  - It renders **Mark today**, a native date input, an add button, and a
    newest-first list of logged dates.
  - Marking today persists one local `YYYY-MM-DD` date through
    `updateBook`.
  - Adding a selected date persists it through `updateBook`.
  - Adding an already logged date is disabled in the UI and guarded as a
    no-op in the handler.
  - Removing a date persists the remaining sorted unique dates; removing
    the last date persists `readingDays: undefined`.
  - Save failure shows an error/toast and leaves the section usable.
  - Tests cover empty state, mark today, selected-date add, duplicate
    prevention, removal, and `BookDetail` wiring.
  - `npm run lint && npm run test` green.
- **Notes:**
  - Use existing shadcn `Button`, `Input`, and `Label` components.
  - Use local-date formatting helpers; avoid UTC date drift.

## T5. Home ReadingCalendar UI (TDD) — [x]

- **Files:**
  `src/features/reading-calendar/ReadingCalendar.tsx` (new),
  `src/features/reading-calendar/ReadingCalendarDay.tsx` (new),
  `src/features/reading-calendar/ReadingCalendarLegend.tsx` (new),
  `src/features/reading-calendar/index.ts` (new),
  `src/app/ShelfClient.tsx`,
  `tests/features/reading-calendar/ReadingCalendar.test.tsx` (new),
  `tests/features/reading-calendar/ReadingCalendarDay.test.tsx` (new),
  `tests/features/reading-calendar/ReadingCalendarLegend.test.tsx` (new).
- **Acceptance:**
  - `ShelfClient` renders `<ReadingCalendar books={books} />` above
    `<ShelfList />` when `status === "ready"` and `books.length > 0`.
  - `ReadingCalendar` opens on the current local month.
  - Previous / next icon buttons shift the visible month without route,
    store, localStorage, or URL changes.
  - The Ink Shelf panel uses warm dark styling, compact square day cells,
    and no dashboard-like metrics.
  - A month with no logged days shows a cozy empty state and omits the
    legend.
  - A logged one-book day renders one color.
  - A logged multi-book day renders stripes with up to three visible
    colors.
  - Day cells expose accessible labels/titles with the full book list.
  - The legend lists only books visible in the current month.
  - Tests cover current month, navigation, empty state, one-color day,
    striped day, more-than-three accessible label, and legend filtering.
  - `npm run lint && npm run test` green.
- **Notes:**
  - Use lucide icons for previous/next buttons.
  - Keep the calendar display-only in this spec; do not add day-click
    editing.

## T6. Polish, QA, and SDD closeout — [x]

- **Files:**
  `specs/013-reading-calendar/spec.md`,
  `specs/013-reading-calendar/plan.md`,
  `specs/013-reading-calendar/tasks.md`,
  any implementation files touched by polish.
- **Acceptance:**
  - All acceptance criteria in `spec.md` are satisfied or explicitly
    corrected in the spec before approval.
  - Empty, error, duplicate, and no-color states are present.
  - Keyboard/focus behavior is usable for Mark today, date add, remove
    date, month navigation, and cover color controls.
  - Visual QA confirms the calendar reads as Ink Shelf in dark theme and
    does not become a dashboard.
  - `npm run lint` passes.
  - `npm run test` passes.
  - Task statuses are updated only after the corresponding acceptance
    line is met.
- **Notes:**
  - Manual QA checklist from `plan.md` should be run before marking this
    task complete.
  - Do not mark the overall feature done until both lint and tests pass.
