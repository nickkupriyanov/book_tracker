# Plan: Add Book

> **Status:** Approved
> **Spec:** `../spec.md` (read this first — must be `Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-02

---

## 1. Architecture summary

`Add Book` is the first feature that writes data, so this plan also bootstraps
the **storage layer** and the **books state** that all future features
(edit, delete, mark-as-read) will share.

The data lives behind a `StorageAdapter` interface. The MVP ships only
`LocalStorageAdapter`. Future specs add `HttpStorageAdapter` without
touching any UI. The in-memory books list is owned by a **Zustand store**
(`useBookLibrary`) that calls the `StorageAdapter` for persistence — the
store and the adapter have one job each.

Form state is local to the dialog. Validation is a **pure function** so it
can be unit-tested without a DOM. We deliberately avoid `react-hook-form`
and `zod` for one five-field form — the constitution's "no casual deps"
principle wins.

> **Why Zustand now, not later:** once `Mark as Read`, `Edit`, `Delete`,
> `Filter`, and `Sort` land, React Context re-renders every consumer on
> every list mutation — a known scaling pain. Zustand's selectors solve
> this in ~1KB. Adopting it now costs the same as adopting it later, but
> later also costs a migration.

## 2. Module / file layout

```
src/
├── types/
│   └── book.ts                          # Book, ReadingStatus, BookInput
├── storage/
│   ├── storage-adapter.ts               # interface StorageAdapter
│   └── local-storage-adapter.ts         # LocalStorageAdapter (sole MVP impl)
├── lib/
│   └── validation/
│       └── book.ts                      # validateBookInput() — pure
├── state/
│   └── book-library.ts                  # Zustand store: useBookLibrary(adapter)
├── features/
│   └── add-book/
│       ├── AddBookButton.tsx            # primary CTA on the shelf
│       ├── AddBookDialog.tsx            # shadcn Dialog wrapping the form
│       ├── AddBookForm.tsx              # fields, submit, error display
│       └── last-status.ts               # module-level last-used status (D2)
├── components/
│   ├── ui/                              # shadcn primitives (added by `npx shadcn add`)
│   └── EmptyShelf.tsx                   # empty state for first run
└── app/
    └── page.tsx                         # shelf page, server entry, mounts the client wrapper

tests/
├── validation/
│   └── book.test.ts                     # pure validator tests (TDD-first)
├── storage/
│   └── local-storage-adapter.test.ts    # adapter contract tests
└── features/
    └── add-book/
        ├── AddBookDialog.test.tsx       # form behavior
        └── useBookLibrary.test.ts       # store + adapter wiring
```

## 3. Data flow (happy path)

```
[Shelf page]
   │
   │ user clicks "Add book"
   ▼
[AddBookButton] ──opens──▶ [AddBookDialog]
                               │
                               │ user fills form
                               ▼
                         [AddBookForm] ── on submit ──▶ validateBookInput(input)
                               │                              │
                               │                              ▼
                               │                       (errors? → show inline)
                               │                              │ ok
                               ▼                              ▼
                       useBookLibrary().add(input) ──▶ storage.addBook(input)
                                                              │
                                                              ▼
                                                      LocalStorageAdapter
                                                              │
                                                              ▼
                                                    prepend to in-memory list
                                                              │
                                                              ▼
                                              close dialog + Sonner toast
```

## 4. Component breakdown

### `Book` (type, in `src/types/book.ts`)

```ts
export type ReadingStatus = 'want' | 'reading' | 'read';

export interface Book {
  id: string;            // UUID v4
  title: string;
  author: string;
  status: ReadingStatus;
  coverUrl?: string;
  tags: string[];        // normalized: lowercased, trimmed, deduped
  createdAt: string;     // ISO 8601
}

export type BookInput = Omit<Book, 'id' | 'createdAt'>;
```

### `StorageAdapter` (interface, in `src/storage/storage-adapter.ts`)

```ts
export interface StorageAdapter {
  listBooks(): Promise<Book[]>;
  addBook(input: BookInput): Promise<Book>;
}
```

### `LocalStorageAdapter` (impl)

- Storage key: `book-tracker:books` (versioned prefix for future migrations).
- `listBooks()`: `JSON.parse(localStorage.getItem(KEY) ?? '[]')`.
- `addBook(input)`: append to array, generate `id` via `crypto.randomUUID()`,
  set `createdAt = new Date().toISOString()`, persist, return the new book.
- Throws on quota / disabled — caller (dialog) handles the error.

### `validateBookInput(input: unknown): ValidationResult<BookInput>`

- Pure function. No React. No DOM.
- Returns `{ ok: true, value: BookInput }` or
  `{ ok: false, errors: { field: message } }`.
- Rules (per spec §6 FR-2, §9):
  - `title`: trim, 1–200 chars.
  - `author`: trim, 1–120 chars.
  - `coverUrl`: optional; if present, must match `^https?://`.
  - `tags`: split on `,`, trim, lowercase, drop empties, dedupe, cap at 10,
    each tag ≤ 24 chars.
  - `status`: must be one of `want | reading | read`.

### `useBookLibrary` (Zustand store)

```ts
interface BookLibraryState {
  books: Book[];                                  // sorted by createdAt desc
  status: 'loading' | 'ready' | 'error';
  init(adapter: StorageAdapter): Promise<void>;   // called once from the page
  addBook(input: BookInput): Promise<Book>;
}
```

- Created with `create<BookLibraryState>((set) => ({...}))` in
  `src/state/book-library.ts`.
- The store **does not own the adapter**. `init(adapter)` is called once
  from the page server-rendered shell (`'use client'` wrapper) with the
  concrete `LocalStorageAdapter`. This keeps the store pure and testable
  (each test can pass a fake adapter).
- `addBook` calls `this.adapter.addBook(input)`, prepends the returned
  `Book` to `books`, sets `status: 'ready'`. On thrown error, sets
  `status: 'error'` and rethrows so the dialog can show the inline error.
- No `BookLibraryProvider` component — Zustand stores have no provider.
  Components consume via `useBookLibrary(selector)` to subscribe only to
  the slice they need.

### `AddBookButton`

- Stateless shadcn `<Button>`. Props: `onClick`. Renders "Add book" label.
- Lives in the shelf header (top-right).

### `AddBookDialog`

- Wraps shadcn `<Dialog>`. Local state: `open`.
- Mounts `<AddBookForm onSuccess={close} />` when open.
- Reads `lastUsedStatus` from `last-status.ts` module on open, passes as
  initial value to the form (D2).

### `AddBookForm`

- Local state for fields + `errors` (from validator).
- Reads `useBookLibrary(s => s.addBook)` — narrow selector, only re-renders
  if `addBook` reference changes (it doesn't).
- `lastUsedStatus` written to module-level store on successful submit.
- On submit:
  1. `validateBookInput(formState)` → if errors, render them inline, abort.
  2. `await addBook(value)` — on success: emit `onSuccess()`, Sonner toast
     `Added "<title>"` (D3).
  3. On thrown error: show inline form error ("Couldn't save. Your browser
     storage is full or disabled."), **do not** clear fields (FR-7).
- Submit button disabled until required fields valid (FR-2).

### `EmptyShelf`

- Shown when `useBookLibrary(s => s.status) === 'ready' &&
  useBookLibrary(s => s.books).length === 0`.
- Centered illustration (placeholder block for now) + "Add your first book"
  CTA that opens `AddBookDialog`.

## 5. Storage adapter changes

**New interface** `StorageAdapter` (no existing interface to amend — this is
the first storage consumer). Two methods only:

```ts
listBooks(): Promise<Book[]>;
addBook(input: BookInput): Promise<Book>;
```

`updateBook` and `removeBook` are deliberately **not** added here — they'll
arrive with their own specs and grow the interface incrementally (constitution
§3 "no premature abstractions").

The adapter is **persistence only** — it does not own in-memory state. The
Zustand store owns the in-memory list and delegates persistence to the
adapter. This separation is what makes the future HTTP adapter a drop-in
replacement.

## 6. Decisions & trade-offs

- **D-P1. Zustand for the books store, not React Context.** Once a second
  consumer (shelf, dialogs, stats) appears, Context re-renders all
  subscribers on every mutation. Zustand's `useStore(selector)` keeps each
  consumer subscribed to a slice. 1KB cost, no provider boilerplate, no
  future migration. We pay the dep cost once.
- **D-P2. No `react-hook-form` / `zod`.** Five fields, all simple. The pure
  validator (`validateBookInput`) is the seam for future zod adoption if
  forms grow. Trade-off: more boilerplate in the component.
- **D-P3. Pure validator, errors returned by field.** Makes TDD trivial and
  keeps the form dumb. Reuses the same validator for any future "edit book"
  form.
- **D-P4. Versioned localStorage key** (`book-tracker:books`). Cheap
  insurance for the future migration to backend.
- **D-P5. UUID via `crypto.randomUUID()`.** Available in all evergreen
  browsers + Node 19+. No `uuid` package.
- **D-P6. Vitest** as the test runner. Native ESM, fast, first-class
  TypeScript, integrates with Next.js's testing-tooling story. Decision
  recorded for future specs.
- **D-P7. Tailwind v4 (not v3).** No `tailwind.config.ts` — design tokens
  live in `@theme` inside `src/app/globals.css`, alongside the shadcn
  CSS-variable bridge. PostCSS plugin is `@tailwindcss/postcss`. Rationale:
  v4 is the current major; tokens stay in one file (no JS↔CSS drift);
  the cozy palette is a single source of truth, not split between config
  and CSS.

## 7. Risks

- **localStorage disabled (Safari private mode, full quota).** Adapter
  throws; dialog surfaces a clear error (spec FR-7). Not retried
  automatically — user must act.
- **Cross-tab stale data.** Two tabs both writing is out of scope. We will
  not implement `storage` event listeners in this spec.
- **JSON.parse of corrupt localStorage.** Adapter catches and treats as
  empty array, logs a warning. We won't proactively try to recover.
- **Hydration mismatch** if SSR somehow reads from `window`. The
  `useBookLibrary` store and its `init(adapter)` call run only inside a
  `'use client'` wrapper at the page root; the shelf page is a thin
  server component.

## 8. Rollout

- No feature flag, no migration (this is the first writer).
- Manual QA:
  1. Empty shelf → CTA appears.
  2. Add a valid book → dialog closes, book shows at top, toast appears.
  3. Reload → book still there.
  4. Try invalid inputs (empty title, bad URL, 11 tags) → inline errors,
     dialog stays open.
  5. Open two tabs, add in each → each tab sees only its own write (known
     limitation, not a bug for MVP).
- Verification gates: `npm run lint && npm run test` pass; spec §10
  acceptance criteria all ticked.
