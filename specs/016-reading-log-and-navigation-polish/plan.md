# Plan: Reading Log And Navigation Polish

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-07

---

## 1. Architecture summary

This spec builds on the spec 015 route split. Add a shared app-shell
header in the root layout path, keep `/library` as a pure full-shelf page,
add a placeholder `/stats` route, and keep the Reading Calendar only on
home. The home page keeps owning active-book UI state, but its compact
cards become cover-led vertical cards and the focus panel receives cover
art. Page saves continue through `useBookLibrary.updateBook`, but the
save handler now derives reading-log deltas and embeds daily aggregate
logs into the `Book` record. The calendar model reads `readingLogs` first
and keeps legacy `readingDays` compatibility.

## 2. Module / file layout

- `src/app/layout.tsx` - render the shared app header around all pages.
- `src/components/AppHeader.tsx` - app title and route navigation.
- `src/app/stats/page.tsx` - statistics placeholder.
- `src/app/ShelfClient.tsx` - home page without local app title header;
  calendar remains here only.
- `src/app/library/LibraryClient.tsx` - remove calendar rail; keep full
  shelf controls and add-book flow.
- `src/features/page-progress/ReadingBookCard.tsx` - vertical 160px
  cover-led card.
- `src/features/page-progress/PageProgressQuickUpdate.tsx` - cover-aware
  stable focus panel and reading-log delta creation.
- `src/types/book.ts` - add `ReadingLog` and `Book.readingLogs`.
- `src/lib/validation/book.ts` - validate and normalize reading logs.
- `src/lib/reading-calendar.ts` - build day entries from logs, with
  legacy `readingDays` fallback.
- Tests under `tests/app`, `tests/components`, `tests/features/page-progress`,
  `tests/lib`, and `tests/features/reading-calendar`.

## 3. Data flow

Header flow:

1. `RootLayout` renders `AppHeader` and then `RootClient`.
2. `AppHeader` reads `usePathname()` and marks the active nav link.
3. Page components no longer duplicate app-level navigation.

Progress-to-log flow:

1. Home passes the active `Book` to `PageProgressQuickUpdate`.
2. User saves a new current page.
3. The component computes `delta` from previous `currentPage`.
4. It builds the next `BookInput`:
   - always updates/clears `currentPage`;
   - if `delta > 0`, creates or updates today's aggregate log.
5. `validateBookInput` validates the next shape.
6. `updateBook` persists the book through the existing adapter.
7. Store re-renders home and calendar with updated page/log state.

Calendar flow:

1. `ReadingCalendar` passes books to `buildReadingCalendarMonth`.
2. The calendar helper groups `readingLogs` by date and book.
3. For each day, books are sorted by `pagesRead` descending and capped at
   three visible colors.
4. Legacy `readingDays` contribute fallback day entries only when needed.

## 4. Component breakdown

- **AppHeader**
  - **Props:** none.
  - **State:** none; active route derived from pathname.
  - **Behavior:** renders app title and three nav links.
  - **Tests:** links exist and active state updates for home/library/stats.

- **Stats placeholder page**
  - **Props:** none.
  - **State:** none.
  - **Behavior:** renders a quiet placeholder inside `PageContainer`.
  - **Tests:** heading and placeholder copy render.

- **ReadingBookCard**
  - **Props:** `book`, `active`, `onSelect`.
  - **State:** cover image fallback state only if needed.
  - **Behavior:** vertical cover-led selection card with title link,
    progress text, and tag overflow.
  - **Tests:** title link, body selection, progress variants, tag overflow.

- **PageProgressQuickUpdate**
  - **Props:** active `book`.
  - **State:** page draft, saving/error/info.
  - **Behavior:** stable cover-aware progress panel; saves current page and
    appends positive deltas to today's reading log.
  - **Tests:** cover/placeholder rendering, stable slots, positive-delta
    aggregation, no-log non-positive saves.

- **ReadingCalendar**
  - **Props:** `books`.
  - **State:** visible month only.
  - **Behavior:** renders log-driven day colors and labels.
  - **Tests:** top-three sorting by pages, labels include pages, legacy days.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

`readingLogs` are book-owned nested data, following existing nested
patterns such as quotes and reading days. The localStorage adapter
persists them as part of the whole book object.

## 6. Decisions & trade-offs

- Chose a shared header in app layout because navigation is now global
  across three routes.
- Chose `/stats` placeholder now so the header can point to a real route
  without inventing statistics content.
- Chose cover-led vertical home cards because they match the user's
  approved visual direction and feel more bookish than horizontal cards.
- Chose daily aggregate logs rather than session logs because the calendar
  needs per-book daily totals, not detailed session history.
- Chose current-page input with derived deltas because it preserves the
  existing fast interaction while adding useful calendar data.
- Chose embedded `readingLogs` on `Book` over a global journal to avoid a
  new aggregate and storage boundary in the MVP.

## 7. Risks

- Deriving `pagesRead` from current page can over-count if a user first
  enters a large current page for a book they were already reading before
  tracking. This is accepted for MVP and matches the confirmed behavior.
- Keeping both `readingDays` and `readingLogs` can make calendar logic
  more complex; tests must cover legacy fallback.
- Header in root layout may require updating page tests that query page
  headings or duplicate navigation.
- Card title link inside a selectable card can create event propagation
  mistakes; tests must verify title click does not select the card first.
- Calendar top-three ordering needs deterministic tie handling.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA steps:
  - Visit `/`, `/library`, `/stats`, and `/book/<id>`; verify shared
    header and active nav state.
  - Verify calendar appears on home and not library.
  - Check home cards around 160px width on desktop and reasonable wrapping
    on mobile.
  - Click card body to change active book; click title to open detail.
  - Save a positive page delta and verify today's calendar updates.
  - Save same/lower page and verify no additional pages are logged.
  - Save multiple positive deltas for the same book/day and verify they
    aggregate.
  - Check a day with more than three books uses the top three by pages.
  - Run `npm run lint`.
  - Run `npm run test`.
