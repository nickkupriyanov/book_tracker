# Tasks: Edit Book

> **Status:** In Progress
> **Spec:** `../spec.md` (`Approved`)
> **Plan:** `../plan.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-02

Each task is one commit. Mark a task `[x]` only when its acceptance line
is satisfied and `npm run lint && npm run test` pass.

Order matters: T1–T2 add the new storage + store capability, T3 does the
big refactor (extract `BookForm`, retarget `AddBookDialog`), T4–T6 build
the new edit flow on top.

---

## T1. StorageAdapter: add `updateBook` (TDD)

- [x] **Files:** `src/storage/storage-adapter.ts`,
  `src/storage/local-storage-adapter.ts`,
  `tests/storage/local-storage-adapter.test.ts`.
- **Acceptance:**
  - `StorageAdapter` interface gains `updateBook(id: string, input: BookInput): Promise<Book>`.
  - `LocalStorageAdapter` implements it: list → find by id → throw if
    missing → replace with `{ ...input, id, createdAt: existing.createdAt }`
    → persist → return updated book.
  - `id` and `createdAt` of the existing book are preserved (not overwritten
    by input).
  - Throws when id is not found.
  - Tests cover: success path, missing id, preserves id+createdAt,
    multiple books in storage, list still in insertion order after update
    (≥ 4 tests).
- [x] **Notes:** mirror the existing T5 `addBook` test style.

## T2. useBookLibrary: add `updateBook` action (TDD)

- [x] **Files:** `src/state/book-library.ts`,
  `tests/state/useBookLibrary.test.ts`.
- **Acceptance:**
  - Store exposes `updateBook(id: string, input: BookInput): Promise<Book>`.
  - Calls `adapter.updateBook(id, input)`, replaces the book in `books`
    by `id` (other books untouched), sets `status: 'ready'`.
  - Throws if `init` was not called (same pattern as `addBook`).
  - Sets `status: 'error'` and rethrows on adapter failure.
  - Tests cover: success path, replaces in place, preserves other books,
    preserves order, error path, not-initialized path (≥ 4 tests).
- [x] **Notes:** mirror T6 addBook test style.

## T3. Extract BookForm + refactor AddBookDialog

- [x] **Files:** `src/components/BookForm.tsx` (new),
  `src/features/add-book/AddBookDialog.tsx` (modified),
  `src/features/add-book/AddBookForm.tsx` (deleted),
  `src/features/add-book/index.ts` (no new exports),
  `tests/components/BookForm.test.tsx` (new),
  `tests/features/add-book/AddBookDialog.test.tsx` (unchanged — must
  still pass after refactor).
- **Acceptance:**
  - `BookForm` is a new shared component: takes
    `{ initialValues, submitLabel, onSubmit, onSuccess? }`. Owns
    field state, errors, form-level error, isSubmitting.
  - Same validation, error display, and submit-disabled logic as the
    old `AddBookForm` (reuse `validateBookInput`).
  - `AddBookDialog` now uses `BookForm` with empty initial values
    and `submitLabel="Add book"`.
  - `AddBookForm.tsx` is deleted.
  - Existing `AddBookDialog` tests (11 cases) pass without modification
    — they test the dialog's behavior, which is unchanged.
  - New `BookForm` tests cover: initial values reflected in fields,
    submit disabled, validation errors, submit button label, success
    path, failure path (≥ 6 tests).
  - All `AddBookDialog` "Add 'X'" toast text and `setLastStatus` side
    effects now live in the dialog's `onSubmit` closure (preserved from
    the old `AddBookForm`).
- [x] **Notes:** this is the **D2** refactor. One task, one commit, but
  spans multiple files. Existing tests are the safety net — if they
  still pass, the refactor is behavior-preserving.

## T4. BookCard: add Edit button (TDD)

- [x] **Files:** `src/features/shelf-list/BookCard.tsx`,
  `tests/features/shelf-list/BookCard.test.tsx`.
- **Acceptance:**
  - Add optional prop `onEdit?: () => void`.
  - When `onEdit` is provided, render a small pencil icon button at
    the top-right of the cover (absolute positioning, always visible).
  - When `onEdit` is not provided, no button is rendered.
  - Clicking the button calls `onEdit`.
  - Existing BookCard tests (14 cases) still pass.
  - New tests cover: button renders when `onEdit` is provided, no
    button when omitted, click invokes `onEdit` (≥ 2 tests).
- [x] **Notes:** uses `lucide-react` `Pencil` icon. The button is
  positioned absolutely on the cover; we may need to add `relative`
  to the cover container (already there).

## T5. EditBookDialog (TDD)

- [x] **Files:** `src/features/edit-book/EditBookDialog.tsx`,
  `src/features/edit-book/index.ts`,
  `tests/features/edit-book/EditBookDialog.test.tsx`.
- **Acceptance:**
  - Props: `{ book: Book; open: boolean;
    onOpenChange: (open: boolean) => void }`.
  - Renders shadcn `Dialog` with title "Edit book" and `BookForm`
    pre-filled with `bookToInput(book)`.
  - `submitLabel` is "Save changes".
  - On valid submit: calls `useBookLibrary.updateBook(book.id, input)`,
    then `toast.success(\`Updated "${book.title}"\`)`, then `onOpenChange(false)`.
  - On invalid input / storage failure: same handling as BookForm
    (inline errors, fields preserved, dialog stays open).
  - `last-status` is **not** updated on edit (D2 of spec 002 preserved).
  - Tests cover: opens with pre-filled values, valid save closes +
    shows "Updated" toast, invalid input shows errors, storage failure
    preserves fields (≥ 3 tests).
- [x] **Notes:** uses `BookForm` from `src/components/`. Toast text
  distinguishes "Updated" from Add's "Added".

## T6. Wire ShelfList with `editingBook` state

- **Files:** `src/features/shelf-list/ShelfList.tsx`.
- **Acceptance:**
  - New state: `editingBook: Book | null`.
  - Each `BookCard` receives `onEdit={() => setEditingBook(book)}`.
  - When `editingBook !== null`, render `<EditBookDialog
    book={editingBook} open={true} onOpenChange={(open) =>
    !open && setEditingBook(null)} />`.
  - Use `key={editingBook.id}` so the dialog fully remounts when
    editing a different book.
  - Existing ShelfList tests (8 cases) still pass.
  - Manual: click pencil on a book → dialog opens with that book's
    values, save → grid updates, click pencil on another book →
    dialog swaps to that book.
- **Notes:** no new tests (integration covered by T5 + existing T5
  + manual QA). Same pattern as the spec 001 `dialogOpen` state for
  AddBookDialog.

## T7. Polish & verification

- **Files:** (no new code); `specs/003-edit-book/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 003 are verified manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (expected ~130-135 tests total: 115 from
    spec 002 + 15-20 new from spec 003).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds.
  - No new `any` introduced.
  - No raw HTML controls where shadcn has an equivalent.
  - Update this file: tick all `[x]`s, set Status to `Done`.
- **Notes:** verification gate. If anything in §10 fails, open a
  follow-up task — don't silently expand the scope.
