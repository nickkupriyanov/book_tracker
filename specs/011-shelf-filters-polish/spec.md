# Spec: Shelf Filters — Polish

> **Status:** Implemented
> **Author:** —
> **Created:** 2026-06-06
> **Implemented:** 2026-06-06 (T1–T3)
> **Spec ID:** 011-shelf-filters-polish
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 010 (shelf search & filter)
> **Successor:** —

---

## 1. Problem

Spec 010 added a free-text search and a multi-select tag
filter to the shelf, on top of the existing status tabs. Two
UX gaps remain:

1. **The `ShelfFilters` status counts (`All (4)`,
   `Want to read (1)`, `Reading (1)`, `Read (2)`) are
   computed against the full library** and ignore the
   active search and tag filters. When the user types
   `tolkien` in the search box and the grid shows 1 book,
   the tabs still say `All (4)`. The numbers are honest
   about the library but misleading about what the user
   will see if they switch tabs.

2. **There is no way to reset all filters at once.** The
   search input has a native `×` (from `type="search"`),
   individual tag chips can be unclicked, and the status
   tab can be switched back to `All` — but the user must
   do all three manually. With three orthogonal filter
   dimensions, that's three places to look.

The fix in this spec is small and well-scoped: make the
status counts reflect the active search + tag filters
(so each tab answers "how many would I see if I
clicked?"), and add one `Clear filters` button that
resets all three dimensions.

## 2. Goals

- `ShelfFilters` counts reflect the active search + tag
  filters, not the full library.
- One-click reset of all filter state.
- Zero new dependencies. Zero changes to `Book`,
  `StorageAdapter`, or the store. No persistence.
- No regressions in the 010 acceptance criteria.

## 3. Non-goals (out of scope)

- An "untagged books" filter (deferred — see §4.1).
- Highlighting the active tab with a separate badge
  (the shadcn Tabs UI already highlights the active tab).
- Auto-switching the active tab when its count drops to 0
  (the user stays put and sees `EmptyFilterResult`).
- Persisting filter state to localStorage / URL
  (consistent with spec 010 D5).
- A "Clear all" confirmation dialog. The action is
  reversible by re-typing / re-clicking; no destructive
  consequence.
- Touching the edit / delete dialog state. The two dialogs
  are out of scope and unaffected.

## 4. Decisions

### 4.1. (carried from 010) Decisions that still hold

- **010-D1.** Search fields: `title`, `author`, tag
  *values* (not review text).
- **010-D2.** Tag filter UI: search input + multi-select
  chip row, OR within the tag set.
- **010-D3.** Search matching: tokens (whitespace-split),
  AND across tokens, case-insensitive.
- **010-D4.** Tag chip overflow: horizontal scroll when
  `tags.length > 20`; the row is hidden (`null`) when
  `tags.length === 0`.
- **010-D5.** Persistence: local-only (no `StorageAdapter`
  change, no URL params, no localStorage).
- **010-D6.** Empty result copy: `"No books match your
  filters."` (covers status + search + tags).
- **010-D7.** Approach: minimal — no debounce, no "Clear
  all" button (added in this spec), no URL params, no
  inline highlight.

### 4.2. New decisions for 011

- **011-D1.** `Clear filters` resets **everything**:
  `search → ""`, `selectedTags → []`, `filter → "all"`.
  The label says "all" — a partial reset would be
  surprising.
- **011-D2.** `Clear filters` is rendered in a new row
  **under** `ShelfTagFilter` (i.e. as the last child of
  the `ShelfList` `space-y-6` stack). It is **only
  visible** when at least one filter dimension is active:
  `search !== "" || selectedTags.length > 0 || filter !== "all"`.
  When all dimensions are clean, the row renders nothing.
- **011-D3.** `ShelfFilters` counts are computed with
  `search` and `selectedTags` applied but **not** `filter`:
  the count on a given tab is the number of books the
  user would see if they switched to that tab right now.
  Formula:
  ```ts
  counts[tab] = filterBooks(books, {
    search,
    tags: selectedTags,
    status: tab,
  }).length
  ```
  This reuses the existing pure function — no new
  counting code.
- **011-D4.** When the active tab's count drops to 0 due
  to search / tag filters, **the tab does not change**.
  The grid shows `EmptyFilterResult`. The user can
  switch tabs, clear filters, or relax the search
  manually.
- **011-D5.** No new "active filters" indicator next to
  the search input. The native browser `×` in
  `type="search"` is one indicator, the highlighted
  selected tag chips are another, the highlighted
  active status tab is a third, and the
  `Clear filters` button appearing is a fourth. Adding
  a fifth would be visual noise.
- **011-D6.** `Clear filters` is a shadcn `Button`
  (`variant="outline"`, `size="sm"`) with a lucide
  `X` icon and the text `"Clear filters"`. Wrapped in
  its own `flex justify-end` row.
- **011-D7.** After clicking `Clear filters`, focus is
  moved to the `ShelfSearch` input. The user can
  immediately start typing a new query. This is the
  expected pattern in Gmail, Notion, and Linear.
- **011-D8.** `ShelfList` does not introduce a new
  context, ref, or store. Filter state stays in three
  `useState` hooks plus a `useMemo` for `counts` (rebuilt
  to depend on `search` and `selectedTags`). The reset
  handler is a single function defined inline in
  `ShelfList`.
- **011-D9.** No `StorageAdapter` change. No URL param.
  No new dependency. No new domain type.

## 5. Functional requirements

### FR-1. `ShelfFilters` counts reflect search + tag filters
- The count shown on each `All`, `Want to read`,
  `Reading`, `Read` tab equals
  `filterBooks(books, { search, tags, status: tab }).length`
  for the current `search` and `tags`.
- Counts are recomputed in a `useMemo` keyed on
  `[books, search, selectedTags]`. The dependency on
  `filter` (status) is **not** in the array — the count
  for each tab is independent of which tab is active.
- When the search input is empty and no tags are
  selected, the counts match the current behaviour
  (full library counts) — no visual change for users
  who have never used search or tags.

### FR-2. `Clear filters` button
- Renders **only** when
  `search !== "" || selectedTags.length > 0 || filter !== "all"`.
- Renders a shadcn `Button` (`variant="outline"`,
  `size="sm"`) with `X` icon + `"Clear filters"` text.
- `data-testid="shelf-clear-filters"`.
- Lives in a new row inside the `ShelfList` `space-y-6`
  stack, **after** `ShelfTagFilter`.
- On click: sets `search → ""`, `selectedTags → []`,
  `filter → "all"`, then moves focus to the
  `ShelfSearch` input element.

### FR-3. Empty active tab
- If the active tab's count becomes 0 after search /
  tag filters change, the active tab is **not**
  changed. The grid renders `<EmptyFilterResult />`
  with the existing copy `"No books match your
  filters."` (spec 010 D6).

### FR-4. No new state, no new storage
- `ShelfList` still owns three `useState` hooks
  (`filter`, `search`, `selectedTags`).
- The `filterBooks` function is unchanged.
- `Book`, `FilterCriteria`, and `StorageAdapter` are
  unchanged.

## 6. UX

### 6.1. Layout (inside the `space-y-6` stack)

1. `<ShelfSearch … />` — unchanged (010).
2. `<ShelfFilters … />` — **counts** now depend on
   `search` and `selectedTags`. Tab list itself is
   unchanged.
3. `<ShelfTagFilter … />` — unchanged (010).
4. **New row.** Renders nothing when no filter is
   active. When at least one filter is active:
   ```tsx
   <div className="flex justify-end">
     <Button variant="outline" size="sm" …>
       <X /> Clear filters
     </Button>
   </div>
   ```
5. Either `<EmptyFilterResult />` or the grid of
   `<BookCard>`s over `filteredBooks` — unchanged
   (010).

### 6.2. Examples

**Example A — fresh state.**
- 10 books, 3 want / 4 reading / 3 read.
- `search=""`, `tags=[]`, `filter="all"`.
- Counts: `All (10) / Want to read (3) / Reading (4) / Read (3)`.
- `Clear filters` row renders nothing.

**Example B — search active, 2 hits, all read.**
- 10 books, search="tolkien", 2 matches, both `read`.
- `filter="all"`. Counts:
  - `All (2)`
  - `Want to read (0)`
  - `Reading (0)`
  - `Read (2)`
- Grid shows 2 `BookCard`s.
- `Clear filters` row is visible.

**Example C — user clicks `Reading` tab in example B.**
- `filter="reading"`. Counts (unchanged, since they
  don't depend on `filter`):
  - `All (2)`, `Want (0)`, `Reading (0)`, `Read (2)`.
- Active tab is now `Reading`. Count is 0. Grid
  renders `<EmptyFilterResult />`.
- `Clear filters` row is still visible.

**Example D — user clicks `Clear filters` in example C.**
- `search=""`, `tags=[]`, `filter="all"`.
- Counts return to: `All (10) / Want (3) / Reading (4) / Read (3)`.
- `Clear filters` row hides itself.
- Focus is on the `ShelfSearch` input.

## 7. Constraints

- The count on a tab must be **truthful at render time**
  and **not lag behind** keystrokes more than one render
  cycle (acceptable; React batches updates).
- The `Clear filters` button must never appear when
  nothing would change if clicked. Hidden when
  `search === "" && selectedTags.length === 0 && filter === "all"`.
- No new `any` (constitution §3.1).
- No new dependency. `lucide-react` already provides
  `X` (used elsewhere in the app).
- No regression in the 010 acceptance criteria.

## 8. Trade-offs

- **Counts ignore `filter` on purpose.** Showing the
  count for the active tab separately would be either
  trivial (the active tab is visible) or confusing
  (the user has to understand "this number is for the
  tab I'm on, the others are for the tabs I'm not
  on"). D3 is the simplest correct model.
- **Focus restoration is a small UX win but a real
  one.** After `Clear filters` the keyboard cursor
  would otherwise land in nowhere-land — the button
  itself disappears. Putting focus back on the search
  input is one line of code and matches the user's
  mental model: "I cleared, now let me type something
  new."
- **No "X of Y" indicator in `ShelfSearch`.** A label
  like `2 of 10` next to the input would tell the
  user how many books their search matches without
  looking at the tabs. We chose not to add it (D5)
  to avoid competing with the tab counts.
- **Counts recompute on every search keystroke.** The
  cost is `O(4 × n × m)` per keystroke, which for any
  realistic library (≤ 1 000 books) is < 1 ms. No
  debounce, no `useDeferredValue` (consistent with
  010 D-P4).

## 9. Open questions

None at draft time. All four follow-up questions
(user input) were resolved with the recommended
option.

## 10. Glossary

- **Filter dimensions.** Three independent axes:
  status (`All` / `Want` / `Reading` / `Read`),
  search (free text), and tag (multi-select).
- **Active filter.** A filter dimension with a
  non-default value. The `Clear filters` button is
  visible iff at least one dimension is active.
- **Count for a tab.** The number of books that would
  be shown if the user switched to that tab right
  now, given the current `search` and `tags`. Does
  **not** include the tab's own status as a filter.

## 11. Acceptance criteria

- [ ] `ShelfFilters` counts reflect the current
      `search` and `selectedTags`. The count on
      `All` equals `filteredBooks.length` (the actual
      grid size).
- [ ] When `search` and `selectedTags` are both
      empty (default state), the counts are
      **identical** to the 010 behaviour
      (full-library counts).
- [ ] When `search` is non-empty, the count on each
      tab is the number of books matching the search
      **and** that tab's status.
- [ ] When `selectedTags` is non-empty, the count on
      each tab is the number of books matching the
      tag set **and** that tab's status.
- [ ] The `Clear filters` button is **not in the
      DOM** (or renders `null`) when no filter is
      active.
- [ ] The `Clear filters` button is rendered when
      `search !== ""` is the only active filter.
- [ ] The `Clear filters` button is rendered when
      `selectedTags.length > 0` is the only active
      filter.
- [ ] The `Clear filters` button is rendered when
      `filter !== "all"` is the only active filter.
- [ ] Clicking `Clear filters` resets `search` to
      `""`, `selectedTags` to `[]`, and `filter` to
      `"all"` in one update.
- [ ] After clicking `Clear filters`, focus is on
      the `ShelfSearch` input.
- [ ] When the active tab's count becomes 0 due to
      search / tag filters, the active tab is
      unchanged and `<EmptyFilterResult />` is
      shown.
- [ ] The `Clear filters` button has the
      `data-testid="shelf-clear-filters"` attribute
      and an accessible name containing
      `"Clear filters"`.
- [ ] `npm run lint`, `npm run test`, and
      `npx tsc --noEmit` all pass.
- [ ] `npm run build` succeeds. No bundle delta to
      record (no new dependency).
- [ ] No new `any` is introduced.
- [ ] No new npm dependencies are added.
- [ ] All 010 acceptance criteria continue to hold
      (no regressions).

## 12. Out-of-scope deferrals

- **Untagged filter.** A separate "books with no
  tags" selector. Deferred; not requested in this
  spec. Would require expanding `FilterCriteria` with
  a new `untaggedOnly: boolean` field (or a tagged
  union) and adjusting the tag chip UI. Punted to a
  future spec.

## 13. Manual QA

To be run during the verification task (T6 of
implementation). 12 steps:

1. Fresh state (no filters active) — counts are
   library counts, `Clear filters` row is hidden.
2. Type a search that matches all 10 books — counts
   stay at `All (10) / …`. `Clear filters` row
   appears.
3. Type a search that matches 2 books (both `read`):
   counts are `All (2) / Want (0) / Reading (0) /
   Read (2)`. `Clear filters` row appears.
4. Switch to the `Reading` tab in step 3 — grid shows
   `EmptyFilterResult`. Counts unchanged.
5. Click one tag chip — counts update to reflect
   search + that tag. `Clear filters` row appears.
6. Click a second tag chip — counts update to
   reflect search + either tag (OR within tags).
7. Switch back to `All` in step 6 — grid shows the
   OR-matched books.
8. Click `Clear filters` — all filters reset, focus
   is on the search input, `Clear filters` row
   hides.
9. Reload the page — all filters are back to
   defaults (local state, not persisted).
10. Add a book — counts and the tag chip row
    update.
11. Delete the only book that carries a selected
    tag — the chip disappears; if it was the only
    active filter, `Clear filters` row hides.
12. Edit / Delete dialogs still work (regression
    sanity).

## Appendix A — Type contract

No new types. The existing contract is unchanged:

```ts
// unchanged
export interface FilterCriteria {
  search: string;
  tags: string[];
  status: "all" | ReadingStatus;
}
export function filterBooks(
  books: Book[],
  criteria: FilterCriteria
): Book[];
```

`ShelfList` retains its three `useState` hooks. The
only new derived value is:

```ts
const counts = useMemo<Record<FilterValue, number>>(
  () => ({
    all: filterBooks(books, { search, tags: selectedTags, status: "all" }).length,
    want: filterBooks(books, { search, tags: selectedTags, status: "want" }).length,
    reading: filterBooks(books, { search, tags: selectedTags, status: "reading" }).length,
    read: filterBooks(books, { search, tags: selectedTags, status: "read" }).length,
  }),
  [books, search, selectedTags]
);
```

## Appendix B — File layout (proposed for plan.md)

```
NEW
  src/features/shelf-list/ClearFilters.tsx
  tests/features/shelf-list/ClearFilters.test.tsx

MODIFIED
  src/features/shelf-list/ShelfList.tsx
    - rebuild `counts` useMemo (deps + formula per FR-1)
    - add `handleClearFilters` callback
    - render <ClearFilters … /> below <ShelfTagFilter … />
  tests/features/shelf-list/ShelfList.test.tsx
    - ~6 new tests (counts reflect filters, button
      visibility, reset behaviour, focus restoration)
```
