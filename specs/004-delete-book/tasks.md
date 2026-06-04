# Tasks: Delete Book

> **Status:** Draft
> **Spec:** `../spec.md`
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task `[x]`
only when its acceptance line is satisfied and
`npm run lint && npm run test` pass.

Order matters: T1–T2 add the new storage + store capability,
T3 introduces the new UI primitive, T4 builds the new dialog
on top, T5–T6 wire it into the card and shelf, T7 polishes.

---

## T1. StorageAdapter: add `deleteBook` (TDD)

- [x] **Files:** `src/storage/storage-adapter.ts`,
  `src/storage/local-storage-adapter.ts`,
  `tests/storage/local-storage-adapter.test.ts`.
- **Acceptance:**
  - `StorageAdapter` interface gains
    `deleteBook(id: string): Promise<void>`.
  - `LocalStorageAdapter` implements it: list → findIndex →
    throw if missing → splice → setItem.
  - Throws when `id` is not found (message includes
    "not found", same style as `updateBook`).
  - Other books in storage are unaffected; insertion order
    of the rest is preserved.
  - Tests cover: success path (single book), success path
    (multi-book, only target removed), missing id throws,
    deletion of the only book leaves an empty array,
    storage failure propagates (≥ 4 tests).
- [x] **Notes:** mirror the existing `updateBook` test style in
  `tests/storage/local-storage-adapter.test.ts`.

## T2. useBookLibrary: add `deleteBook` action (TDD)

- [x] **Files:** `src/state/book-library.ts`,
  `tests/state/useBookLibrary.test.ts`.
- **Acceptance:**
  - Store exposes
    `deleteBook(id: string): Promise<void>`.
  - Calls `adapter.deleteBook(id)`, removes the book from
    `books` by `id` (other books and order preserved), sets
    `status: 'ready'`.
  - Throws if `init` was not called (same pattern as
    `addBook` and `updateBook`).
  - Sets `status: 'error'` and rethrows on adapter failure.
  - Tests cover: success path, removes in place, preserves
    other books and order, error path, not-initialized path
    (≥ 4 tests).
  - The `makeFakeAdapter` helper in the test file is
    extended with a default `deleteBook` mock so existing
    tests stay green.
- [x] **Notes:** mirror the existing `updateBook` test style
  in `tests/state/useBookLibrary.test.ts`.

## T3. Add `AlertDialog` UI primitive

- [x] **Files:** `src/components/ui/alert-dialog.tsx` (new).
- **Acceptance:**
  - Exports: `AlertDialog`, `AlertDialogPortal`,
    `AlertDialogOverlay`, `AlertDialogTrigger`,
    `AlertDialogContent`, `AlertDialogHeader`,
    `AlertDialogFooter`, `AlertDialogTitle`,
    `AlertDialogDescription`, `AlertDialogAction`,
    `AlertDialogCancel`.
  - Follows the same `data-slot` pattern and `cn` utility
    usage as the existing
    `src/components/ui/dialog.tsx`.
  - Wraps `@radix-ui/react-alert-dialog` (reached via the
    `radix-ui` meta-package, already a dependency).
  - `AlertDialogAction` is a `Button` with the same default
    styling as `Dialog`'s `DialogClose`; the caller passes
    the destructive variant explicitly when needed.
  - No new npm dependencies are added.
  - No new tests — the wrapper is a thin pass-through; the
    only consumer is tested end-to-end.
- **Notes:** this is the canonical shadcn
  `alert-dialog.tsx` file, copied with minor adjustments
  to match the project's existing `dialog.tsx` style.
  ~80 lines.

## T4. DeleteBookDialog (TDD)

- [x] **Files:**
  `src/features/delete-book/DeleteBookDialog.tsx`,
  `src/features/delete-book/index.ts`,
  `tests/features/delete-book/DeleteBookDialog.test.tsx`.
