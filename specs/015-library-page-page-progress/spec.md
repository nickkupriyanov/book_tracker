# Spec: Library Page And Page Progress

> **Status:** Draft
> **Author:** Codex
> **Created:** 2026-06-07
> **Spec ID:** 015-library-page-page-progress
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 002 (shelf list), spec 005 (detail view), spec 012 (reading dates), spec 013 (reading calendar), spec 014 (responsive page layout)
> **Successor:** -

---

## 1. Problem

The home page currently serves two jobs at once: it is the full library
surface and the place where the user returns day to day. As the library
grows, the daily habit of "what am I reading now?" competes with search,
filters, tags, sorting, and books that are not currently active.

Book Tracker also has no page bookmark. The user can mark reading days,
but cannot quickly record "I am now on page 123" without editing or
opening a book-specific surface. That makes page progress feel heavier
than the habit should be.

The app needs a calmer split: the home page should focus on books in
progress, while the full library remains available on a separate page.
Progress should be editable from the home page without navigating into a
book detail page.

## 2. Goal

Create a separate `/library` page for the full shelf, refocus `/` on
currently-reading books, and let the user update a selected reading
book's current page directly from the home page.

## 3. Non-goals

- No backend, server persistence, sync, accounts, or auth.
- No reading session journal, per-day page deltas, minutes read, notes,
  streaks, goals, or analytics dashboard.
- No automatic status transition when a book reaches its final page.
- No new npm dependency.
- No new `StorageAdapter` method.
- No localStorage migration for existing books.
- No URL persistence for the selected active book.
- No search, filters, tag controls, or sorting on the focused home page.

## 4. Users & scenarios

**Story.** Andy is reading three books. He opens Book Tracker, lands on
the home page, sees only those three books, selects *Piranesi* in the
quick update block, enters page 123, and saves. The book card updates to
show the new progress.

**Story.** Andy wants to browse everything he owns. He clicks
**Open library** and lands on `/library`, where the familiar shelf
search, status filters, tags, sorting, add, edit, and delete flows are
available for all books.

**Story.** Andy has a reading book without a known total page count. He
can still save the current page. The UI does not require total pages
before progress can be useful.

**Story.** Andy enters the final page for a book that has `totalPages`.
The app saves the page and offers a soft **Mark as read** action, but it
does not change the status until Andy chooses that action.

## 5. UX

### 5.1 Home page

The home page becomes a focused currently-reading surface. It keeps the
shared `PageContainer` rhythm from spec 014 and uses a calm, warm,
bookish layout rather than a metrics panel.

The ready state with reading books includes:

- a page header with the app title and **Open library** button;
- a compact quick update block above the reading list;
- only books with `status: "reading"`;
- no search, status tabs, tag filter, sort menu, or clear-filter control.

The quick update block includes:

- a shadcn `Select` listing the current reading books;
- a numeric current-page input for the selected book;
- a save button;
- progress text such as `123 / 420 pages` when `totalPages` exists, or
  `Page 123` when only `currentPage` exists;
- a quiet progress bar only when `totalPages` exists;
- a non-blocking prompt to add total pages through the edit flow when
  the selected book has no `totalPages`;
- a soft **Mark as read** action when `currentPage === totalPages`.

If the library is ready and has books but none are in progress, the home
page shows a quiet empty state and **Open library**. It does not fall
back to showing the full library.

If the library is empty, the existing empty-shelf / add-book entry point
remains available so first use still has an obvious next step.

### 5.2 Library page

The new `/library` page is the full shelf. It keeps the current shelf
experience: add book button, search, status filters, sort menu, tag
filter, clear filters, full book grid, empty/loading/error states, and
edit/delete actions.

The `/library` page should feel like the current home page, not like a
new product area. The route change is a separation of purpose, not a
visual redesign.

### 5.3 Feedback and errors

Saving page progress uses existing toast/inline-error patterns. A
storage failure keeps the user's typed value visible and leaves the
quick update block usable.

Validation errors are shown near the current-page input. Entering a
page greater than `totalPages` is rejected when `totalPages` is known.

## 6. Functional requirements

- **FR-1.** `Book` supports optional `currentPage?: number` and
  `totalPages?: number`.
- **FR-2.** Existing persisted books without `currentPage` or
  `totalPages` remain valid and render without migration.
