# Plan: Library Page And Page Progress

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-07

---

## 1. Architecture summary

This feature splits the current home shelf into two route surfaces while
keeping the existing storage architecture unchanged. `RootClient`
continues to initialize the Zustand library store once for all routes.
`/library` becomes the full shelf route and reuses the existing
`ShelfList` behavior. `/` becomes a focused currently-reading route that
derives `readingBooks` from `useBookLibrary.books`, renders a small
quick page update component, and persists progress through the existing
`useBookLibrary.updateBook` method. Page progress is added to the
`Book` domain type and validated at the `validateBookInput` boundary.

## 2. Module / file layout

- `src/types/book.ts` - add optional `currentPage` and `totalPages`
  fields to the `Book` contract.
- `src/lib/validation/book.ts` - validate page fields and the
  `currentPage <= totalPages` cross-field rule.
- `src/app/page.tsx` / `src/app/ShelfClient.tsx` - refocus the home page
  on reading books and quick progress updates.
- `src/app/library/page.tsx` and `src/app/library/LibraryClient.tsx` -
  render the full shelf experience at `/library`.
- `src/components/BookForm.tsx` - add optional `totalPages` input to the
  shared add/edit form.
- `src/features/page-progress/PageProgressQuickUpdate.tsx` - focused
  home quick-update component.
- `src/features/page-progress/ReadingBooksList.tsx` - focused
  reading-only book list for the home page.
- `src/features/shelf-list/BookCard.tsx` - show lightweight page progress
  when available.
- `tests/lib/validation/book.test.ts` - page field validation coverage.
- `tests/app/ShelfClient.test.tsx` and `tests/app/LibraryClient.test.tsx`
  - home and library behavior coverage.

## 3. Data flow

Home happy path:

1. `RootClient` initializes `useBookLibrary` with `LocalStorageAdapter`.
2. Home reads `status`, `books`, and `updateBook` from the store.
3. Home derives `readingBooks = books.filter((b) => b.status === "reading")`.
4. Quick update selects an active book id from `readingBooks`.
5. User enters a current page and saves.
6. The component validates the next book shape through
   `validateBookInput({ ...book, currentPage })`.
7. On success, it calls `updateBook(book.id, result.value)`.
8. The adapter persists the full updated book record.
9. Zustand replaces the book in memory and the home page re-renders with
   updated progress text/bar.

Library happy path:

1. `/library` reads the same store state.
2. Ready non-empty state passes all books to `ShelfList`.
3. Existing `ShelfList` local state owns search, filters, selected tags,
   sort, edit dialog state, and delete dialog state.

## 4. Component breakdown

- **LibraryClient**
  - **Props:** none.
  - **State:** add-book dialog open/closed state.
  - **Behavior:** renders full library loading, error, empty, and ready
    states with `ShelfList books={books}`.
  - **Tests:** full shelf controls appear on `/library`; all statuses are
    represented through `ShelfList`; empty/loading/error states render.

- **Home/ShelfClient focused view**
  - **Props:** none.
  - **State:** add-book dialog state for empty-library first use, if
    reusing current empty flow.
  - **Behavior:** renders header, **Open library**, quick update, and
    reading-only list; no shelf controls.
  - **Tests:** only reading books render; non-reading books do not render;
    no shelf search/filter/sort controls appear; no-reading empty state
    appears when appropriate.

- **PageProgressQuickUpdate**
  - **Props:** `books: Book[]`.
  - **State:** selected book id, current page draft, saving/error state,
    completion prompt visibility.
  - **Behavior:** reads `updateBook` from `useBookLibrary`, selects one
    reading book, edits current page, validates, persists, and offers
    **Mark as read** when final page is reached.
  - **Tests:** selected book can change; saving updates the selected book;
    invalid pages show an error; final page shows **Mark as read** without
    automatic status change.

- **ReadingBooksList**
  - **Props:** `books: Book[]`.
  - **State:** none unless edit/delete actions are included locally.
  - **Behavior:** renders a compact grid/list of reading books, using the
    existing `BookCard` without edit/delete actions.
  - **Tests:** renders one card per reading book and displays progress
    text when available.

- **BookForm page-count field**
  - **Props:** no public prop changes.
  - **State:** string draft for optional `totalPages`.
  - **Behavior:** includes `totalPages` in submitted `BookInput` only when
    provided.
  - **Tests:** add/edit forms submit valid `totalPages`; invalid values
    show validation errors through existing form error handling.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

No migration is needed. `LocalStorageAdapter` already stores and returns
the whole book object. Validation changes are enough to protect new writes
while keeping legacy records with missing fields valid.

## 6. Decisions & trade-offs

- Chose a separate `/library` route over making the home shelf conditional
  because it gives each surface a clear job and avoids turning `ShelfList`
  into a mode-heavy component.
- Chose a shadcn `Select` for active-book switching because it works well
  on mobile and does not conflict with card navigation or card actions.
- Chose current-page tracking over page-delta sessions because the user's
  requested habit is "where am I now?", not a reading log.
- Chose optional `totalPages` because current-page tracking remains useful
  before the user knows the book length.
- Chose a soft **Mark as read** action over automatic status changes to
  match the existing no-magic posture around reading dates and statuses.
- Chose derived progress percentage instead of storing it because
  `currentPage` and `totalPages` are the source of truth.

## 7. Risks

- Moving the full shelf from `/` to `/library` can break tests that assume
  `ShelfClient` always renders `ShelfList`; update tests to assert the new
  route responsibilities.
- The quick update block could feel like a dashboard if progress is too
  visually loud; keep progress text/bar modest and book-centered.
- Reusing `BookCard` on the home page can make the focused view too busy
  if edit/delete affordances appear there; `ReadingBooksList` renders
  home cards without those actions.
- `BookForm` already has many fields; add `totalPages` compactly and avoid
  making page progress dominate the add/edit flow.
- Validation must avoid `any` and keep legacy optional fields valid.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA steps:
  - Start with an empty library and verify `/` offers the add-book path.
  - Add `want`, `reading`, and `read` books; verify `/` shows only
    `reading`.
  - Verify `/library` shows all books and existing shelf controls.
  - Save current page for a reading book without `totalPages`.
  - Add `totalPages`, save current page, and verify progress text/bar.
  - Try `currentPage > totalPages` and verify validation blocks save.
  - Save the final page and verify **Mark as read** appears without
    automatic status change.
  - Use **Mark as read** and verify the book leaves the home reading list
    and remains in `/library`.
  - Run `npm run lint`.
  - Run `npm run test`.
