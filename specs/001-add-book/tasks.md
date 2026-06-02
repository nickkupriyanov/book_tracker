# Tasks: Add Book

> **Status:** In Progress
> **Spec:** `../spec.md` (`Approved`)
> **Plan:** `../plan.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-02

Each task is one commit. Mark a task `[x]` only when its acceptance line
is satisfied and `npm run lint && npm run test` pass.

Order matters: later tasks depend on earlier ones. T1–T6 are pure
foundation (no UI); T7–T12 are UI on top.

---

## T1. Bootstrap the project

- [x] **Files:** `package.json`, `tsconfig.json`, `next.config.*`,
  `postcss.config.mjs`, `.eslintrc.*`, `vitest.config.ts`,
  `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (placeholder).
- **Acceptance:**
  - `npm run dev` starts Next.js on `localhost:3000`, default page renders.
  - `npm run lint` passes.
  - `npm run test` runs Vitest (no tests yet, exit 0).
  - `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`.
  - Dependencies installed: `next`, `react`, `react-dom`, `typescript`,
    `tailwindcss@^4`, `@tailwindcss/postcss`, `postcss`, `zustand`, `vitest`,
    `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `eslint`,
    `eslint-config-next`, `@types/node`, `@types/react`, `@types/react-dom`.
  - **Tailwind v4 setup verified:** no `tailwind.config.ts` exists;
    `postcss.config.mjs` uses the `@tailwindcss/postcss` plugin;
    `globals.css` uses `@import "tailwindcss";` followed by an `@theme`
    block declaring the cozy warm palette (`--color-background`,
    `--color-foreground`, `--color-primary`, `--color-muted`, etc.) and
    the shadcn CSS-variable bridge (`--color-background` →
    `--background` etc. via `@theme inline`).
- [x] **Notes:** scaffold with `npx create-next-app@latest` (TypeScript, Tailwind
  v4, App Router, no `src/` toggle, no default ESLint). If the CLI ships
  Tailwind v3 by default, install `tailwindcss@^4` and `@tailwindcss/postcss`
  manually and replace the v3 files. Tokens live in `globals.css` only
  (plan D-P7). No shadcn/ui yet — comes in T7.

## T2. Domain types

- [x] **Files:** `src/types/book.ts`.
- **Acceptance:**
  - Exports `ReadingStatus` (`'want' | 'reading' | 'read'`).
  - Exports `Book` matching the spec §7 shape.
  - Exports `BookInput = Omit<Book, 'id' \| 'createdAt'>`.
  - No `any`. No `as` casts.
- [x] **Notes:** this file is the contract. Backend, when it arrives, conforms
  to these types. Edit here only via a spec amendment.

## T3. Pure validator (TDD)

- [x] **Files:** `src/lib/validation/book.ts`, `tests/validation/book.test.ts`.
- **Acceptance:**
  - `validateBookInput(input: unknown): ValidationResult<BookInput>`.
  - All rules from plan §4 are covered by tests (title length, author length,
    cover URL regex, tags normalize/dedupe/cap, status enum).
  - Test cases include: empty title, whitespace-only title, exactly-200-char
    title, 201-char title, valid http/https, bad URL (no scheme), 10 tags
    (ok), 11 tags (rejected), 24-char tag (ok), 25-char tag (rejected),
    `tags` of `""`/`"   "`/`","` → `[]`, mixed-case tags deduped.
  - Returns errors keyed by field name.
- [x] **Notes:** TDD-first: write failing tests, then implement. No React
  imports in this file.

## T4. Storage adapter interface

- [x] **Files:** `src/storage/storage-adapter.ts`.
- **Acceptance:**
  - Exports `StorageAdapter` interface with `listBooks(): Promise<Book[]>`
    and `addBook(input: BookInput): Promise<Book>`.
  - Re-exports types from `src/types/book.ts` as needed.
  - JSDoc on each method (1 line: what it does, what it throws).
- [x] **Notes:** no implementation yet. The interface is the seam for the future
  HTTP adapter.

## T5. LocalStorageAdapter (TDD)

- [x] **Files:** `src/storage/local-storage-adapter.ts`,
  `tests/storage/local-storage-adapter.test.ts`.
- **Acceptance:**
  - Implements `StorageAdapter`.
  - Uses `crypto.randomUUID()` for `id`; no `uuid` package.
  - Uses `new Date().toISOString()` for `createdAt`.
  - Storage key: `book-tracker:books`.
  - `listBooks()` returns `[]` when key is missing; returns `[]` and logs
    `console.warn` if `JSON.parse` throws.
  - `addBook()` appends and persists; returns the new `Book` with `id` and
    `createdAt` set.
  - Throws on `QuotaExceededError` (do not swallow).
  - Tests use a fresh `localStorage` stub per case (Vitest's `beforeEach`
    clearing).
- [x] **Notes:** TDD-first. The adapter is the only place that touches
  `localStorage` directly (constitution §3).

## T6. Zustand store (TDD)

- **Files:** `src/state/book-library.ts`, `tests/state/useBookLibrary.test.ts`.
- **Acceptance:**
  - `useBookLibrary` created with `create<BookLibraryState>(...)`.
  - State shape: `{ books: Book[], status: 'loading' | 'ready' | 'error',
    init(adapter), addBook(input) }`.
  - `init(adapter)` is idempotent (subsequent calls are no-ops).
  - `addBook(input)` calls the adapter, prepends the returned `Book` to
    `books` (sorted by `createdAt` desc — i.e. newest first), sets
    `status: 'ready'`, rethrows on adapter error so the dialog can show it.
  - `books` is empty and `status: 'loading'` until `init` resolves.
  - No React imports in the store file.
  - Tests use a fake `StorageAdapter` to avoid touching `localStorage`.
- **Notes:** no `BookLibraryProvider` — Zustand stores have no provider.
  Components consume via `useBookLibrary(selector)`.

## T7. shadcn/ui primitives

- **Files:** `components.json`, `src/components/ui/button.tsx`,
  `src/components/ui/dialog.tsx`, `src/components/ui/input.tsx`,
  `src/components/ui/label.tsx`, `src/components/ui/select.tsx`,
  `src/components/ui/sonner.tsx`, `src/app/layout.tsx` (add `<Toaster />`).
- **Acceptance:**
  - `npx shadcn@latest add button dialog input label select sonner` succeeds.
  - `Toaster` mounted in `layout.tsx`.
  - No raw HTML `<button>` / `<input>` / `<dialog>` in the app from this
    point on (constitution UI §1).
  - `npm run lint && npm run test` still pass.
- **Notes:** shadcn default theme is fine; we'll tint with our warm palette
  in `globals.css`. No glassmorphism classes (constitution §2).

## T8. AddBookButton

- **Files:** `src/features/add-book/AddBookButton.tsx`,
  re-export from `src/features/add-book/index.ts`.
- **Acceptance:**
  - Renders shadcn `<Button>` with text "Add book".
  - Props: `onClick: () => void`.
  - `data-testid="add-book-button"`.
- **Notes:** tiny, stateless. Lives in the shelf header.

## T9. last-status module

- **Files:** `src/features/add-book/last-status.ts`,
  `tests/features/add-book/last-status.test.ts`.
- **Acceptance:**
  - Exports `getLastStatus(): ReadingStatus` (default `'want'`).
  - Exports `setLastStatus(s: ReadingStatus): void`.
  - In-memory only; resets on full reload (D2 — by design).
  - Tested directly.
- **Notes:** satisfies spec §12 D2.

## T10. AddBookForm + AddBookDialog

- **Files:** `src/features/add-book/AddBookForm.tsx`,
  `src/features/add-book/AddBookDialog.tsx`,
  `tests/features/add-book/AddBookDialog.test.tsx`.
- **Acceptance:**
  - `AddBookDialog` is a `'use client'` shadcn `<Dialog>`.
  - Reads `lastUsedStatus` on open (D2) and passes as initial value.
  - `AddBookForm` fields: title, author, status (Select), coverUrl, tags.
  - Submit disabled until `title` and `author` are non-empty (after trim).
  - On submit: `validateBookInput(formState)` → inline errors per field;
    aborts without closing the dialog.
  - On `ok`: `await addBook(value)`; close dialog; `toast.success('Added "<title>"')`;
    write `setLastStatus(value.status)`.
  - On thrown error: inline form error "Couldn't save. Your browser
    storage is full or disabled."; **do not** clear fields (FR-7).
  - Tests cover: submit disabled state, validation errors, successful add,
    storage error path, lastUsedStatus read/write.
- **Notes:** no `react-hook-form` / `zod` (plan D-P2). Pure validator is the
  seam.

## T11. EmptyShelf

- **Files:** `src/components/EmptyShelf.tsx`.
- **Acceptance:**
  - Shows centered placeholder block + heading "Your shelf is empty" + an
    "Add your first book" CTA.
  - CTA opens `AddBookDialog` (lifts its own open state).
- **Notes:** no tests (visual-only component, constitution §4 — visual
  components get tests only when behavior is non-obvious).

## T12. Shelf page wiring

- **Files:** `src/app/page.tsx`, `src/app/ShelfClient.tsx`.
- **Acceptance:**
  - `page.tsx` is a server component that renders `<ShelfClient />`.
  - `ShelfClient` is `'use client'`, instantiates
    `new LocalStorageAdapter()`, calls `useBookLibrary.getState().init(adapter)`
    in a `useEffect`, manages the `AddBookDialog` open state.
  - Renders `AddBookButton` (top-right), `EmptyShelf` when books is empty,
    otherwise renders the (future) list (for now: a placeholder showing
    the count: `"You have N books."`).
  - No hydration warnings in the browser console.
- **Notes:** this is the integration point. Once T12 passes, the spec §10
  acceptance criteria 1–6, 8 are checkable end-to-end. (Criterion 7 — no raw
  HTML — is enforced by T7 + lint.)

## T13. Polish & verification

- **Files:** (no new code, possibly `src/app/globals.css` tweaks).
- **Acceptance:**
  - All spec §10 acceptance criteria are manually verified (per plan §8 QA
    steps).
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes.
  - `tsc --noEmit` (or `next build`) passes.
  - No `any` / `as any` in the diff (`rg " any\b" src/` returns only
    type-annotation noise like `anyOf`, none from our code).
  - No raw HTML controls introduced after T7.
  - Update this file: tick all `[x]`s, set Status to `Done`.
- **Notes:** the verification gate. If anything in §10 fails, open a
  follow-up task — don't silently expand the scope.