- **FR-3.** `currentPage`, when present, must be a positive whole number.
- **FR-4.** `totalPages`, when present, must be a positive whole number.
- **FR-5.** If both `currentPage` and `totalPages` are present,
  `currentPage <= totalPages`.
- **FR-6.** The home page shows only books whose status is `reading`.
- **FR-7.** The home page quick update block lets the user select one
  reading book and save a new `currentPage` without navigating to
  `/book/[id]`.
- **FR-8.** Saving page progress persists through the existing
  `useBookLibrary.updateBook` path.
- **FR-9.** When a selected book has `totalPages` and
  `currentPage === totalPages`, the UI offers **Mark as read** but does
  not change status automatically.
- **FR-10.** Choosing **Mark as read** changes the book status to `read`
  through the existing update path and preserves the saved page fields.
- **FR-11.** The full library is available at `/library`.
- **FR-12.** `/library` renders all books and keeps the existing shelf
  search, status filters, sort, tag filter, clear filters, add, edit, and
  delete behavior.
- **FR-13.** The home page has no search, filters, tag controls, or sort
  menu.
- **FR-14.** Loading, error, empty-library, and no-reading-books states
  are explicit.

## 7. Data

The feature extends the domain type in `src/types/book.ts`:

```ts
export interface Book {
  currentPage?: number;
  totalPages?: number;
}
```

Both fields are optional so legacy records remain valid. They are page
numbers, not percentages and not session deltas.

`BookInput` continues to derive from `Book`, so add/edit/update flows
carry the new fields through the existing type contract.

No stored derived field is added for percentage. Any percentage or
progress bar is derived at render time from `currentPage` and
`totalPages`.

## 8. Storage interface

No changes to `StorageAdapter`.

The existing `addBook(input: BookInput)` and
`updateBook(id: string, input: BookInput)` methods carry
`currentPage` and `totalPages` as part of `BookInput`.

`LocalStorageAdapter` does not need a migration. It already persists the
whole `BookInput` shape and returns existing records as books.

## 9. Edge cases & errors

- Empty `currentPage` means no current page is stored.
- Empty `totalPages` means no total page count is stored.
- `currentPage` may exist without `totalPages`.
- `totalPages` may exist without `currentPage`.
- `currentPage > totalPages` is invalid when both are present.
- Decimal, zero, negative, non-numeric, or unsafe page numbers are
  invalid.
- A book can stop being `reading` after it was selected in the quick
  update block. The home page should derive the selected book from the
  current reading list and fall back to the first reading book when
  needed.
- If all reading books disappear, the quick update block is hidden and
  the no-reading empty state is shown.
- Storage failure while saving page progress shows an error and does not
  clear the user's draft input.
- Two-tab edits follow current MVP behavior: last successful write wins;
  no cross-tab conflict resolution is added.

## 10. Acceptance criteria

- [ ] `/library` exists and shows the full shelf experience for all
      statuses.
- [ ] `/` shows only `reading` books in the ready non-empty reading
      state.
- [ ] `/` has an **Open library** button.
- [ ] `/` does not render shelf search, status filters, tag filters, or
      sort controls.
- [ ] The home quick update block can select among reading books.
- [ ] The home quick update block saves `currentPage` without opening a
      book detail page.
- [ ] Books without `totalPages` can still save `currentPage`.
- [ ] Books with `totalPages` show progress text and a progress bar.
- [ ] `currentPage > totalPages` is rejected.
- [ ] When `currentPage === totalPages`, the UI offers **Mark as read**
      but does not auto-change status.
- [ ] Existing books without page fields continue to load and render.
- [ ] Loading, error, empty-library, and no-reading-books states are
      present.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 11. Out of scope (for this spec)

- Backend storage, HTTP adapter, sync, auth, or accounts.
- Reading sessions, page deltas, per-day page totals, or time tracking.
- Streaks, goals, yearly counters, charts, or analytics.
- Bulk editing page counts.
- Importing page counts from external book APIs.
- Persisting the selected active book in localStorage or the URL.
- Redesigning book detail, quotes, reviews, ratings, or reading calendar
  beyond showing page progress where useful.

## 12. Open questions

None. The design decisions are fixed for implementation:

- route is `/library`;
- button copy is **Open library**;
- quick update uses a shadcn `Select`;
- page progress means current page, not pages-read deltas;
- `totalPages` is optional;
- the home page has no shelf filters or sort controls;
- no automatic status changes.
