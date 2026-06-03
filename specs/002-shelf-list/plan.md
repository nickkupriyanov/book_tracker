# Plan: Shelf List

> **Status:** Approved
> **Spec:** `../spec.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-02

---

## 1. Architecture summary

The shelf is a **read-only consumer** of the existing Zustand store
(`useBookLibrary`). It adds a small feature folder
(`src/features/shelf-list/`) with three components and three new shadcn
primitives. Filter state is **local** (per spec §12 D4), not in the store.

The page wiring changes minimally: `ShelfClient` already selects
`books` and `status`; it just swaps the "You have N books" placeholder
for `<ShelfList books={books} />` when `books.length > 0`.

## 2. Module / file layout

```
src/features/shelf-list/
├── ShelfList.tsx            # orchestrator: filter state, counts, grid
├── BookCard.tsx             # single book card (presentational)
├── ShelfFilters.tsx         # tabs with counts
├── EmptyFilterResult.tsx    # "No books with this status."
└── index.ts                 # barrel

src/components/ui/
├── card.tsx                 # shadcn add card
├── tabs.tsx                 # shadcn add tabs
└── badge.tsx                # shadcn add badge

tests/features/shelf-list/
├── BookCard.test.tsx        # cover fallback, tag overflow
├── ShelfFilters.test.tsx    # counts display, onChange, active state
└── ShelfList.test.tsx       # filtering, empty filter result
```

Modifications:
- `src/app/ShelfClient.tsx` — replace "You have N books" with `<ShelfList />`.

## 3. Data flow

```
[ShelfClient]                              (existing)
  - books  = useBookLibrary(s => s.books)  (existing)
  - status = useBookLibrary(s => s.status) (existing)
  - renders <ShelfList books={books} />   (NEW) when books.length > 0

[ShelfList]                                (new)
  - props:  { books: Book[] }
  - state:  filter: 'all' | ReadingStatus  (default 'all', local)
  - counts = computeCounts(books)           (memo)
  - filtered = filter === 'all' ? books : books.filter(b => b.status === filter)
  - renders:
      <ShelfFilters value={filter} onChange={setFilter} counts={counts} />
      {filtered.length === 0
        ? <EmptyFilterResult />
        : <Grid>{filtered.map(b => <BookCard book={b} />)}</Grid>}

[BookCard]                                 (new, pure)
  - props:  { book: Book }
  - state:  coverFailed: boolean (local, default false)
  - renders: cover <img onError={...} /> with placeholder div behind;
             title, author, status pill (custom span), tags as Badge

[ShelfFilters]                             (new)
  - props:  { value, onChange, counts }
  - renders: <Tabs> with 4 <TabsTrigger>: All / Want / Reading / Read
             each showing label + count

[EmptyFilterResult]                        (new, pure)
  - renders: muted "No books with this status." message
```

## 4. Component breakdown

### `ShelfList`
- **Props:** `{ books: Book[] }`.
- **State:** `filter: 'all' | ReadingStatus` via `useState<'all' | ReadingStatus>('all')`.
- **Derived:** `counts: Record<ReadingStatus | 'all', number>` via `useMemo`.
- **Renders:** filters block + grid (or empty-filter result).
- **Tests:** filtering by each status; empty filter result; default 'all'.

### `BookCard`
- **Props:** `{ book: Book }`.
- **State:** `coverFailed: boolean` via `useState(false)`. Flipped to `true`
  on `<img>` `onError`.
- **Renders:**
  - Cover block: aspect-ratio 2:3 div. If `book.coverUrl` is set and
    `!coverFailed`, show `<img src={...} alt={book.title} />`. Otherwise
    show placeholder (BookOpen icon, muted background).
  - Title (serif, `truncate`).
  - Author (`text-muted-foreground`, `truncate`).
  - Status pill (custom `<span>` with variant classes, see D-P4).
  - Tags: first 3 + "+N" overflow. Each tag is a shadcn `Badge` (variant
    `secondary` or `outline`).
- **Tests:** cover fallback fires on `onError`; tag overflow with
  4+ tags shows "+N"; missing `coverUrl` shows placeholder.

### `ShelfFilters`
- **Props:** `{ value: FilterValue, onChange: (v: FilterValue) => void,
  counts: { all: number; want: number; reading: number; read: number } }`.
- **State:** none (controlled).
- **Renders:** shadcn `Tabs` with 4 `TabsTrigger`s. Label format:
  `All (N)`, `Want to read (N)`, `Reading (N)`, `Read (N)`.
- **Tests:** renders all 4 triggers with correct counts; clicking a
  trigger calls `onChange` with the new value; active trigger matches
  `value` prop.

### `EmptyFilterResult`
- **Props:** none.
- **State:** none.
- **Renders:** centered muted text "No books with this status."
- **Tests:** none (visual-only).

## 5. Storage adapter changes

None. The shelf is read-only on storage. `updateBook` and `removeBook` will
arrive with their own specs (Edit / Delete).

## 6. Decisions & trade-offs

- **D-P1. Filter state is local**, not in the store. Per spec §12 D4.
- **D-P2. Plain `<img>` for covers**, not Next.js `<Image>`. We don't
  need optimization for MVP (small library, no perf issue), and `<Image>`
  requires `next.config` `remotePatterns` config which adds setup.
  `onError` handles load failures cleanly.
- **D-P3. shadcn `Tabs` for filter UI**, not a custom button group.
  Tabs is the right semantic primitive. Adds one more shadcn component;
  we already have a working install path (T7).
- **D-P4. Status pill is a custom `<span>` with variant classes**, not
  shadcn `Badge`. shadcn Badge variants don't map cleanly to our 3
  status colors. Inline classes are clearer than a custom variant on top
  of Badge. Tags use `Badge` (variants fit: secondary for visible,
  outline for overflow).
- **D-P5. TDD-first** for `ShelfFilters` and `BookCard` (logic-heavy,
  branches). `ShelfList` integration is tested via the rendered output.
  `EmptyFilterResult` is visual-only, no tests (per constitution §4).
- **D-P6. No virtualization / pagination** for MVP. < 100 books assumed.
  If we ever see a real perf issue, it's a future spec.
- **D-P7. Add 3 shadcn primitives** (Card, Tabs, Badge). Manual deps
  install if CLI doesn't (per T7 lesson).

## 7. Risks

- **Cover CORS / hotlink blocking:** some hosts block hotlinking. The
  `<img>` fires `onError`, we swap to placeholder. No retry, no console
  noise.
- **Many books slow render:** acceptable for MVP. Virtualization later.
- **shadcn version drift:** Card/Tabs/Badge may have evolved. We install
  each, then verify by importing in a small test component.
- **Tab counts desync:** if `books` updates (new book added) while user
  is on a filter, counts update reactively (via Zustand selector). No
  drift.

## 8. Rollout

- No feature flag, no migration.
- Manual QA (per spec §10 + plan §8):
  1. Empty shelf → `EmptyShelf` (unchanged).
  2. Add 3 books (one per status) → all 3 cards in grid.
  3. Click "Reading" tab → 1 card visible, others hidden.
  4. Click "All" → all 3 visible.
  5. Add a "Want" book while on "Reading" filter → grid still 1, "Want"
     tab count = 2.
  6. Add a book with a broken `coverUrl` → placeholder shown.
  7. Reload page → filter resets to "All".
  8. Filter with 0 results → "No books with this status." message.
- Verification gates: `npm run lint && npm run test` pass, `tsc --noEmit`
  clean, `npm run build` succeeds. No new `any` introduced.
- New tests expected: ~10-15 (BookCard 4, ShelfFilters 3, ShelfList 5+).
