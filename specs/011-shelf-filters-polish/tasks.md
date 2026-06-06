# Tasks: Shelf Filters — Polish

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a
task `[x]` only when its acceptance line is satisfied
and `npm run lint && npm run test` passes.

Order: T1 builds the new component in isolation (TDD
co-located tests where reasonable, RTL tests under
`tests/`); T2 wires counts + button into `ShelfList`;
T3 verifies.

---

## T1. `ClearFilters` component (TDD) — [ ]

- **Files:**
  `src/features/shelf-list/ClearFilters.tsx` (new),
  `tests/features/shelf-list/ClearFilters.test.tsx`
  (new).
- **Acceptance:**
  - Props: `{ onClick: () => void }`.
  - Renders a shadcn `Button` (`variant="outline"`,
    `size="sm"`) with a lucide `X` icon (aria-hidden)
    and the text `"Clear filters"`.
  - Button has `data-testid="shelf-clear-filters"`.
  - Wrapper `<div>` has
    `data-testid="shelf-clear-filters-row"` and
    `className="flex justify-end"`.
  - 3 RTL tests:
    1. renders the button with the text and `data-testid`
    2. clicking the button calls `onClick` exactly once
    3. accessible name contains "Clear filters" (icon
       is `aria-hidden`)
  - `npm run lint && npm run test` green.
- **Notes:** the component is unconditional — the
  parent decides visibility. Don't put the
  `isActive` predicate inside.

## T2. `ShelfList` wiring (counts, button, focus) — [ ]

- **Files:**
  `src/features/shelf-list/ShelfList.tsx` (modified),
  `src/features/shelf-list/ShelfSearch.tsx` (modified,
  additive: `inputRef?` prop forwarded to `<input>`),
  `tests/features/shelf-list/ShelfList.test.tsx`
  (modified — add 6 new tests).
- **Acceptance:**
  - `ShelfList`:
    - `counts` useMemo is rebuilt to depend on
      `[books, search, selectedTags]` and calls
      `filterBooks` four times (one per tab). The
      dependency on `filter` is removed.
    - New `searchInputRef = useRef<HTMLInputElement | null>(null)`.
    - New `handleClearFilters` callback: sets
      `search → ""`, `selectedTags → []`,
      `filter → "all"`, then calls
      `searchInputRef.current?.focus()`.
    - Renders `<ClearFilters onClick={handleClearFilters} />`
      after `<ShelfTagFilter … />` and only when
      `search !== "" || selectedTags.length > 0 || filter !== "all"`.
  - `ShelfSearch`:
    - Adds optional `inputRef?: React.Ref<HTMLInputElement>`
      prop. Forwards it to the underlying `<input>`.
    - No other changes. Existing tests pass.
  - 6 new `ShelfList` integration tests:
    1. `search` non-empty, no tags — counts on the
       four tabs reflect `filterBooks(books, { search, tags: [], status: tab }).length`.
    2. `selectedTags` non-empty, no search — same,
       with the tag set.
    3. `search` and `selectedTags` both non-empty —
       counts are the AND result.
    4. `Clear filters` button is not in the DOM when
       no filter is active.
    5. `Clear filters` button appears in the DOM
       when `search !== ""` and clears all three
       dimensions on click.
    6. After `Clear filters` click, focus is on the
       search input (asserted via
       `expect(searchInput).toHaveFocus()`).
  - `npm run lint && npm run test` green.
- **Notes:** the visible-but-empty wrapper (`<div
  data-testid="shelf-clear-filters-row" />`) renders
  even when no button is inside, because the parent
  conditionally returns the whole component when no
  filter is active. The "button is not in the DOM"
  test queries by `shelf-clear-filters`, not by the
  row — so it stays correct.

## T3. Polish & verification — [ ]

- **Files:**
  `specs/011-shelf-filters-polish/spec.md` (status →
  `Implemented`),
  `specs/011-shelf-filters-polish/plan.md` (status →
  `Approved`),
  `specs/011-shelf-filters-polish/tasks.md` (status →
  `Done`, ticks).
- **Acceptance:**
  - All spec §11 acceptance criteria verified.
  - `npm run lint` clean.
  - `npm run test` passes: **~386/~386** (377 from
    spec 010 baseline + 9 new from spec 011: 3
    `ClearFilters` + 6 `ShelfList` integration).
  - `npx tsc --noEmit` clean.
  - `npm run build` succeeds. No new dependencies,
    no bundle delta to record.
  - No new `any` introduced.
  - No new npm dependencies added.
  - Manual QA (per spec §13, 12 steps) covered by
    tests and code review.
- **Notes:** verification report recorded in the T3
  commit message.
