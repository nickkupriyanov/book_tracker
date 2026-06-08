# Plan: UI Polish

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-08

---

## 1. Architecture summary

This is a presentation-focused polish pass over existing client components.
The add-book flow remains the existing `AddBookDialog` and
`useBookLibrary.addBook` path, but the trigger moves to the root header as a
global action. Home and library pages keep their current Zustand-backed state
and route responsibilities. Calendar rendering continues to use
`buildReadingCalendarMonth`; only the visual treatment and empty-month render
branch change. No storage, domain type, route, backend, or dependency changes
are required.

## 2. Module / file layout

- `src/components/AppHeader.tsx` - add the global `Добавить книгу` action and
  own its dialog open state.
- `src/app/ShelfClient.tsx` - remove home-page `Open library` CTAs while
  preserving loading, error, empty, no-reading, and reading states.
- `src/app/library/LibraryClient.tsx` - remove the page-local non-empty
  `Add book` button and its now-unused dialog state.
- `src/features/reader-profile/ReaderProfileCard.tsx` - adjust the bookmark
  contour placement.
- `src/features/yearly-challenge/YearlyChallengeCard.tsx` - make the goal
  input flex with the form row.
- `src/features/page-progress/ReadingBookCard.tsx` - remove fixed card width.
- `src/features/reading-calendar/ReadingCalendar.tsx` - switch to theme
  tokens and always render the calendar grid.
- `src/features/reading-calendar/ReadingCalendarDay.tsx` - update empty-day
  colors and borders to fit the warm theme.
- `src/features/reading-calendar/ReadingCalendarLegend.tsx` - update legend
  text and swatch borders to fit the warm theme.
- `src/features/shelf-list/ShelfList.tsx` - group search, status, sort, tags,
  and clear filters into one filter block and tighten the card grid.
- `src/features/shelf-list/BookCard.tsx` - reduce visual weight and compact
  card spacing.
- `tests/components/AppHeader.test.tsx` - cover global add-book action.
- `tests/app/ShelfClient.test.tsx` - cover removed home `Open library` CTAs.
- `tests/app/LibraryClient.test.tsx` - cover removed page-local add button.
- `tests/features/reading-calendar/*.test.tsx` - cover theme-safe calendar
  rendering and empty-month grid.
- `tests/features/shelf-list/*.test.tsx` - cover grouped filters and compact
  cards where behavior or stable styling expectations change.

## 3. Data flow

Global add-book flow:

1. User clicks `Добавить книгу` in `AppHeader`.
2. `AppHeader` opens `AddBookDialog`.
3. `AddBookDialog` submits through `useBookLibrary.addBook`.
4. The store persists through the existing `StorageAdapter`, prepends the new
   book, closes the dialog on success, and pages re-render from store state.

Home polish flow:

1. `ShelfClient` reads the same ready/loading/error state as today.
2. When ready and non-empty, it renders the focused reading surface without
   extra library CTAs.
3. No-reading state remains informational but no longer has a route CTA.

Calendar flow:

1. `ReadingCalendar` keeps `visibleMonth` in local state.
2. `buildReadingCalendarMonth` produces the same model.
3. The component always renders `CalendarGrid`.
4. If `model.hasLoggedDays` is false, it additionally renders a secondary
   empty-month message.

Library filter flow:

1. `ShelfList` keeps existing local search/status/tag/sort state.
2. The same filtering and sorting helpers compute counts and visible books.
3. Controls render inside one block; clear filters keeps the current reset and
   focus behavior.
4. The grid renders compact `BookCard` instances.

## 4. Component breakdown

- **AppHeader**
  - **Props:** none.
  - **State:** local `dialogOpen`; derived `status` from `useBookLibrary`.
  - **Behavior:** navigation plus right-aligned global add-book button; opens
    `AddBookDialog` only when the store is ready.
  - **Tests:** links still render/mark active route; button renders disabled
    before ready and opens dialog after ready.

- **ShelfList filter block**
  - **Props:** unchanged `books: Book[]`.
  - **State:** existing local filter/search/tag/sort/dialog state.
  - **Behavior:** search, status tabs, sort, tags, and clear filters render as
    a single cohesive control area while preserving filter semantics.
  - **Tests:** existing filter/search/sort/tag tests stay valid; add a
    user-visible or test-id assertion for the grouped block.

- **ReadingCalendar**
  - **Props:** unchanged `books: Book[]`.
  - **State:** unchanged `visibleMonth`.
  - **Behavior:** theme-token panel; grid always visible; empty text becomes
    secondary support instead of replacing the grid.
  - **Tests:** empty month still renders day cells and empty message; logged
    months still render legend/striped days.

- **BookCard**
  - **Props:** unchanged.
  - **State:** unchanged `coverFailed`.
  - **Behavior:** same links and actions, lighter shell, smaller content
    spacing, no harsh border.
  - **Tests:** existing title/author/status/action tests remain; update style
    assertions only where current tests depend on old spacing.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

## 6. Decisions & trade-offs

- Chose the header as the single non-empty add-book trigger because adding a
  book is global and should not belong only to `/library`.
- Chose to keep `EmptyShelf` add-first-book actions because empty states still
  need an immediate next step.
- Chose token-based calendar styling over hard-coded OKLCH inline colors so
  the calendar follows the app palette and future theme changes.
- Chose to group filters in `ShelfList` rather than changing each child
  component API, keeping component interfaces stable.
- Chose compact cards through spacing and grid changes instead of changing
  cover aspect ratio, preserving the book-cover visual language.

## 7. Risks

- Moving the add-book dialog into `AppHeader` means the header now depends on
  client store state. This is acceptable because `AppHeader` is already a
  client component using `usePathname`.
- A global add button can be clicked before `RootClient` finishes init; disable
  the button until `status === "ready"` to avoid the existing add-before-init
  error.
- Compact cards may hide too much metadata if overdone. Keep truncation and
  action buttons readable on mobile and desktop.
- Grouped filters can wrap awkwardly on narrow screens. Use responsive flex or
  grid layout with stable gaps and avoid fixed widths where content varies.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA steps:
  - Load `/`; verify no `Open library` CTA appears in reading or no-reading
    states.
  - Use `Добавить книгу` from `/`, `/library`, and `/stats`; verify the dialog
    opens and adding a book updates the library.
  - Load while store is loading/error in tests or by simulated state; verify
    header add button is disabled and page messages still render.
  - Navigate calendar to a month with no logged days; verify the month grid
    remains visible and the panel uses the warm palette.
  - Open `/library`; verify the page-local `Add book` button is gone, filters
    are grouped, clear filters still works, and cards are smaller/lighter.
  - Check mobile and desktop widths for overlapping header, filter, calendar,
    and card text.
  - Run `npm run lint`.
  - Run `npm run test`.
