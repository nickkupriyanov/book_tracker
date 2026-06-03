# Plan: Edit Book

> **Status:** Approved
> **Spec:** `../spec.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-02

---

## 1. Architecture summary

Edit Book is a cross-cutting feature: it touches the **storage layer**
(new method), the **store** (new action), the **shared UI** (extract
`BookForm`), the **card** (Edit button), and the **shelf** (edit state).
The biggest decision is **D2**: extract a shared `BookForm` so Add and
Edit don't duplicate ~150 lines of form code.

The Edit flow is conceptually a **state lift + adapter extension**:
ShelfList tracks `editingBook`, passes the editing book to a single
shared `EditBookDialog` (which renders `BookForm` pre-filled). On save,
the dialog calls `useBookLibrary.updateBook(id, input)`, which calls
the adapter, which persists and returns the updated record.

## 2. Module / file layout

```
src/components/
├── BookForm.tsx                   # NEW: shared form (Add + Edit)
├── BookCard.tsx                   # MODIFIED: add optional onEdit prop + Edit button
└── EmptyShelf.tsx                 # unchanged

src/features/add-book/
├── AddBookDialog.tsx              # MODIFIED: use BookForm (was AddBookForm)
├── AddBookButton.tsx              # unchanged
├── last-status.ts                 # unchanged
└── index.ts                       # MODIFIED: drop AddBookForm export (if any)

src/features/edit-book/                    # NEW feature folder
├── EditBookDialog.tsx             # NEW: wraps BookForm with edit config
└── index.ts                       # NEW: barrel (exports EditBookDialog)

src/features/shelf-list/
├── ShelfList.tsx                  # MODIFIED: add editingBook state
├── BookCard.tsx                   # unchanged (in shelf-list)
├── StatusPill.tsx                 # unchanged
├── ShelfFilters.tsx                # unchanged
├── EmptyFilterResult.tsx          # unchanged
└── index.ts                       # unchanged

src/storage/
├── storage-adapter.ts             # MODIFIED: add updateBook to interface
└── local-storage-adapter.ts        # MODIFIED: implement updateBook

src/state/
└── book-library.ts                # MODIFIED: add updateBook action

tests/
├── components/
│   └── BookForm.test.tsx          # NEW: unit tests for shared form
├── features/
│   ├── add-book/
│   │   └── AddBookDialog.test.tsx # unchanged (same scenarios, refactored impl)
│   └── edit-book/
│       └── EditBookDialog.test.tsx # NEW: integration tests
├── features/shelf-list/
│   └── BookCard.test.tsx          # MODIFIED: add Edit button test
├── storage/
│   └── local-storage-adapter.test.ts # MODIFIED: add updateBook cases
└── state/
    └── useBookLibrary.test.ts     # MODIFIED: add updateBook cases

DELETIONS:
- src/features/add-book/AddBookForm.tsx (replaced by BookForm)
```

## 3. Data flow

```
[BookCard]
  → pencil button onClick → onEdit(book)

[ShelfList] (parent)
  - state: editingBook: Book | null
  - on card's onEdit: setEditingBook(book)
  - renders <EditBookDialog book={editingBook} open={editingBook !== null} />
      with onOpenChange={(open) => !open && setEditingBook(null)}

[EditBookDialog]
  - renders <BookForm
      initialValues={bookToInput(book)}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        const updated = await updateBook(book.id, input);
        toast.success(`Updated "${updated.title}"`);
        onSuccess();    // parent closes dialog
      }}
      onSuccess={() => onOpenChange(false)}
    />

[BookForm] (new, shared)
  - state: title, author, status, coverUrl, tags, errors, formError, isSubmitting
  - on submit: validateBookInput(formState)
      - invalid: setErrors(result.errors), keep open
      - valid: setErrors({}), call props.onSubmit(input)
        - success: reset, call props.onSuccess()
        - failure: setFormError("Couldn't save..."), keep open

[useBookLibrary] (store)
  - updateBook(id, input):
      if (adapter === null) throw
      const updated = await adapter.updateBook(id, input)
      set(state => ({
        books: state.books.map(b => b.id === id ? updated : b),
        status: "ready",
      }))
      return updated
      on error: set status "error", rethrow

[LocalStorageAdapter]
  - updateBook(id, input):
      const books = await listBooks()
      const idx = books.findIndex(b => b.id === id)
      if (idx === -1) throw new Error("Book not found")
      const updated = { ...input, id, createdAt: books[idx].createdAt }
      books[idx] = updated
      localStorage.setItem(KEY, JSON.stringify(books))
      return updated
