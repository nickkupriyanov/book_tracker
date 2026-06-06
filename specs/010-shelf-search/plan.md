# Plan: Shelf Search & Filter

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Author:** —
> **Created:** 2026-06-06

---

## 1. Architecture summary

The shelf already filters by status (spec 002 D4 — a Tabs row with
counts). This spec adds two more filter dimensions — a free-text
search across `title` / `author` / `tag values` and a multi-select
tag chip filter — and combines all three with AND. The shape of
`Book`, the `StorageAdapter` interface, and the store all stay
unchanged. Filter state lives in `ShelfList`'s local `useState`
hooks and is not persisted (per spec 002 D4, per spec 010 D5).

The single architectural decision (D7) is the **pure-function core
+ dumb UI** split: `filterBooks(books, criteria)` in `src/lib/`
takes plain data in and returns plain data, with no React or DOM
dependencies. The new UI components (`ShelfSearch`, `ShelfTagFilter`)
are controlled and dumb: they read a value, render it, and call
`onChange` / `onToggle` upward. `ShelfList` owns the criteria state
and the `useMemo`-cached filter result.

The smallest reasonable footprint:

- 1 new pure function (`filterBooks`),
- 2 new controlled components (`ShelfSearch`, `ShelfTagFilter`),
- 1 component with copy change (`EmptyFilterResult`),
- 1 component wired up with new state and a `useMemo`
  (`ShelfList`),
- 0 new domain types beyond the `FilterCriteria` interface,
- 0 new `StorageAdapter` methods,
- 0 new dependencies.

## 2. Module / file layout

```
src/lib/
├── shelf-filter.ts            # NEW: filterBooks + FilterCriteria + private helpers
└── shelf-filter.test.ts       # NEW: TDD, co-located (per spec 008 D-P1)

src/features/shelf-list/
├── ShelfList.tsx              # MODIFIED: + search useState, + selectedTags useState,
│                              #          + allTags useMemo, + filteredBooks useMemo,
│                              #          + render <ShelfSearch> and <ShelfTagFilter>
├── ShelfFilters.tsx           # unchanged (status tabs)
├── ShelfSearch.tsx            # NEW: controlled shadcn Input
├── ShelfTagFilter.tsx         # NEW: multi-select Badge chips
├── BookCard.tsx               # unchanged
├── StatusPill.tsx             # unchanged
├── EmptyFilterResult.tsx      # MODIFIED: copy change
└── index.ts                   # MODIFIED: export the two new components (optional)
                              #          — ShelfList is the public surface; the
                              #          children are only used by it

tests/features/shelf-list/
├── ShelfSearch.test.tsx       # NEW: ~3 RTL tests
├── ShelfTagFilter.test.tsx    # NEW: ~4 RTL tests
└── ShelfList.test.tsx         # MODIFIED: ~4-5 integration tests added;
                              #             existing tests still pass
```

Co-located test for the pure function, RTL tests under
`tests/features/` (the project convention for components). Mirrors
spec 008's split: pure functions co-locate, components go under
`tests/`.

## 3. Data flow

Happy path for **searching the shelf**:

```
[Detail page]   user navigates to /
[ShelfClient]   reads books from useBookLibrary.getState()
                <ShelfList books={books} />

   ShelfList owns:
     filter       = useState<FilterValue>("all")          // existing
     search       = useState<string>("")                  // NEW
     selectedTags = useState<string[]>([])                // NEW

   allTags = useMemo(
     () => Array.from(new Set(books.flatMap(b => b.tags))).sort(),
     [books]
   )

   filteredBooks = useMemo(
     () => filterBooks(books, { search, tags: selectedTags, status: filter }),
     [books, search, selectedTags, filter]
   )

   renders:
     <ShelfSearch value={search} onChange={setSearch} />
     <ShelfFilters value={filter} onChange={setFilter} counts={counts} />
     <ShelfTagFilter tags={allTags} selected={selectedTags}
                     onToggle={(t) => setSelectedTags(prev =>
                       prev.includes(t) ? prev.filter(x => x !== t)
                                        : [...prev, t])} />
     {filteredBooks.length === 0
        ? <EmptyFilterResult />
        : <div className="grid …"> {/* BookCard per filtered book */} </div>}
```

