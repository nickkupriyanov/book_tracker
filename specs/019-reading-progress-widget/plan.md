# Plan: Reading Progress Widget

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-08

---

## 1. Architecture summary

This is a focused home-page UI and behavior update inside the existing
page-progress feature. `PageProgressQuickUpdate` remains the only component
that owns the active book's draft page input, saving flags, and inline
messages. It will gain a small local rendering model for percentage,
pages-left, today's pages, and button enablement, plus quick-save handlers that
reuse the existing `updateBook`, `validateBookInput`, and reading-log delta
logic. No domain types, storage interfaces, routes, or backend behavior change.

## 2. Module / file layout

- `src/features/page-progress/PageProgressQuickUpdate.tsx` - redesign the
  panel and add local helpers/handlers for progress summary, instant quick
  actions, and today's motivation line.
- `tests/features/page-progress/PageProgressQuickUpdate.test.tsx` - update
  existing assertions and add quick-action/progress-summary coverage.
- Optional: no new component files unless the final JSX becomes too large to
  keep readable.

## 3. Data flow

Typed save flow:

1. User edits `Current page`.
2. User clicks `Update progress`.
3. The component parses the draft and builds the next book input.
4. Existing reading-log delta logic adds pages only for a positive delta.
5. `validateBookInput` validates the candidate shape.
6. `updateBook` persists the book.
7. Store state re-renders the widget with updated progress.

Quick page action flow:

1. User clicks `+10 pages` or `+25 pages`.
2. The component derives the next page from `book.currentPage ?? 0`.
3. If `book.totalPages` exists, the next page is capped at `totalPages`.
4. The same save path used by typed saves validates, persists, and updates
   today's reading log.
5. Inline errors appear on validation/storage failure.

Finished flow:

1. User clicks `Finished`.
2. If `totalPages` exists, the component saves `currentPage = totalPages` and
   `status = "read"`.
3. If `totalPages` is missing, the component saves `status = "read"` while
   preserving existing page fields.
4. The book leaves the reading list after the store updates.

## 4. Component breakdown

- **PageProgressQuickUpdate**
  - **Props:** `book: Book`.
  - **State:** existing `pageDraft`, `error`, `info`, `isSaving`; extend or
    reuse saving state for quick actions and `Finished` so buttons can disable
    during in-flight writes.
  - **Derived model:** `hasTotal`, `percent`, `pagesLeft`, `progressText`,
    `todayPagesRead`, `canSave`, and responsive display strings.
  - **Behavior:** progress-first layout with book summary, secondary detail
    button, bookmark-like progress line, typed update, instant quick actions,
    inline error/info.
  - **Tests:** rendering variants, typed save compatibility, quick actions,
    finished behavior, today's motivation line, error behavior.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

All writes continue through `useBookLibrary.updateBook`. The localStorage
adapter persists updated nested `readingLogs` as part of the existing `Book`
record.

## 6. Decisions & trade-offs

- Chose a progress-first layout over a form-first layout because the home panel
  is a daily reading surface, not a generic edit form.
- Chose a bookmark-like line over a heavier progress component because it feels
  bookish while preserving accessible progressbar semantics.
- Chose instant quick actions because the common daily update path should take
  one click.
- Chose to cap quick page actions at `totalPages` because quick actions should
  avoid creating validation errors for predictable overflows.
- Chose not to show time remaining because the app does not yet know reading
  speed and should not invent precision.
- Chose local helpers inside `PageProgressQuickUpdate` first; extract only if
  the component becomes hard to read.

## 7. Risks

- Instant quick actions can accidentally save if clicked unintentionally; this
  is accepted because the value remains editable through the same current-page
  control.
- Capping quick actions at `totalPages` means a `+25 pages` click near the end
  may save a smaller delta than the label. The updated page fraction makes the
  result visible immediately.
- `Finished` with unknown `totalPages` cannot infer a final page. It should
  mark the book read without inventing `currentPage`.
- The refreshed visual layout must stay compact; avoid turning the panel into a
  stats dashboard.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA steps:
  - Open home with a reading book that has `currentPage` and `totalPages`;
    verify page fraction, percentage, bookmark line, pages left, and `Open book`.
  - Open home with a reading book missing `totalPages`; verify no fake
    percentage/pages-left and the add-total prompt remains.
  - Click `+10 pages` and `+25 pages`; verify page updates and today's log
    aggregates.
  - Click quick actions near the end of a book; verify the page caps at
    `totalPages`.
  - Click `Finished` with and without `totalPages`; verify expected page fields
    and `status = "read"`.
  - Enter an invalid typed page and verify the inline error remains.
  - Check desktop and mobile widths for overlapping text or controls.
  - Run `npm run lint`.
  - Run `npm run test`.