```

## 4. Component breakdown

### `BookForm` (NEW, in `src/components/BookForm.tsx`)
- **Props:** `{ initialValues: BookInput; submitLabel: string;
  onSubmit: (input: BookInput) => Promise<void>; onSuccess?: () => void }`.
- **State:** `title`, `author`, `status`, `coverUrl`, `tags`, `errors`,
  `formError`, `isSubmitting` — all `useState`.
- **Renders:** 5 fields + submit button + inline error display.
- **Tests:** 6-8 unit tests (initial values, submit disabled, validation
  errors, success path, failure path, field changes).

### `EditBookDialog` (NEW, in `src/features/edit-book/`)
- **Props:** `{ book: Book; open: boolean;
  onOpenChange: (open: boolean) => void }`.
- **State:** none (controlled).
- **Renders:** shadcn `Dialog` containing `BookForm` with edit-specific
  config.
- **Tests:** 3-4 integration tests (opens with pre-filled, saves,
  validation, close).

### `BookCard` (MODIFIED)
- **New optional prop:** `onEdit?: () => void`.
- **Renders:** when `onEdit` is provided, a small pencil button at
  top-right of the cover (absolute positioning, always visible).
  When not provided, no button.
- **Tests:** 1-2 new tests for the Edit button.

### `ShelfList` (MODIFIED)
- **New state:** `editingBook: Book | null`.
- **Behavior:** on `onEdit(book)`, sets editingBook. Renders
  `EditBookDialog` when `editingBook !== null`. On dialog close,
  resets to null.
- No new tests needed (covered by ShelfList tests + EditBookDialog
  tests).

### `AddBookDialog` (MODIFIED — refactor of spec 001 code)
- **Change:** use `BookForm` with empty initial values.
- **Public API unchanged:** still `{ open: boolean;
  onOpenChange: (open: boolean) => void }`.
- The `onSubmit` closure calls `addBook`, `setLastStatus`, `toast.success`,
  and `onSuccess` (which closes the dialog).
- **Tests:** unchanged — same scenarios still pass.

## 5. Storage adapter changes

**Add to `StorageAdapter` interface:**
```ts
updateBook(id: string, input: BookInput): Promise<Book>;
```

**`LocalStorageAdapter.updateBook`:** list → find by id → throw if
absent → replace with `{ ...input, id, createdAt: existing.createdAt }`
→ persist → return updated.

## 6. Decisions & trade-offs

- **D-P1. `BookForm` is the single source of truth** for form fields,
  validation, and error display. Both Add and Edit use it. Two
  concrete consumers justify the abstraction (constitution §3).
- **D-P2. `BookForm` is a "dumb" component** — receives config, fires
  callbacks. No knowledge of `addBook` vs `updateBook`, no knowledge of
  `toast` or `last-status`. Parent decides side effects.
- **D-P3. Pencil icon position:** top-right of the cover, absolute,
  always visible. Discoverable on mobile and to screen readers. Does
  not compete with the tags row below the title.
- **D-P4. Shared edit dialog, parent-owned state.** ShelfList tracks
  `editingBook`. One `EditBookDialog` instance. Card's `onEdit` sets
  the state; dialog re-mounts on book change via `key={book.id}`.
- **D-P5. After-save status:** store stays "ready" (no intermediate
  "saving" state). Same pattern as `addBook`. Optimistic UI is not
  needed for a localStorage write.
- **D-P6. Test counts (plan):** BookForm 6-8, EditBookDialog 3-4,
  BookCard +1-2, StorageAdapter +2-3, Store +2-3, AddBookDialog
  unchanged. Total new tests: ~15-20.
- **D-P7. Migration: none.** New method on existing adapter. Existing
  books in localStorage are untouched (no data shape change).

## 7. Risks

- **Refactor of spec 001 code** (deleting `AddBookForm.tsx`) could
  break existing tests. Mitigation: keep the same test scenarios in
  `AddBookDialog.test.tsx` — they test the dialog's behavior, which
  doesn't change.
- **`BookForm` owns its own state** — parent cannot read form
  values except via `onSubmit` callback. This is intentional but
  limits future use cases (e.g., "show summary while editing").
  If needed, add a `ref` API later.
- **Edit fails on stale id** (book deleted in another tab). The
  adapter throws; dialog shows form error. User has to close
  manually. Acceptable for MVP.
- **Card action area (pencil)** competes for visual attention with
  the cover. Mitigation: small icon, subtle styling. Visual polish
  spec will address.

## 8. Rollout

- No feature flag, no migration.
- Manual QA (per spec §10):
  1. Open shelf → click pencil on a book → dialog with pre-filled values.
  2. Modify title, save → dialog closes, card shows new title, toast.
  3. Modify status, save → card shows new status pill.
  4. Modify cover URL to broken URL, save → on next render, cover
     falls back to placeholder (T2 behavior).
  5. Open dialog, clear title, save → inline error, dialog stays.
  6. Storage failure path (simulate `setItem` throw) → inline form
     error, fields preserved.
  7. Reload page → book in updated state (persisted).
  8. Open dialog, close without save → no changes (cancel works).
  9. Regression check: Add Book flow still works (unchanged).
- Verification: `npm run lint && npm run test` pass, `tsc --noEmit`
  clean, `npm run build` succeeds. No new `any` introduced.
- Expected test count: ~130-135 total (115 from spec 002 + 15-20 new).
