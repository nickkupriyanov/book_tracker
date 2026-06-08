# Spec: UI Polish

> **Status:** Done
> **Author:** Codex
> **Created:** 2026-06-08
> **Spec ID:** 020-ui-polish
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 013 (reading calendar), spec 015 (library page and page progress), spec 016 (reading log and navigation polish), spec 017 (reader profile card), spec 018 (yearly reading challenge), spec 019 (reading progress widget)

---

## 1. Problem

The app has the right MVP surfaces, but several pieces still feel assembled
rather than polished. Adding a book is available in page-specific places
instead of as a global action. The home page still points users back to the
library even though the header already has navigation. The reading calendar
uses an older dark visual direction that now clashes with the warm page rail.
The library filters are split into separate rows, and the book cards feel
heavier and larger than the rest of the interface.

This polish matters because Book Tracker should feel calm, warm, and
book-inspired. The app should not read as a dashboard or a pile of unrelated
controls.

## 2. Goal

Make the existing home, header, reading calendar, and library page feel like
one coherent warm reading app while preserving the current local-first MVP
architecture.

## 3. Non-goals

- No backend, sync, auth, accounts, or server persistence.
- No new domain types, storage adapter methods, data migration, or npm
  dependency.
- No redesign of the app navigation model or route structure.
- No change to the app-wide language strategy beyond the requested Russian
  global add-book CTA.
- No new reading statistics, analytics, charts, or dashboard layout.
- No removal of existing add-book affordances from the empty shelf state.

## 4. Users & scenarios

**Story.** A reader opens the app and wants to add a book from anywhere. The
header has a clear `Добавить книгу` action on the right, opening the existing
add-book dialog without navigating away.

**Story.** A reader opens the home page while already reading a book. The page
stays focused on current reading progress, the reading lane, profile,
challenge, and calendar. It does not show extra `Open library` CTAs that
duplicate the header navigation.

**Story.** A reader checks the calendar for a month with no finished reading
days. The month grid still appears, so navigation and month shape remain
stable, and the empty message feels secondary rather than replacing the
calendar.

**Story.** A reader opens `/library` to browse and refine the shelf. Search,
status, sort, tags, and clear filters feel like one control area. Cards are
lighter, smaller, and aligned with the warm palette.

## 5. UX

The visual direction is **Warm Shelf Polish**:

- primary actions are easy to find but not shouty;
- controls that belong together are grouped together;
- the home page is quiet and focused on reading, not navigation reminders;
- the calendar uses the current theme tokens instead of an isolated dark
  palette;
- library cards feel compact and browseable without becoming dense dashboard
  tiles.

### 5.1 Header

The header keeps the existing app title and navigation links. A primary
`Добавить книгу` button appears on the right side of the header. It opens the
same `AddBookDialog` used elsewhere. While the library store is not ready, the
button is disabled to avoid submitting before the storage adapter is
initialised.

### 5.2 Home page

The home page removes both `Open library` CTAs: the top-right ready-state link
and the no-reading empty-state button. The no-reading state remains helpful
with copy explaining that no books are currently marked as reading.

Small rail and reading-lane polish:

- the reader profile bookmark contour moves slightly left so it feels tucked
  into the card rather than hanging outside the edge;
- the yearly challenge goal input expands with the available form space;
- each reading-lane card no longer owns a fixed `160px` width because the
  parent lane controls sizing.

### 5.3 Reading calendar

The calendar panel uses `bg-card`, `text-card-foreground`, `border-border`,
`muted`, `accent`, and `primary` family tokens instead of inline dark colors.
Logged day colors still come from the existing book colors.

The month grid always renders for the selected month. If no days have logged
books, the grid still shows empty days and the empty copy appears as secondary
supporting text.

### 5.4 Library filters

The library keeps search, status tabs, sort, tag filters, and clear filters,
but presents them as one cohesive filter block. The block should work on
mobile and desktop:

- search remains prominent;
- status and sort controls are visually aligned;
- tags stay in the same filter area;
- clear filters appears inside the block when filters are active.

### 5.5 Library cards

Book cards become about 20-25% more compact while preserving cover aspect
ratio and readable text. The visual weight softens: no black or harsh border,
no unnecessary top spacing, smaller content padding, and a warmer relationship
to the page background.

## 6. Functional requirements

- **FR-1.** The app header renders a `Добавить книгу` button on the right side
  of the header.
