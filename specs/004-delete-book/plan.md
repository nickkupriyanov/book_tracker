# Plan: Delete Book

> **Status:** Draft
> **Spec:** `../spec.md` (`Draft`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-04

---

## 1. Architecture summary

Delete Book is a cross-cutting feature that mirrors spec 003 Edit
Book in shape: a new method on the **storage adapter**, a new action
on the Zustand **store**, a new **confirmation dialog**, and a new
**trigger** on the card. The biggest design call is **D3**: confirm
with an `AlertDialog`, not undo. The new UI primitive is added in
`src/components/ui/` following the standard shadcn pattern; no new
npm dependency.

The delete flow is conceptually a **state lift + adapter
extension**: ShelfList tracks `deletingBook`, passes the book to a
single `DeleteBookDialog` (AlertDialog). On confirm, the dialog
calls `useBookLibrary.deleteBook(id)`, which calls the adapter,
which removes the entry and persists.

## 2. Module / file layout

```
src/components/ui/
└── alert-dialog.tsx                  # NEW: shadcn-style AlertDialog wrapper

src/features/delete-book/             # NEW feature folder
├── DeleteBookDialog.tsx              # NEW: confirmation dialog
└── index.ts                          # NEW: barrel (exports DeleteBookDialog)

src/features/shelf-list/
├── BookCard.tsx                      # MODIFIED: add onDelete prop + trash button
└── ShelfList.tsx                     # MODIFIED: deletingBook state, one-at-a-time guard

src/storage/
├── storage-adapter.ts                # MODIFIED: add deleteBook to interface
└── local-storage-adapter.ts          # MODIFIED: implement deleteBook

src/state/
└── book-library.ts                   # MODIFIED: add deleteBook action

tests/
├── features/
│   ├── delete-book/
│   │   └── DeleteBookDialog.test.tsx  # NEW: integration tests
│   └── shelf-list/
│       ├── BookCard.test.tsx          # MODIFIED: add Delete button tests
│       └── ShelfList.test.tsx         # MODIFIED: add one-at-a-time test
├── storage/
│   └── local-storage-adapter.test.ts  # MODIFIED: add deleteBook cases
└── state/
    └── useBookLibrary.test.ts         # MODIFIED: add deleteBook cases
```

No deletions. No new domain types. No new validators. No new
npm dependencies.

## 3. Data flow

```
[BookCard]
  → trash button onClick → onDelete(book)

[ShelfList] (parent)
  - state: editingBook: Book | null
           deletingBook: Book | null
  - on card's onDelete: setDeletingBook(book)  // also clears editingBook
  - on card's onEdit:   setEditingBook(book)   // also clears deletingBook
  - renders <EditBookDialog ...>   when editingBook   !== null
           <DeleteBookDialog ...> when deletingBook !== null
           (never both at once — D4)

[DeleteBookDialog]
  - props: { book, open, onOpenChange }
  - state: isDeleting: boolean, error: string | null
  - on Cancel click → onOpenChange(false). No state change.
  - on Delete click →
      setIsDeleting(true); setError(null)
      try {
        await deleteBook(book.id)
        toast.success(`Deleted "${book.title}"`)
        onOpenChange(false)
      } catch {
        setError("Couldn't delete. Try again.")
        setIsDeleting(false)
      }

[useBookLibrary] deleteBook(id):
  if (adapter === null) throw
  try {
    await adapter.deleteBook(id)
    set(state => ({
      books: state.books.filter(b => b.id !== id),
      status: "ready",
    }))
  } catch (err) {
    set({ status: "error" })
    throw err
  }

[LocalStorageAdapter] deleteBook(id):
  books = await listBooks()
  idx = books.findIndex(b => b.id === id)
  if (idx === -1) throw new Error(`Book with id "${id}" not found`)
  books.splice(idx, 1)
  localStorage.setItem(KEY, JSON.stringify(books))
```

The card disappears from the grid the moment the store updates.
`ShelfList` derives counts from `books` via `useMemo`, so filter
tabs recompute on the same render. If `books.length === 0`, the
parent `ShelfClient` renders `EmptyShelf` (existing behavior,
no code change required).

## 4. Component breakdown

### `AlertDialog` (NEW, in `src/components/ui/alert-dialog.tsx`)

- shadcn-style wrapper around `@radix-ui/react-alert-dialog`
  (already exposed by the `radix-ui` meta-package in
  `package.json`).
- Standard exports: `AlertDialog`, `AlertDialogPortal`,
  `AlertDialogOverlay`, `AlertDialogTrigger`,
  `AlertDialogContent`, `AlertDialogHeader`,
  `AlertDialogFooter`, `AlertDialogTitle`,
  `AlertDialogDescription`, `AlertDialogAction`,
  `AlertDialogCancel`.
- Mirrors the structure of the existing
  `src/components/ui/dialog.tsx` (same `data-slot` pattern,
  same `cn` utility usage, same `bg-black/50` overlay).
- No new tests — the wrapper is a thin pass-through to Radix
  primitives; the only consumer (`DeleteBookDialog`) is tested
  end-to-end.

### `DeleteBookDialog` (NEW, in `src/features/delete-book/`)

- **Props:** `{ book: Book; open: boolean;
  onOpenChange: (open: boolean) => void }`.
- **State:** `isDeleting: boolean`, `error: string | null`.
- **Renders:** shadcn `AlertDialog` with title
  `Delete "<book.title>"?`, description
  `<book.author> will be removed from your library. This can't
  be undone.`, Cancel + Delete (destructive) buttons in the
  footer.
- **Behavior:**
  - **Cancel:** `onOpenChange(false)`. No state change.
  - **Delete:** `setIsDeleting(true)`, call
    `useBookLibrary.deleteBook(book.id)`, on success toast
    `Deleted "<title>"` and `onOpenChange(false)`, on error
    set the form-level error and re-enable.
- **Tests:** ≥ 4 (open with book info, cancel no-op, delete +
  toast + close, storage failure).

### `BookCard` (MODIFIED)

- **New optional prop:** `onDelete?: () => void`.
- **Render:** when `onDelete` is provided, a small trash button
  next to the existing pencil. Both are absolutely positioned
  at the top-right of the cover; the layout becomes a small
  flex row (`top-2 right-2`) holding both buttons.
- **Styling:** trash is `variant="ghost"` with
  `hover:text-destructive` (transparent by default, hints at
  destructive weight only on hover), `size="icon-sm"`,
  `aria-label="Delete book"`, `data-testid="book-card-delete"`.
- **Tests:** 2 new tests (no button without `onDelete`, click
  invokes `onDelete`).

### `ShelfList` (MODIFIED)

- **New state:** `deletingBook: Book | null`.
- **Precedence rule:** `setEditingBook` clears `deletingBook`,
  and `setDeletingBook` clears `editingBook`. Implemented as
  small wrapper functions inline (or via a `useCallback` if
  necessary for stability — TBD during T6).
- **Render:** when `deletingBook !== null`, render
  `<DeleteBookDialog book={deletingBook} open={true}
  onOpenChange={(open) => !open && setDeletingBook(null)} />`
  with `key={deletingBook.id}`.
- **Tests:** 1-2 new tests for the precedence rule.

## 5. Storage adapter changes

**Add to `StorageAdapter` interface:**
```ts
deleteBook(id: string): Promise<void>;
```

**`LocalStorageAdapter.deleteBook`:** list → findIndex → throw
if -1 → splice → setItem. No return value.

## 6. Decisions & trade-offs

- **D-P1. `AlertDialog` is a thin shadcn wrapper.** Mirrors the
  existing `dialog.tsx` for consistency. No new runtime logic.
- **D-P2. `DeleteBookDialog` is "dumb" w.r.t. the card.** The
  parent passes the book; the dialog fires
  `useBookLibrary.deleteBook`. No knowledge of how the trash
  button is rendered.
- **D-P3. `BookCard` grows the `onDelete` prop symmetrically
  with `onEdit`.** Same pattern (optional, button rendered only
  when provided), same `data-testid` and `aria-label`
  discipline.
- **D-P4. Precedence rule via paired setters.** `ShelfList`'s
  `setEditingBook` and `setDeletingBook` clear the other slot
  in the same render. Simpler than a single `activeDialog`
  state machine and matches the spec 003 D4 "parent-owned
  state" pattern.
- **D-P5. In-flight `isDeleting` guards the buttons.** While
  the adapter call is pending, both Cancel and Delete are
  disabled, and the Delete button reads "Deleting…". Prevents
  double-fire.
- **D-P6. No undo, no last-deleted buffer.** Per spec D3.
- **D-P7. Migration: none.** New method on existing adapter.
  Existing books in localStorage are untouched (no data shape
  change). Empty-after-delete is a pure rendering effect.

## 7. Risks

- **Visual crowding of the cover with two icon buttons.**
  Mitigation: trash is `variant="ghost"` (transparent by
  default), `text-destructive` on hover only. Pencil stays
  `variant="secondary"`. Both `icon-sm`. The cover has empty
  space (placeholder or 2:3 cover image); the row sits in the
  top-right corner with no competition.
- **Stale `id` after delete** (book deleted in another tab —
  not possible in MVP single-tab, but a future concern). The
  adapter throws; the dialog shows the form error. User can
  close manually. Same shape as spec 003 Edit.
- **Two dialogs at once.** Mitigated by D-P4 precedence rule
  + 1-2 unit tests.
- **Double-click on Delete.** Mitigated by `isDeleting` state
  + disabled buttons (D-P5).
- **`AlertDialog` focus management.** shadcn's wrapper handles
  focus trap + Escape + overlay dismissal. No extra work.

## 8. Rollout

- No feature flag, no migration.
- Manual QA (per spec §10):
  1. Shelf with multiple books → click trash on one → confirm
     dialog opens with title + author.
  2. Click Cancel → dialog closes, no change.
  3. Click Delete → dialog closes, card gone, filter counts
     recompute, toast.
  4. Reload page → book is still gone (persisted).
  5. Delete the only book → `EmptyShelf` appears.
  6. Storage failure path (simulate `setItem` throw) → form
     error visible, both buttons re-enabled, retry works.
  7. Open edit dialog, then click trash on a card → edit
     dialog closes, delete dialog opens (precedence).
  8. Open delete dialog, then click pencil on a card →
     delete dialog closes, edit dialog opens (precedence).
  9. Press Escape in delete dialog → closes, no change.
  10. Regression: Add + Edit flows still work.
- Verification: `npm run lint && npm run test` pass;
  `tsc --noEmit` clean; `npm run build` succeeds; no new
  `any`; no new npm dependencies.
- Expected test count: ~155 total (141 from spec 003 + ~14
  new from spec 004).
