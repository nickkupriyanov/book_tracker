# Plan: Detail View

> **Status:** Approved
> **Spec:** `../spec.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-04

---

## 1. Architecture summary

Detail View introduces a new Next.js dynamic route
(`/book/[id]`) plus a `BookCard` title → `<Link>` change. The
page is a self-contained client component that reads from the
existing `useBookLibrary` store and owns its own Edit and
Delete dialogs. The shelf stays unchanged except for the title
becoming a link.

The biggest design call is **D1** (route, not dialog) — a
forward-looking decision driven by the upcoming rating, review,
quotes, and reading-time specs. The page is built section-based
from day one so each future spec drops in a new
`<DetailSection>` without reworking the layout (D7).

The detail flow is conceptually a **route + read + dialog
reuse**: ShelfList is unchanged; the user navigates via the
title link to `/book/<id>`; the page reads the book
reactively from the store; on Edit success the store updates
and the page re-renders; on Delete success the page navigates
back to `/`.

## 2. Module / file layout

```
src/app/
└── book/
    └── [id]/
        └── page.tsx                       # NEW: thin client wrapper

src/features/
├── detail-view/                           # NEW feature folder
│   ├── BookDetail.tsx                     # NEW: page-level logic
│   ├── DetailHeader.tsx                   # NEW: back link + Edit + Delete
│   ├── DetailMeta.tsx                     # NEW: cover, title, author, etc.
│   ├── DetailSection.tsx                  # NEW: reusable section wrapper
│   ├── DetailNotFound.tsx                 # NEW: not-found state
│   ├── DetailLoading.tsx                  # NEW: loading state
│   └── index.ts                           # NEW: barrel
└── shelf-list/
    └── BookCard.tsx                       # MODIFIED: title → <Link>

tests/
├── features/
│   ├── detail-view/                       # NEW folder
│   │   ├── BookDetail.test.tsx            # NEW: integration tests
│   │   ├── DetailHeader.test.tsx          # NEW
│   │   ├── DetailMeta.test.tsx            # NEW
│   │   ├── DetailNotFound.test.tsx        # NEW
│   │   └── DetailSection.test.tsx         # NEW: smoke test
│   └── shelf-list/
│       └── BookCard.test.tsx              # MODIFIED: title is a link
```

No deletions. No new domain types. No new storage or state
changes. No new npm dependencies — Next.js's `<Link>` is
already a dependency; `lucide-react` (already present) has
`ChevronLeft`.

## 3. Data flow

```
[BookCard]
  title → <Link href={`/book/${book.id}`}>
           → Next.js client-side navigation

[/book/[id] route]
  page.tsx (client component):
    params = useParams<{ id: string }>()
    return <BookDetail bookId={params.id} />

[BookDetail]
  reads useBookLibrary reactively:
    books, status

  - if status === 'loading'             → render <DetailLoading />
  - if bookId not in books              → render <DetailNotFound />
  - else                                 → render <DetailHeader /> + <DetailMeta />
                                          + <EditBookDialog /> + <DeleteBookDialog />

  state: editingBook, deletingBook (Book | null, both initial null)

  on Edit click   → setEditingBook(book)
  on Delete click → setDeletingBook(book)

[EditBookDialog] (existing, unchanged)
  on submit success → store updates → BookDetail re-renders
                      with the new book values (no manual reload)

[DeleteBookDialog] (existing, unchanged)
  on submit success → store removes the book → BookDetail
                      re-renders → book is gone → re-renders
                      DetailNotFound briefly, then... actually,
                      navigation kicks in (see below).

  on success → router.push("/")
                 → /book/<stale-id> is unmounted
                 → shelf page is shown (existing behaviour, may
                   be EmptyShelf if it was the last book)
