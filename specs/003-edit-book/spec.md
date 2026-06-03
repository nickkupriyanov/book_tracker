# Spec: Edit Book

> **Status:** Approved
> **Author:** nickkupriyanov
> **Created:** 2026-06-02
> **Spec ID:** 003-edit-book
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

A user can add a book (spec 001) and see it on the shelf (spec 002), but
once it's there it's frozen: a typo in the title, a wrong author, a
status that needs to change from "Want to read" to "Read" — none of this
is fixable. The only recourse is to delete and re-add, which loses the
book's `id` (and any future cross-references like notes or history).

## 2. Goal

The user can edit any field of an existing book. The edit flow is
discoverable, the form is pre-filled, validation reuses the same rules as
Add Book, and the change is persisted and reflected in the shelf grid
immediately.

## 3. Non-goals

- We do **not** delete books (spec 004).
- We do **not** bulk-edit multiple books.
- We do **not** keep an edit history / undo.
- We do **not** add an `updatedAt` field. The MVP doesn't need it; the
  `createdAt` is preserved across edits.
- We do **not** support a "Mark as Read" quick action. The user edits
  the book and changes the status through the same flow.
- We do **not** make the whole card clickable. The card has a dedicated
  Edit trigger; future detail views will live behind their own trigger.

## 4. Users & scenarios

**Story.** Mia added *Piranezi* (typo) yesterday. She opens the shelf,
sees the card with a small pencil icon at the top-right of the cover.
She clicks it; a dialog opens titled "Edit book" with all fields
pre-filled. She fixes the title to *Piranesi* and clicks "Save changes".
The dialog closes, a toast says "Updated 'Piranesi'", and the card on
the shelf now shows the corrected title.

**Story.** Andy finished reading *Project Hail Mary*. He clicks the
pencil, changes Status to "Read" via the Select, saves. The card on the
shelf now shows a "Read" status pill (muted, with checkmark).

## 5. UX

- **Edit trigger.** A small **pencil icon button** at the top-right of
  the cover on each `BookCard`. Always visible (not hover-only) for
  accessibility and mobile discoverability. Click → opens the Edit
  dialog with that book.
- **Edit dialog** (`<EditBookDialog>`):
  - Title: "Edit book".
  - Same fields as Add Book dialog: title, author, status (Select),
    cover URL, tags. All pre-filled with the book's current values.
  - Submit button: "Save changes" (not "Add book").
  - Submit disabled until title and author are non-empty.
  - On submit: validate → if invalid, show inline errors and keep
    dialog open. If valid, call `updateBook(id, input)`, close dialog,
    show toast `Updated "<title>"`.
  - On storage failure: inline form error "Couldn't save. Your browser
    storage is full or disabled." Fields preserved.
  - Close (X / Escape / overlay click) discards changes.
- **Status pill does not update `last-status`.** Per spec 002 D2,
  `last-status` is for the Add flow. Editing a book's status should
  not change the default for the next Add.
- **No new `createdAt` / `updatedAt`.** The book's `id` and `createdAt`
  are preserved across edits (per §3).

## 6. Functional requirements

- FR-1. Each `BookCard` shows an Edit (pencil) button.
- FR-2. Clicking the Edit button opens `EditBookDialog` with the book's
  current values pre-filled.
- FR-3. The dialog has fields: title, author, status, coverUrl, tags.
- FR-4. Submit is disabled until title and author are non-empty
  (after trim).
- FR-5. On submit, `validateBookInput(formState)` runs; if invalid,
  inline errors are shown per field and the dialog stays open.
- FR-6. On valid submit, `updateBook(id, input)` is called; the dialog
  closes and a toast `Updated "<title>"` is shown.
- FR-7. The shelf grid updates immediately: the card reflects the new
  values (title, status pill, tags).
- FR-8. On storage failure, the dialog stays open with an inline error
  and all fields preserved.
- FR-9. `id` and `createdAt` are preserved across edits.

## 7. Data

No new types. Uses existing `Book` and `BookInput` from
`src/types/book.ts`. The edit input is a `BookInput` (no `id` / no
`createdAt`) — the adapter restores those from the existing record.

## 8. Storage interface

**Add one method** to `StorageAdapter`:

```ts
updateBook(id: string, input: BookInput): Promise<Book>;
```

- Returns the updated `Book` (with `id` and `createdAt` restored).
- **Throws** if no book with that `id` exists (e.g. deleted in another
  tab). The dialog surfaces this as the same form error.

`LocalStorageAdapter` implements it by:
1. `listBooks()` to get the current array.
2. Find the book by `id`. If not found, throw.
3. Replace with `{ ...input, id, createdAt: existing.createdAt }`.
4. Persist. Return the updated book.

## 9. Edge cases & errors

- **Book not found** (id deleted elsewhere): the adapter throws; the
  dialog shows the same form error. The dialog stays open until the
  user closes it manually.
- **No-op edit** (user opens dialog, changes nothing, saves): the book
  is re-persisted with the same values. Harmless; re-render is a no-op.
- **Empty `coverUrl`** after clearing: the validator treats it as
  "not provided" and the `Book` ends up without a `coverUrl` key.
- **Same validation as Add Book.** All rules from spec 001 §6 apply
  identically (title length, author length, cover URL regex, tags
  normalization/dedupe/cap, status enum).

## 10. Acceptance criteria

- [ ] Each `BookCard` renders a pencil Edit button.
- [ ] Clicking the Edit button opens a dialog titled "Edit book" with
      all fields pre-filled.
- [ ] Submit is disabled until title and author are non-empty.
- [ ] Invalid input shows inline errors and keeps the dialog open.
- [ ] A valid save updates the book, closes the dialog, and shows a
      toast `Updated "<title>"`.
- [ ] The shelf grid updates immediately after save (no reload).
- [ ] On storage failure, an inline form error is shown and fields are
      preserved (FR-8).
- [ ] `id` and `createdAt` are preserved across edits.
- [ ] Status pill on the card reflects the new status after save.
- [ ] No raw HTML controls where shadcn has an equivalent.
- [ ] Lint and tests pass; no new `any` introduced.

## 11. Out of scope (for this spec)

- Delete Book.
- Bulk edit.
- Edit history / undo.
- `updatedAt` field.
- "Mark as Read" quick-action button.
- Whole-card click for edit.
- Edit from within a future detail view.

## 12. Decisions

Resolved 2026-06-02.

- **D1. Edit trigger placement.** Pencil icon at the top-right of the
  cover, always visible (not hover-only). Discoverable on mobile and
  to screen readers; doesn't compete with the tags row.
- **D2. Shared `BookForm` component.** The fields and validation are
  identical between Add and Edit, so we extract a shared component
  rather than duplicate ~150 lines. Lives in `src/components/BookForm.tsx`
  (shared, not feature-specific). `AddBookForm.tsx` is removed; the
  Add dialog uses `BookForm` with empty initial values. Two concrete
  consumers justifies the abstraction (constitution §3).
- **D3. After-save behavior.** Close + toast `Updated "<title>"`, same
  as Add. "Quick successive edits" is not a real MVP use case.
- **D4. Shared dialog, parent-owned state.** `EditBookDialog` is
  controlled by the parent (ShelfList), which tracks `editingBook`. One
  dialog instance, not per-card. Same pattern as `AddBookDialog` in
  spec 001.
