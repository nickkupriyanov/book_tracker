# Tasks: UI Polish

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Add global header add-book action

- **Files:** `src/components/AppHeader.tsx`,
  `tests/components/AppHeader.test.tsx`
- **Acceptance:** Header renders a right-aligned `Добавить книгу` button that
  opens `AddBookDialog` when the store is ready and is disabled before ready.
- **Notes:** Reuse `AddBookDialog`; do not create a second add-book flow.

## T2. Remove duplicate home and library CTAs

- **Files:** `src/app/ShelfClient.tsx`, `src/app/library/LibraryClient.tsx`,
  `tests/app/ShelfClient.test.tsx`, `tests/app/LibraryClient.test.tsx`
- **Acceptance:** Home renders no `Open library` CTA in reading or no-reading
  states, and `/library` renders no page-local non-empty `Add book` button.
- **Notes:** Preserve `EmptyShelf` add-first-book behavior.

## T3. Polish home rail and reading-lane sizing

- **Files:** `src/features/reader-profile/ReaderProfileCard.tsx`,
  `src/features/yearly-challenge/YearlyChallengeCard.tsx`,
  `src/features/page-progress/ReadingBookCard.tsx`, relevant component tests
- **Acceptance:** Bookmark contour sits slightly further left, challenge goal
  input flexes in its row, and reading-lane cards no longer set fixed
  `w-[160px]`.
- **Notes:** Keep existing component props unchanged.

## T4. Retheme and stabilize the reading calendar

- **Files:** `src/features/reading-calendar/ReadingCalendar.tsx`,
  `src/features/reading-calendar/ReadingCalendarDay.tsx`,
  `src/features/reading-calendar/ReadingCalendarLegend.tsx`,
  `tests/features/reading-calendar/ReadingCalendar.test.tsx`,
  `tests/features/reading-calendar/ReadingCalendarDay.test.tsx`,
  `tests/features/reading-calendar/ReadingCalendarLegend.test.tsx`
- **Acceptance:** Calendar uses warm theme tokens, renders its day grid for
  empty months, and still shows logged days, stripes, and legend correctly.
- **Notes:** Keep `buildReadingCalendarMonth` unchanged unless a test reveals
  a model bug.

## T5. Group and align library filters

- **Files:** `src/features/shelf-list/ShelfList.tsx`,
  `src/features/shelf-list/ShelfFilters.tsx`,
  `src/features/shelf-list/ShelfSort.tsx`,
  `src/features/shelf-list/ShelfTagFilter.tsx`,
  `src/features/shelf-list/ClearFilters.tsx`,
  `tests/features/shelf-list/ShelfList.test.tsx`,
  `tests/features/shelf-list/ShelfFilters.test.tsx`,
  `tests/features/shelf-list/ClearFilters.test.tsx`
- **Acceptance:** Search, status tabs, sort, tags, and conditional clear
  filters appear as one cohesive responsive block, while filtering, sorting,
  tag toggling, and clear-focus behavior remain unchanged.
- **Notes:** Prefer composition changes in `ShelfList`; only touch child
  components where spacing or wrapping requires it.

## T6. Compact and soften library book cards

- **Files:** `src/features/shelf-list/BookCard.tsx`,
  `tests/features/shelf-list/BookCard.test.tsx`
- **Acceptance:** Cards are roughly 20-25% more compact, have no harsh black
  border, preserve cover aspect ratio, and keep title, author, status,
  progress, tags, edit, and delete affordances usable.
- **Notes:** Avoid shrinking text below comfortable readability.

## T7. Verification and spec review

- **Files:** affected implementation and tests
- **Acceptance:** All spec acceptance criteria are reviewed, `npm run lint`
  passes, and `npm run test` passes.
- **Notes:** Do not commit until the user reviews and explicitly approves.