- **FR-2.** Clicking `Добавить книгу` opens the existing add-book dialog.
- **FR-3.** The header add-book button does not allow submission before the
  book library store is ready.
- **FR-4.** The home page does not render an `Open library` link or button in
  the ready non-empty state.
- **FR-5.** The home no-reading state does not render an `Open library` link
  or button.
- **FR-6.** `ReaderProfileCard` renders its decorative bookmark contour
  slightly further left than before.
- **FR-7.** `YearlyChallengeCard` renders the goal input with flexible width
  inside its edit form.
- **FR-8.** `ReadingBookCard` does not set its own fixed `160px` width.
- **FR-9.** `ReadingCalendar` uses the current app theme tokens rather than
  the previous dark inline panel palette.
- **FR-10.** `ReadingCalendar` renders the month grid even when the visible
  month has no logged reading days.
- **FR-11.** `ReadingCalendar` still renders logged day colors and multi-book
  stripes using the existing day model.
- **FR-12.** The `/library` page does not render its page-header `Add book`
  button when the shelf is non-empty.
- **FR-13.** The `/library` filter controls render as one cohesive block
  containing search, status tabs, sort, tags, and conditional clear filters.
- **FR-14.** Clearing filters still resets search, selected tags, and status
  to their defaults and returns focus to search.
- **FR-15.** Library book cards render with softer visual weight and no harsh
  black border.
- **FR-16.** Library book cards are approximately 20-25% more compact than the
  current version without clipping title, author, status, progress, tags, or
  action buttons.
- **FR-17.** Empty, loading, and error states remain present on home and
  library pages.
- **FR-18.** The implementation remains local-first and does not change
  `StorageAdapter`.

## 7. Data

This spec touches presentation and existing add-book behavior only.

Existing domain types used:

- `Book` and `BookInput` from `src/types/book.ts`;
- `AnnualReadingChallenge` from `src/types/challenge.ts`.

No data shape changes, migrations, or persisted schema changes are required.

## 8. Storage interface

No changes to `StorageAdapter`.

The global header action reuses `AddBookDialog`, which already writes through
`useBookLibrary.addBook` and the existing adapter.

## 9. Edge cases & errors

- If the store is still loading, the header add-book button is disabled.
- If the store enters the error state, the header add-book button remains
  disabled and existing page-level error messages remain responsible for
  explaining the failure.
- If the library is empty, `EmptyShelf` keeps its existing add-first-book
  affordance.
- If a month has no logged reading days, the calendar still shows all month
  days and a secondary empty message.
- If the library has no tags, the filter block omits the tag area as it does
  today.
- If the viewport is narrow, filter controls wrap without overlapping text or
  hiding clear filters.
- If book titles, authors, or tags are long, compact cards truncate or wrap
  according to existing card conventions without layout breakage.

## 10. Acceptance criteria

- [x] Header contains a right-aligned `Добавить книгу` button.
- [x] Header `Добавить книгу` opens the add-book dialog once the store is
  ready.
- [x] Header add-book button is disabled while the store is not ready.
- [x] Home page no longer shows any `Open library` CTA.
- [x] Home no-reading state still explains that no books are in progress.
- [x] Reader profile bookmark contour appears tucked into the card rather than
  outside the right edge.
- [x] Yearly challenge goal input expands in its row.
- [x] Reading-lane cards size from their parent container, not a fixed
  `160px` class.
- [x] Calendar uses the warm app palette and no longer appears as a dark panel.
- [x] Calendar month grid appears for months with zero logged reading days.
- [x] Library page header no longer contains a page-local `Add book` button.
- [x] Library filters appear as a cohesive control block.
- [x] Clear filters still resets filters and focuses search.
- [x] Library cards are visibly smaller and lighter, with no harsh black
  border.
- [x] Home and library loading, error, and empty states still render.
- [x] `npm run lint` passes.
- [x] `npm run test` passes.

## 11. Out of scope (for this spec)

- Changing app copy broadly from English to Russian.
- Reworking the add-book form fields or validation.
- Adding calendar editing from the home page.
- Changing shelf sorting/filter semantics.
- Introducing virtualization, pagination, or a new library layout mode.
- Changing book cover storage, upload, or external cover lookup.

## 12. Open questions

None. The global CTA placement, polish scope, and SDD requirement are resolved
for this spec.