No state changes propagate to the store. The store is read-only here
(it's been loaded in `RootClient` and `init`d by the time the shelf
renders). The filter is a pure read-side transform.

## 4. Component breakdown

### `filterBooks` (NEW, in `src/lib/shelf-filter.ts`)

- **Signature:**
  ```ts
  export interface FilterCriteria {
    search: string;
    tags: string[];
    status: "all" | ReadingStatus;
  }
  export function filterBooks(books: Book[], criteria: FilterCriteria): Book[]
  ```
- **Behaviour:**
  - `parseSearchTokens(raw)`: trim → lowercase → split on
    `\s+` → drop empty entries. Returns `[]` for empty / whitespace.
  - `matchesStatus(book, status)`: `status === "all"` → `true`;
    else `book.status === status`.
  - `matchesTags(book, selected)`: `selected.length === 0` → `true`;
    else `selected.some(t => book.tags.includes(t))` (OR within).
  - `matchesSearch(book, tokens)`: `tokens.length === 0` → `true`;
    else every token must `toLowerCase()`-substring-match at least
    one of: `book.title`, `book.author`, any string in `book.tags`.
- **Tests:** ≥ 12 in co-located `shelf-filter.test.ts`:
  1. empty criteria → all books
  2. single token in title
  3. single token in author
  4. single token in tag value
  5. multi-token AND (one matches, one doesn't → exclude)
  6. case-insensitive (uppercase query, lowercase data)
  7. whitespace handling (leading/trailing/repeated spaces)
  8. empty tag filter → all books
  9. single-tag match
  10. multi-tag OR
  11. status filter alone
  12. all three combined (status + tags + search)
  13. no-match returns `[]`
  14. books with empty `tags` array don't crash the search

### `ShelfSearch` (NEW, in `src/features/shelf-list/`)

- **Props:**
  ```ts
  interface ShelfSearchProps {
    value: string;
    onChange: (next: string) => void;
  }
  ```
- **Renders:**
  ```tsx
  <Input
    type="search"
    placeholder="Search title, author, or tag…"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label="Search books"
    data-testid="shelf-search"
  />
  ```
- **Tests:** ≥ 3 in `tests/features/shelf-list/ShelfSearch.test.tsx`:
  - renders with empty value, shows the input
  - renders the supplied value
  - calls `onChange` with the new value on user input
  - has the right `aria-label` and `data-testid`

### `ShelfTagFilter` (NEW, in `src/features/shelf-list/`)

- **Props:**
  ```ts
  interface ShelfTagFilterProps {
    tags: string[];                  // sorted, deduped (parent pre-computes)
    selected: string[];
    onToggle: (tag: string) => void;
  }
  ```
- **Renders:**
  ```tsx
  tags.length === 0
    ? null
    : <div className={tags.length > 20
        ? "overflow-x-auto whitespace-nowrap"
        : "flex flex-wrap gap-1"}
       data-testid="shelf-tag-filter">
        {tags.map(tag => (
          <button
            key={tag}
            type="button"
            role="checkbox"
            aria-checked={selected.includes(tag)}
            onClick={() => onToggle(tag)}
            data-testid={`shelf-tag-${tag}`}
            className="focus:outline-none focus-visible:ring-2"
          >
            <Badge variant={selected.includes(tag) ? "secondary" : "outline"}>
              #{tag}
            </Badge>
          </button>
        ))}
      </div>
  ```
- **Notes:**
  - The wrapping `<button>` is required for keyboard activation
    (Enter / Space); the inner `Badge` is purely visual. Without
    the `<button>`, the `Badge` is a non-interactive `<span>`.
  - `role="checkbox"` + `aria-checked` follows the
    shadcn `Toggle` pattern (spec 008 D-P3). The Badge's
    `variant` change is the visible pressed state.
  - The `overflow-x-auto` is `>= 20` tags per spec D3.
- **Tests:** ≥ 4 in `tests/features/shelf-list/ShelfTagFilter.test.tsx`:
  - renders nothing when `tags` is `[]`
  - renders one chip per tag with `#` prefix
  - calls `onToggle(tag)` when a chip is clicked
  - selected chips have `aria-checked="true"` and the `secondary`
    variant; unselected have `aria-checked="false"` and `outline`
  - when `tags.length > 20`, the wrapper has `overflow-x-auto`

### `EmptyFilterResult` (MODIFIED, copy only)

- **Change:** text from `"No books with this status."` to
  `"No books match your filters."` (per spec §4 D6).
- **No structural change**, no new prop, no new state.
- **Test:** update the existing assertion in
  `tests/features/shelf-list/` (if any) to match the new copy.

### `ShelfList` (MODIFIED, state and rendering)

- **State additions:**
  ```ts
  const [search, setSearch] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  ```
- **Memoised values:**
  ```ts
  const allTags = useMemo(
    () => Array.from(new Set(books.flatMap((b) => b.tags))).sort(),
    [books]
  );

  const filteredBooks = useMemo(
    () => filterBooks(books, { search, tags: selectedTags, status: filter }),
    [books, search, selectedTags, filter]
  );
  ```
- **Render change:** the existing `filteredBooks` const is
  replaced with the memoised version. `<ShelfFilters>` stays
  where it is. The new `<ShelfSearch>` goes **above** the
  status tabs, and `<ShelfTagFilter>` goes **below** them,
  per the layout in spec §6.1.
- **`onToggle` handler** for `ShelfTagFilter`:
  ```ts
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);
  ```
  `useCallback` is not strictly needed (the parent is `ShelfList`
  itself, no memoised child cares) but it's good hygiene and
  keeps the `onToggle` reference stable for any future memoised
  child.
- **Edit / Delete dialog wiring:** unchanged. They are siblings
  of the filter row inside the outer `space-y-6` div.
- **Tests:** existing 4-5 tests in
  `tests/features/shelf-list/ShelfList.test.tsx` continue to
  pass with no change (they exercise the status filter and
  dialogs, not the new search/tag filter). New tests:
  - search input is visible
  - typing in search narrows the grid (assertion: only matching
    `BookCard`s render)
  - clicking a tag chip narrows the grid
  - all three filters combined → only AND-matching books render
  - zero matches → `EmptyFilterResult` shows the new copy

## 5. Storage adapter changes

**None.** `StorageAdapter` keeps its four methods
(`listBooks`, `addBook`, `updateBook`, `deleteBook`). The new
filtering is a pure read-side operation in the UI layer; the
store is consulted once in `ShelfClient` to get the books, and
then `ShelfList` operates on the resulting array.

`LocalStorageAdapter` is unchanged. The new `search` and
`selectedTags` state is local React state, not persisted.

## 6. Decisions & trade-offs

- **D-P1. `filterBooks` is co-located with its test
  (`src/lib/shelf-filter.test.ts`), not in `tests/`.** Pure-function
  modules live next to their tests in the React community
  convention. Mirrors `src/lib/rich-text/walker.tsx` /
  `walker.test.tsx` from spec 008. UI components go under
  `tests/features/`.
- **D-P2. `FilterCriteria` lives in `src/lib/shelf-filter.ts`,
  not in `src/types/`.** It is a UI-layer concern (combines
  fields the user controls), not a domain type. The domain
  `Book` stays untouched. If a future spec needs to send a
  filter to a server, the server will receive a serialised
  form of this interface; the interface name and shape are
  stable enough to be exported from the same file as the
  function.
- **D-P3. Tag chip uses a wrapping `<button>` around a `Badge`,
  not a `<Badge onClick>`.** `Badge` from shadcn is a
  non-interactive `<span>`. Wrapping in a `<button>` gives
  keyboard activation (Enter / Space), focus ring, and screen
  reader semantics for free. The `Badge` stays as the visual
  surface.
- **D-P4. No `useDeferredValue` or `useTransition`.** The
  filter is sync and O(n × m). React 18's concurrent
  primitives are overkill here; revisit if the filter ever
  takes > 16 ms in practice.
- **D-P5. `useMemo` on `allTags` and `filteredBooks` is
  defensive, not load-bearing.** A future child component
  might be memoised; recomputing `allTags` (which iterates all
  books) on every keystroke would be wasted work. The cost of
  the memo is one dependency array; the benefit is correctness
  if anyone ever adds a `React.memo` downstream.
- **D-P6. No URL persistence, no debounce, no Clear-all
  button.** Spec §3 and §4 D5/D7 — all three are deliberate
  scope decisions, not omissions. Each has a written
  justification in the spec's appendices.

## 7. Risks

- **Bundle size.** None. The new code is React state + a
  pure function + two small presentational components. No new
  dependencies, no new heavy primitives.
- **Many tags (>100).** The chip row scrolls horizontally
  (D3). With > 100 tags, scrolling 5+ viewports wide is
  annoying but not broken. A future spec could collapse to
  the N most-used tags with a "+more" popover, but YAGNI for
  MVP.
- **Tag with internal whitespace.** Already ruled out by
  `validateTags` (spec 002 / spec 003). A tag is a single
  trimmed+lowercased string; the validator splits on `,`,
  not on whitespace. Spec §10 documents this.
- **Search input + `Book.review` in the future.** When a
  future spec adds review-text search, the `filterBooks`
  signature might need to grow a `searchReview: boolean` or
  a new `searchableText` field on `Book`. The current
  signature is small enough that the change is local. Risk:
  low.
- **A tag with very short length (e.g. `"a"`) makes search
  noisy.** A search for `a` would match almost every book
  with that tag. Mitigation: `validateTags` already
  enforces `1 ≤ length ≤ 24` per tag, so a single-letter
  tag is possible. The user chose it; the filter honours
  it. No "min query length" — that would surprise the user
  when searching for an actual single-letter title (rare but
  legal). Acceptable.
- **`allTags` recomputes on every book change.** That's the
  intent (add/remove a book updates the chip row), and the
  cost is O(n × k) where k = max tags per book (10 per
  spec 002). At 1 000 books × 10 tags = 10 000 iterations.
  Imperceptible.

## 8. Rollout

- **No migration, no flag, no `StorageAdapter` change.**
- **Manual QA (per spec §13, 15 steps):**
  1. Shelf with 0 books — `EmptyShelf` unchanged.
  2. Shelf with 5 books, no tags — chip row hidden.
  3. Shelf with 25 unique tags — chip row scrolls
     horizontally.
  4. Type `tol` → only books with "tol" in title/author/tag.
  5. Type `tol fantasy` → only books matching both tokens.
  6. Click a tag chip → variant flips to `secondary`, grid
     narrows.
  7. Click a second tag → OR within tags; books with either
     remain.
  8. Search + tag + status all active → only AND matches.
  9. Zero matches → `EmptyFilterResult` shows the new copy.
  10. Clear search (backspace) → grid widens (or stays
      narrow if tag / status still active).
  11. Click a selected tag → deselects; grid widens.
  12. Reload page → all filters reset.
  13. Edit / Delete dialogs still work (regression sanity).
  14. Add a book with a new tag → new chip appears.
  15. Remove the only book carrying a tag → that chip
      disappears (or, if selected, no longer affects grid).
- **Verification:** `npm run lint && npm run test` pass;
  `tsc --noEmit` clean; `npm run build` succeeds; no new
  `any`; no new dependencies; manual QA checklist completed.
- **Expected test count after 010:** ~360
  (342 from spec 008 baseline + ~15–20 new from spec 010:
  `shelf-filter.test.ts` ~14, `ShelfSearch.test.tsx` 3,
  `ShelfTagFilter.test.tsx` 4, `ShelfList.test.tsx` +4-5).
