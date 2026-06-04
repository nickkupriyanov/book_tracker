# Tasks: Detail View

> **Status:** Draft
> **Spec:** `../spec.md`
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task `[x]`
only when its acceptance line is satisfied and
`npm run lint && npm run test` pass.

Order matters: T1 lays the small foundational components (used
by both this spec and future specs), T2–T4 build the visual
pieces, T5 wires the card title, T6 is the orchestrator that
brings it all together, T7 polishes and verifies.

---

## T1. `DetailSection`, `DetailNotFound`, `DetailLoading` (small UI primitives)

- [x] **Files:**
  `src/features/detail-view/DetailSection.tsx` (new),
  `src/features/detail-view/DetailNotFound.tsx` (new),
  `src/features/detail-view/DetailLoading.tsx` (new),
  `src/features/detail-view/index.ts` (new — barrel,
  exports nothing yet, or exports the three above),
  `tests/features/detail-view/DetailSection.test.tsx` (new),
  `tests/features/detail-view/DetailNotFound.test.tsx` (new),
  `tests/features/detail-view/DetailLoading.test.tsx` (new).
- **Acceptance:**
  - `DetailSection` is a presentational wrapper: takes
    `{ title: string; children: ReactNode }`, renders a
    `<section>` with an `<h2>` heading and the children
    below.
  - `DetailNotFound` renders a centred "Book not found."
    message and a shadcn `Button` wrapping a Next.js
    `<Link href="/">` with the text "Back to shelf".
  - `DetailLoading` renders a centred "Loading…" message.
    Same visual language as `DetailNotFound`.
  - `index.ts` exports all three.
  - Tests cover: `DetailSection` renders title + children
    (1 smoke test); `DetailNotFound` renders the back link
    to `/` (1 test); `DetailLoading` renders the loading
    message (1 test). Total: ≥ 3 tests.
- [x] **Notes:** these are the smallest components, no store
  or router coupling. `DetailSection` is the future-proofing
  wrapper per spec D7 — it exists now so future specs
  (rating, review, quotes, reading time) can import it
  without reworking the page.

## T2. `DetailHeader` (back link + Edit + Delete buttons)

- [x] **Files:**
  `src/features/detail-view/DetailHeader.tsx` (new),
  `tests/features/detail-view/DetailHeader.test.tsx` (new).
- **Acceptance:**
  - Props: `{ onEdit: () => void; onDelete: () => void }`.
  - Renders a flex row. Left: a shadcn `Button` styled as
    a link, with a `ChevronLeft` icon, "Back to shelf"
    text, wrapping a Next.js `<Link href="/">`. Right: an
    Edit button (with `Pencil` icon) and a Delete button
    (with `Trash2` icon, ghost variant,
    `hover:text-destructive`).
  - Clicking Edit calls `onEdit`. Clicking Delete calls
    `onDelete`. Clicking "Back to shelf" navigates to `/`
    (via the Next.js `<Link>`).
  - The component is purely presentational — no store
    coupling, no dialogs.
  - Tests cover: back link has `href="/"`, edit click
    invokes `onEdit`, delete click invokes `onDelete`,
    Edit and Delete buttons are present (≥ 3 tests).
