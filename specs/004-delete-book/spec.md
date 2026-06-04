# Spec: Delete Book

> **Status:** Draft
> **Author:** nickkupriyanov
> **Created:** 2026-06-04
> **Spec ID:** 004-delete-book
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

A user can add a book (spec 001), see it on the shelf (spec 002), and
edit it (spec 003) — but there is no way to remove a book from the
library. Real situations:

- The user added a duplicate by mistake.
- The user added a test book while exploring the app.
- The user no longer wants to track a particular book and wants a
  clean shelf.

In a single-user local-first app the user is their own admin; there
is no back office or admin tool to clean up. Without a delete, the
only option is to clear `localStorage` by hand in DevTools, which is
hostile to non-technical readers.

## 2. Goal

The user can permanently remove a book from their library via a small
"trash" trigger on each card, with a calm confirmation step, and the
shelf updates immediately.

## 3. Non-goals

- We do **not** offer undo. A confirmation dialog is the safety net.
- We do **not** support multi-select / bulk delete.
- We do **not** support soft delete, recycle bin, or "deleted books"
  view.
- We do **not** keep a delete history.
- We do **not** add a keyboard shortcut for delete.
- We do **not** support drag-to-trash or swipe-to-delete.
- We do **not** change the storage data model. Books are removed
  entirely; no `deletedAt` field.
- We do **not** introduce a backend. The MVP remains localStorage.

## 4. Users & scenarios

**Story.** Maya is cleaning her shelf after a busy month. She spots
"Project Hail Mary" added twice by accident. On the duplicate card,
she clicks the small trash icon at the top-right of the cover. A
dialog opens: "Delete \"Project Hail Mary\"?" with the author name
and a calm "this can't be undone" line. She clicks Delete. The
dialog closes, the card disappears, the filter counts recompute,
and a toast says `Deleted "Project Hail Mary"`.

**Story.** Andy realises he no longer wants to track a book he
started and abandoned. He clicks the trash on that card. The dialog
opens. He clicks Cancel. Nothing changes.

## 5. UX

- **Delete trigger.** A small **trash icon button** at the top-right
  of the cover on each `BookCard`, **next to** the existing pencil
  (spec 003). Always visible (not hover-only) for mobile and
  screen-reader discoverability. `variant="ghost"` by default
  (transparent), `text-destructive` on hover for a hint at the
  action's weight. `aria-label="Delete book"`,
  `data-testid="book-card-delete"`.
- **Confirmation dialog** (`<DeleteBookDialog>`): a shadcn
  `AlertDialog` (newly added UI primitive — see §8 / D10; no new
  npm dependency).
  - **Title:** `Delete "<title>"?`
  - **Description:** `<author> will be removed from your library.
    This can't be undone.`
  - **Footer:** two buttons — **Cancel** (outline) and **Delete**
    (destructive). Cancel is the default focus target on open; the
    destructive action is gated on the explicit Delete click.
  - **In flight:** while `deleteBook(id)` is pending, both buttons
    are disabled and Delete reads "Deleting…".
  - **On success:** close the dialog, show toast
    `Deleted "<title>"`. The card disappears from the grid the
    moment the store updates.
  - **On storage failure:** the dialog stays open, a form-level
    error `Couldn't delete. Try again.` is shown, both buttons
    are re-enabled, and the user can retry or cancel.
- **Empty-after-delete.** If the deleted book was the last one,
  `EmptyShelf` takes over automatically (existing behavior in
  `ShelfClient`).
- **One dialog at a time.** See D4: clicking a card's pencil while
  the delete dialog is open closes the delete dialog and opens the
  edit dialog (and vice versa). The shelf never renders both
  dialogs at the same time.

## 6. Functional requirements

- FR-1. Each `BookCard` shows a trash Delete button, positioned
  next to the existing pencil at the top-right of the cover.
- FR-2. Clicking the trash button opens a confirmation dialog
  (`AlertDialog`) with the book's title and author, and a
  "this can't be undone" line.
- FR-3. The dialog's Cancel button closes it without changes.
- FR-4. The dialog's Delete button is the `destructive` variant
  and is the only action that mutates storage.
- FR-5. On Delete click, `deleteBook(id)` is called. While the
  call is in flight, both buttons are disabled and the Delete
  button reads "Deleting…".
- FR-6. On success, the dialog closes, a toast
  `Deleted "<title>"` is shown, and the card disappears from the
  shelf grid immediately.
- FR-7. On storage failure, the dialog stays open, a form-level
  error `Couldn't delete. Try again.` is shown, and both buttons
  are re-enabled so the user can retry.
- FR-8. Filter counts (`All`, `Want to read`, `Reading`, `Read`)
  recompute after a delete (free — `ShelfList` already derives
  counts from props).
- FR-9. If the deleted book was the last one, `EmptyShelf` is
  rendered instead of the grid.
- FR-10. Only one dialog (edit **or** delete) can be open at a
  time (D4). The most recent click wins.

## 7. Data

No new types. The book is removed entirely: its `id` and
`createdAt` go with it. There is no soft-delete, no `deletedAt`
field, no cross-reference. The shape in `src/types/book.ts` is
unchanged.

## 8. Storage interface

**Add one method** to `StorageAdapter`:

```ts
/**
 * Remove a book by `id`. No-op (silent success) is intentionally
 * avoided: throws if not found, so a stale-id delete surfaces a
 * real error rather than appearing to succeed.
 *
 * @throws if no book with that `id` exists.
 * @throws on storage failure (quota, disabled, network).
 */
deleteBook(id: string): Promise<void>;
```

`LocalStorageAdapter` implements it by:

1. `listBooks()` to get the current array.
2. `findIndex` by `id`. If `-1`, throw
   `Book with id "<id>" not found`.