```

The book data is read via a Zustand selector
(`useBookLibrary((s) => s.books)`) so the page re-renders
reactively when the store changes (after Edit, after Delete
from another tab, etc.). The `status` is read via
`useBookLibrary((s) => s.status)` for the loading state.

## 4. Component breakdown

### `page.tsx` (NEW, in `src/app/book/[id]/`)

- **Type:** client component (`"use client"`).
- **Renders:** a thin wrapper that calls
  `useParams<{ id: string }>()` and passes the `id` to
  `<BookDetail bookId={id} />`.
- **Why thin:** keeps the route file as a Next.js entry
  point and the actual logic in the feature folder, mirroring
  the `ShelfClient` + `page.tsx` pattern in `src/app/`.

### `BookDetail` (NEW, in `src/features/detail-view/`)

- **Props:** `{ bookId: string }`.
- **State:** `editingBook: Book | null`, `deletingBook: Book | null`.
- **Reads:** `useBookLibrary` — `books` (array), `status`
  (loading / ready / error).
- **Derived:** `book = books.find((b) => b.id === bookId) ?? null`.
- **Renders:**
  - `<DetailLoading />` if `status === 'loading'`.
  - `<DetailNotFound />` if `book === null`.
  - Else: `<DetailHeader onEdit={…} onDelete={…} />` +
    `<DetailMeta book={book} />` + the two dialogs.
- **No precedence rule needed:** the page has at most one
  open dialog (Edit OR Delete, not both at once), and there
  is no other page-level state to conflict with (D6).
- **Tests:** ≥ 4 (loading, not-found, found, edit+delete
  wiring).

### `DetailHeader` (NEW)

- **Props:** `{ onEdit: () => void; onDelete: () => void }`.
- **Renders:** flex row. Left: a shadcn `Button` styled
  like a link with a `ChevronLeft` icon, "Back to shelf"
  text, wrapping a Next.js `<Link href="/">`. Right: Edit
  button (with `Pencil` icon) and Delete button (with
  `Trash2` icon, ghost variant, `hover:text-destructive`).
- **Tests:** ≥ 3 (back link navigates to `/`, edit calls
  `onEdit`, delete calls `onDelete`).

### `DetailMeta` (NEW)

- **Props:** `{ book: Book }`.
- **Renders:**
  - **Cover:** `<img>` (or placeholder with `BookOpen`
    icon) — same pattern as `BookCard`. 2:3 aspect ratio,
    `w-64` on desktop, `w-full max-w-xs mx-auto` on mobile.
  - **Title:** `<h1>` with `font-serif`, the book's title.
  - **Author:** `<p>` with `text-muted-foreground`.
  - **Status:** `<StatusPill status={book.status} />`.
  - **Tags:** all `book.tags` as `<Badge variant="secondary">`,
    wrapped in a flex container. No truncation.
  - **Added on:** formatted with
    `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`
    applied to `book.createdAt`. Rendered below the tags as
    a `<p>` with `text-muted-foreground text-sm`.
- **Tests:** ≥ 4 (renders all fields, fallback for missing
  cover, all tags shown with no truncation, date is
  formatted en-GB).

### `DetailSection` (NEW)

- **Props:** `{ title: string; children: ReactNode }`.
- **Renders:** a `<section>` with a heading (`<h2>`,
  `font-serif`, muted) and the children below. Vertical
  spacing handled by the parent (`space-y-6` or similar).
- **Why it's here even with zero sections rendered:** future
  specs (rating, review, quotes, reading time) import this
  and drop in their content without reworking the page
  layout (D7).
- **Tests:** 1 smoke test (renders title + children).

### `DetailNotFound` (NEW)

- **Renders:** centred message "Book not found." and a
  shadcn `Button` wrapping a Next.js `<Link href="/">` with
  the text "Back to shelf". Same visual language as
  `EmptyShelf`.
- **Tests:** 1 (back link navigates to `/`).

### `DetailLoading` (NEW)

- **Renders:** centred "Loading…" message. Same visual
  language as `DetailNotFound` and `EmptyShelf`.
- **Tests:** 1 (renders the message).

### `BookCard` (MODIFIED)

- **Change:** wrap the `<h3>` title in a Next.js
  `<Link href={\`/book/${book.id}\`}>` and add a subtle
  hover state (`hover:underline underline-offset-2`).
- **No other change.** The pencil and trash icons keep
  their positions and behaviour. The cover and tags are not
  clickable.
- **Tests:** 1-2 new (the title is a link with the right
  href, the rest of the card is not).

## 5. Storage adapter changes

None. The page uses the existing `useBookLibrary` actions
through the existing `EditBookDialog` and `DeleteBookDialog`
components.

## 6. Decisions & trade-offs

- **D-P1. Route file is a thin client wrapper; logic lives
  in `BookDetail`.** Mirrors the `src/app/page.tsx` →
  `ShelfClient` pattern. Keeps the route file as a Next.js
  entry point.
- **D-P2. `BookDetail` reads `useBookLibrary` directly,
  no separate data hook.** Same pattern as `ShelfList`. The
  page is reactive to store changes for free.
- **D-P3. `DetailSection` is a "dumb" wrapper.** Takes
  `title` and `children`. Future specs compose their own
  sections (e.g. `<RatingSection />`) by importing the
  `Book` fields they need and wrapping them in
  `<DetailSection title="Rating">…</DetailSection>`. No
  state machine, no new dialogs, no layout rework.
- **D-P4. Edit and Delete dialogs are children of
  `BookDetail`, not of `ShelfList`.** The page owns the
  state. `ShelfList` stays unaware of the detail flow.
  Future specs that need a detail-like view (e.g. a future
  search results page) can do the same.
- **D-P5. `en-GB` locale is fixed for date formatting.**
  Honoring the browser locale is a future spec (D10). The
  formatter is deterministic across server and client, so
  no hydration mismatch.
- **D-P6. Migration: none.** No new fields, no new methods
  on `StorageAdapter`. Existing books are unaffected.
- **D-P7. `key={book.id}` on the page-level dialogs is
  unnecessary.** The page mounts once per route; Edit and
  Delete dialogs for the same book share the same page
  instance. If the `id` in the URL changes (e.g. user
  navigates to a different book without going back to the
  shelf), the page re-mounts anyway because the route
  changes.

## 7. Risks

- **Stale `id` on initial load.** If the user pastes a
  `/book/<id>` URL for a deleted book, the page renders
  "Book not found" (FR-9). Mitigated by the
  `DetailNotFound` component.
- **Cold-load on `/book/<id>`.** The store is `loading`
  until `init()` resolves from localStorage. The page
  renders `<DetailLoading />` during that window, then
  re-renders with the book or with "Book not found"
  depending on whether the book is in storage. The brief
  not-found flash is acceptable per spec §9.
- **SSR / hydration.** `Intl.DateTimeFormat("en-GB", …)` is
  deterministic across server and client, so no hydration
  mismatch on the date. Status filter pills and tag badges
  have no locale-dependent content.
- **Visual crowding of the page header.** Three elements
  (back link, Edit, Delete) on one row. Mitigation: ghost
  variant for all three, `size="sm"` for back link, the
  Edit and Delete are `variant="ghost" size="icon-sm"`.
  They sit on a single row with `justify-between`.
- **Empty tags array.** If `book.tags` is empty, the tag
  row renders nothing (or "No tags" muted text — TBD
  during T3 implementation). The spec doesn't mandate
  either; we'll pick whichever is calmer.
- **`<Link>` semantics inside a card with clickable
  buttons.** React Router / Next.js Link uses an `<a>` tag
  by default, and the pencil/trash buttons inside the card
  are `<button>`s. Stopping event propagation is not
  needed because clicking the buttons fires the button
  onClick, not the link. This is standard HTML behaviour
  (button click doesn't bubble through to the anchor
  because the event target is the button, not the anchor).

## 8. Rollout

- No feature flag, no migration.
- Manual QA (per spec §10):
  1. Shelf → click title on a book → detail page opens
     with all meta (cover, title, author, status, all
     tags, "Added on <date>").
  2. Page header: "Back to shelf" on the left, Edit +
     Delete on the right.
  3. Click Edit → EditBookDialog opens with current
     values. Change a field, save → page re-renders with
     updated values, no manual reload.
  4. Click Delete → DeleteBookDialog opens. Confirm →
     navigates to `/`; if last book, `EmptyShelf`.
  5. Paste a stale `/book/<id>` URL → "Book not found"
     with "Back to shelf" button.
  6. Click "Back to shelf" → returns to the shelf.
  7. On initial mount (cold session), `/book/<id>` shows
     "Loading…" briefly, then the book or "Book not
     found".
  8. Responsive: resize browser to mobile width → cover
     stacks above meta, both full-width.
  9. Regression: Add / Edit / Delete from the shelf still
     work.
  10. Card title on the shelf now has a subtle underline
      on hover.
- Verification: `npm run lint && npm run test` pass;
  `tsc --noEmit` clean; `npm run build` succeeds; no new
  `any`; no new npm dependencies.
- Expected test count: ~178–183 total (163 from spec 004
  + ~15–20 new from spec 005).