- **Acceptance:**
  - Props: `{ book: Book; open: boolean;
    onOpenChange: (open: boolean) => void }`.
  - Renders shadcn `AlertDialog` with title
    `Delete "<book.title>"?` and description
    `<book.author> will be removed from your library.
    This can't be undone.`.
  - Footer has Cancel (outline, label "Cancel") and
    Delete (`destructive`, label "Delete" while idle,
    "Deleting…" while in flight).
  - Cancel click → `onOpenChange(false)`, no state change,
    no adapter call.
  - Delete click → `setIsDeleting(true)`, call
    `useBookLibrary.deleteBook(book.id)`, on success
    `toast.success(\`Deleted "${book.title}"\`)`
    and `onOpenChange(false)`, on error set the
    form-level error and re-enable the buttons.
  - `last-status` is **not** updated on delete (preserved
    from spec 002 D2 and spec 003).
  - Tests cover: opens with book info (title + author
    visible), cancel no-op (no adapter call, no toast,
    dialog closes), delete success (toast,
    `onOpenChange(false)`, book gone from store),
    storage failure (form error visible, dialog stays
    open, both buttons re-enabled) (≥ 4 tests).
- [x] **Notes:** uses the new `AlertDialog` from
  `src/components/ui/`. Toast text distinguishes
  "Deleted" from Add's "Added" and Edit's "Updated". The
  `sonner` `toast` is mocked in the test (mirror the
  spec 003 EditBookDialog test setup).

## T5. BookCard: add Delete (trash) button (TDD)

- [x] **Files:** `src/features/shelf-list/BookCard.tsx`,
  `tests/features/shelf-list/BookCard.test.tsx`.
- **Acceptance:**
  - Add optional prop `onDelete?: () => void`.
  - When `onDelete` is provided, render a small trash
    icon button next to the existing pencil at the
    top-right of the cover. `variant="ghost"`,
    `hover:text-destructive`, `size="icon-sm"`.
  - `aria-label="Delete book"`,
    `data-testid="book-card-delete"`.
  - When `onDelete` is not provided, no trash button is
    rendered.
  - Clicking the button calls `onDelete`.
  - Existing BookCard tests (16 cases) still pass.
  - New tests cover: button renders when `onDelete` is
    provided, no button when omitted, click invokes
    `onDelete` (≥ 2 tests).
- [x] **Notes:** uses `lucide-react` `Trash2` icon (same
  family as `Pencil`). The two icon buttons need a small
  layout change (a flex row absolutely positioned at
  `top-2 right-2`) so they sit side-by-side without
  overlapping.

## T6. Wire ShelfList with `deletingBook` state + precedence

- [ ] **Files:** `src/features/shelf-list/ShelfList.tsx`,
  `tests/features/shelf-list/ShelfList.test.tsx`.
- **Acceptance:**
  - New state: `deletingBook: Book | null`.
  - Each `BookCard` receives
    `onDelete={() => setDeletingBook(book)}`.
  - When `deletingBook !== null`, render
    `<DeleteBookDialog book={deletingBook} open={true}
    onOpenChange={(open) => !open && setDeletingBook(null)} />`
    with `key={deletingBook.id}`.
  - **Precedence rule:** clicking a card's pencil
    clears `deletingBook` (and vice versa). The shelf
    never renders both dialogs at once.
  - Existing ShelfList tests (8 cases) still pass.
  - New tests cover: clicking a card's trash opens
    the delete dialog, the precedence rule (edit
    dialog closes when trash is clicked, and vice
    versa) (≥ 2 tests).
- **Notes:** no functional change to the existing
  edit flow beyond the clear-on-other-trigger logic.
  Pattern matches spec 003 T6 (`editingBook` wiring).

## T7. Polish & verification

- [ ] **Files:** (no new code);
  `specs/004-delete-book/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 004 are
    verified manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (expected ~155 tests
    total: 141 from spec 003 + ~14 new from spec
    004).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds.
  - No new `any` introduced.
  - No new npm dependencies introduced
    (`@radix-ui/react-alert-dialog` is reachable
    through the existing `radix-ui` meta-package).
  - No raw HTML controls where shadcn has an
    equivalent.
  - Update this file: tick all `[x]`s, set Status
    to `Done`.
- **Notes:** verification report goes here when
  the task is closed out.