3. `splice` the entry out (in place).
4. Persist. Return `void`.

No return value: the store already has the book state to remove
locally, mirroring how the rest of the store works (the store owns
the in-memory list; the adapter owns persistence).

## 9. Edge cases & errors

- **Book not found** (id stale, deleted in another tab, manually
  wiped): the adapter throws; the dialog shows the form error
  "Couldn't delete. Try again." User closes manually. The shelf
  state may have already removed the book locally (depending on
  whether the local store saw the change), so the dialog
  effectively becomes a no-op on close.
- **Storage failure** (quota, disabled): handled per FR-7.
- **Deleting the only book:** the shelf becomes empty; the parent
  (`ShelfClient`) renders `EmptyShelf` (existing behavior).
- **Two dialogs at once:** the `ShelfList` precedence rule (D4)
  prevents this. The other dialog is unmounted on the same render.
- **Double-click on the trash button:** the dialog's "Deleting…"
  state disables both buttons, so a second click on Delete is a
  no-op. The underlying adapter call still happens exactly once
  per confirmed click.
- **Pressing Escape on the dialog:** closes without changes
  (shadcn `AlertDialog` default).
- **Clicking the overlay:** closes without changes (the
  destructive action is gated on the explicit Delete button;
  overlay dismissal is bound to Cancel semantics).

## 10. Acceptance criteria

- [ ] Each `BookCard` renders a trash Delete button next to the
      pencil.
- [ ] The trash button has `aria-label="Delete book"` and
      `data-testid="book-card-delete"`.
- [ ] Clicking the trash button opens an `AlertDialog` titled
      `Delete "<title>"?` with the author and "This can't be
      undone" in the description.
- [ ] The dialog has Cancel (outline) and Delete (destructive)
      buttons.
- [ ] Clicking Cancel closes the dialog and does not change
      storage or the grid.
- [ ] Clicking Delete calls `deleteBook(id)`, closes the dialog,
      shows a toast `Deleted "<title>"`, and the card disappears
      from the grid immediately.
- [ ] Filter counts on the shelf tabs update after a delete.
- [ ] Deleting the last book shows `EmptyShelf` (no grid, no
      filter tabs).
- [ ] Storage failure shows the form error and keeps the dialog
      open with both buttons re-enabled (FR-7).
- [ ] Opening the delete dialog and then clicking a card's
      pencil (or vice versa) opens the new dialog and closes the
      old one (D4).
- [ ] No raw HTML controls where shadcn has an equivalent (the
      dialog uses `AlertDialog`, not a custom modal).
- [ ] Lint and tests pass; no new `any` introduced.
- [ ] No new npm dependencies.

## 11. Out of scope (for this spec)

- Undo / restore deleted books.
- Bulk delete, multi-select.
- Soft delete, recycle bin, "deleted books" view.
- Delete history.
- Keyboard shortcut (e.g. `Cmd+Backspace`).
- Drag-to-trash, swipe-to-delete.
- `deletedAt` field on `Book`.
- Backend, server-side persistence, sync.
- Auto-delete based on shelf age or status.

## 12. Decisions

Resolved 2026-06-04.

- **D1. Single `DeleteBookDialog`, parent-owned state.** Mirrors
  spec 003 D4. `ShelfList` tracks `deletingBook: Book | null`;
  one dialog instance, `key={book.id}` for remount when switching
  books.
- **D2. Trigger placement: trash icon next to the pencil, both
  at top-right of the cover.** Always visible, not hover-only,
  for mobile and screen-reader discoverability. Matches spec 003
  D-P3 for the pencil. The card gains a second icon, but the
  cover is 2:3 with empty space and the trash uses
  `variant="ghost"` with `text-destructive` on hover only, so
  visual weight stays low.
- **D3. Confirmation: `AlertDialog`, no undo.** The constitution
  prefers "cozy over clever" and "small surface area". A confirm
  dialog is the simplest reversible-by-re-adding flow. Undo-toast
  would add a "last deleted" buffer in the store, a timer, and
  restore-via-storage logic — out of proportion to the MVP need.
- **D4. One dialog at a time (precedence rule).** `editingBook`
  and `deletingBook` are both `Book | null` on `ShelfList`. A
  click on a card's pencil while delete is open clears
  `deletingBook` and sets `editingBook` in the same render
  (and vice versa). The shelf never renders both dialogs.
- **D5. Confirmation copy.** Title: `Delete "<title>"?`.
  Description: `<author> will be removed from your library.
  This can't be undone.` Calm, names the book and the author,
  one clear irreversible sentence. Cancel + Delete.
- **D6. After-delete UX.** Card disappears, filter counts
  recompute, toast `Deleted "<title>"`. No undo, no shake, no
  animation beyond the grid re-render. (Animation polish is a
  future spec.)
- **D7. Storage failure UX.** Form-level error inside the
  dialog: `Couldn't delete. Try again.` Dialog stays open,
  buttons re-enabled. Same shape as spec 003 Edit "Couldn't
  save" error.
- **D8. Empty-after-delete is free.** `ShelfClient` already
  renders `EmptyShelf` when `books.length === 0`. No code
  change needed; the existing `EmptyShelf` test stays green.
- **D9. No new types, no migrations.** The data shape is
  unchanged. The store removes the book locally; the adapter
  re-persists the array without that book.
- **D10. No new npm dependencies.** `@radix-ui/react-alert-dialog`
  is part of the `radix-ui` meta-package already in
  `package.json`. The shadcn `AlertDialog` wrapper is copied
  into `src/components/ui/alert-dialog.tsx` (standard shadcn
  pattern, ~80 lines, no runtime change). The `Button` component
  already has a `destructive` variant.