- [x] **Notes:** uses `lucide-react` icons (`ChevronLeft`,
  `Pencil`, `Trash2` — all already available in the
  project's pinned `lucide-react@^1.17`).

## T3. `DetailMeta` (cover, title, author, status, tags, date)

- [ ] **Files:**
  `src/features/detail-view/DetailMeta.tsx` (new),
  `tests/features/detail-view/DetailMeta.test.tsx` (new).
- **Acceptance:**
  - Props: `{ book: Book }`.
  - Renders: cover (with fallback `BookOpen` placeholder,
    same `onError` pattern as `BookCard`); title as `<h1>`
    with `font-serif`; author as `<p text-muted-foreground>`;
    `StatusPill`; all tags as `Badge variant="secondary"`
    (no truncation); "Added on <en-GB long date>" from
    `book.createdAt` formatted with
    `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`.
  - Layout: cover on the left (desktop) / top (mobile),
    meta column on the right / below. Uses Tailwind
    responsive utilities (`flex-col md:flex-row` and
    sizing per plan §4 / DetailMeta).
  - Tests cover: all fields render with the right book
    data, fallback when `coverUrl` is missing, all tags
    shown (no truncation), date is formatted en-GB
    long (e.g. "1 June 2026") (≥ 4 tests).
- **Notes:** imports `StatusPill` from
  `@/features/shelf-list/StatusPill`. The date format is
  asserted via a known ISO input → known formatted output
  pair (e.g. `"2026-06-01T00:00:00.000Z"` →
  `"1 June 2026"` in en-GB long).

## T4. BookCard: title becomes `<Link>` to `/book/<id>`

- [ ] **Files:**
  `src/features/shelf-list/BookCard.tsx` (modified),
  `tests/features/shelf-list/BookCard.test.tsx` (modified).
- **Acceptance:**
  - The `<h3>` title is wrapped in a Next.js
    `<Link href={\`/book/${book.id}\`}>` with
    `hover:underline underline-offset-2`.
  - No other part of the card is clickable. The pencil
    and trash buttons keep their existing positions and
    behaviour.
  - Existing BookCard tests (21 cases from spec 004) still
    pass. The 3 Edit button tests and 4 Delete button
    tests are unaffected because the buttons are not
    inside the `<Link>` (or are they? — see T4 note
    below).
  - New tests cover: the title is a link with the right
    `href`; the cover, tags, and other body are not links
    (≥ 1 test).
- **Notes:** the existing card structure is:
  ```
  <Card>
    <div cover>
      <img or placeholder>
      <div action buttons row>   ← NOT inside the title link
        <Pencil /> <Trash2 />
      </div>
    </div>
    <CardContent>
      <h3>title</h3>            ← THIS becomes the link
      ...
    </CardContent>
  </Card>
  ```
  The action buttons are inside the cover div, not the
  title. The title `<h3>` is in `CardContent`, separately.
  So the Link wraps only the `<h3>`. No click conflict.

## T5. `BookDetail` orchestrator + `/book/[id]` route

- [ ] **Files:**
  `src/features/detail-view/BookDetail.tsx` (new),
  `src/features/detail-view/index.ts` (modified — export
  `BookDetail`),
  `src/app/book/[id]/page.tsx` (new),
  `tests/features/detail-view/BookDetail.test.tsx` (new).
- **Acceptance:**
  - `BookDetail` props: `{ bookId: string }`.
  - Reads `books` and `status` from `useBookLibrary` via
    narrow selectors. Derives `book` via
    `books.find((b) => b.id === bookId) ?? null`.
  - State: `editingBook: Book | null`,
    `deletingBook: Book | null` (both initial null).
  - Renders:
    - `<DetailLoading />` if `status === 'loading'`.
    - `<DetailNotFound />` if `book === null`.
    - Else: `<DetailHeader onEdit={…} onDelete={…} />` +
      `<DetailMeta book={book} />` +
      `<EditBookDialog …>` +
      `<DeleteBookDialog …>`.
  - Edit click sets `editingBook` to the book; the
    `EditBookDialog`'s `onOpenChange` resets to null.
  - Delete click sets `deletingBook` to the book; on
    success, the page navigates to `/` via
    `useRouter().push("/")`. The dialog's `onOpenChange`
    resets to null on close.
  - `/book/[id]/page.tsx` is a thin client wrapper that
    calls `useParams<{ id: string }>()` and renders
    `<BookDetail bookId={id} />`.
  - Tests cover: loading state, not-found state, found
    state, edit click opens EditBookDialog and saving
    updates the page, delete click opens DeleteBookDialog
    and confirming navigates to `/` (≥ 4 tests).
- **Notes:** Edit and Delete dialogs are imported from
  the existing `@/features/edit-book` and
  `@/features/delete-book` modules. No new state machine,
  no new dialogs. The `useBookLibrary` selectors are
  narrow (one field each) so the page only re-renders
  when those specific fields change.

## T6. Polish & verification

- [ ] **Files:** (no new code);
  `specs/005-detail-view/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 005 are verified
    manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (expected ~178–183 tests
    total: 163 from spec 004 + ~15–20 new from spec
    005).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds (the new route compiles
    and ships).
  - No new `any` introduced.
  - No new npm dependencies introduced.
  - No raw HTML controls where shadcn has an
    equivalent.
  - Update this file: tick all `[x]`s, set Status to
    `Done`.
- **Notes:** verification report goes here when the
  task is closed out.
