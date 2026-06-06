# Tasks: Shelf Filters — Polish

> **Status:** Done
> **Spec:** `../spec.md` (Implemented)
> **Plan:** `../plan.md` (Approved)

Each task is small enough to be one commit. Mark a
task `[x]` only when its acceptance line is satisfied
and `npm run lint && npm run test` passes.

Order: T1 builds the new component in isolation (TDD
co-located tests where reasonable, RTL tests under
`tests/`); T2 wires counts + button into `ShelfList`;
T3 verifies.

---

## T1. `ClearFilters` component (TDD) — [x]

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

## T2. `ShelfList` wiring (counts, button, focus) — [x]

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

## T3. Polish & verification — [x]

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
  - `npm run test` passes: **386/386** (377 from
    spec 010 baseline + 9 new from spec 011: 3
    `ClearFilters` + 6 `ShelfList` integration).
  - `npx tsc --noEmit` clean.
  - `npm run build` succeeds.
  - Bundle deltas (route `First Load JS`):
    - `/` (shelf): 167 kB → 167 kB (route 5.48 kB →
      5.63 kB; +150 B for `ClearFilters`, the
      `useRef` in `ShelfList`, the rebuilt `counts`
      useMemo, and the `handleClearFilters`
      callback). No new dependencies.
    - `/book/[id]` (detail): 140 kB / 301 kB —
      unchanged. TipTap is **not** loaded on the
      shelf path.
  - No new `any` introduced.
  - No new npm dependencies added.
  - Manual QA (per spec §13, 12 steps) covered by
    tests and code review.
- **Notes:** verification report recorded in the T3
  commit message.

### Verification report (T3)

**Tests:** 386/386 in 33 files, runtime ~4.7 s.
**Lint:** clean.
**Typecheck:** clean.
**Build:** clean.

**Commits in spec 011 (newest first):**

| Hash      | Message                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| (T3)      | T3: status updates + verification report                                        |
| `d134583` | T2: ShelfList wiring — counts depend on search+tags, ClearFilters, focus reset  |
| `246f1ea` | T1: ClearFilters component (TDD) — 3 tests                                       |
| `73ea72e` | Spec 011: Shelf Filters — Polish — add plan + tasks                              |
| `9b0ad7a` | Spec 011: Shelf Filters — Polish — add spec, status Draft                        |

**Issues / important points encountered:**

- **Counts shift is a no-op for the default state.**
  The new `counts` useMemo calls
  `filterBooks(books, { search: "", tags: [], status: tab })`
  four times, but with empty search and tags this
  reduces to the same `books.length` /
  `b.status === tab` counts as before. All 15
  pre-existing `ShelfList` tests still pass without
  modification — the new behaviour is a strict
  superset.
- **`ShelfSearch` change is purely additive.** A new
  optional `inputRef?: React.Ref<HTMLInputElement>`
  prop is forwarded to the underlying `<input>`. No
  change in markup, no change in behaviour, no
  existing test touched. Refactor-friendly: a future
  caller can opt in to focus management.
- **Bundle stayed at 167 kB First Load JS** for the
  shelf route. The `ClearFilters` component is small
  (`<Button>` + icon + text), the `useRef` and the
  new useMemo are byte-cheap, and the rebuild didn't
  drag in a new dependency. TipTap remains scoped
  to the detail route.
- **Test count: 377 → 386 (+9).** Matched the plan's
  ~9 estimate (3 component + 6 integration). No
  edge cases needed to be added beyond the spec.
- **Spec reuse is paying off.** Spec 011 inherited
  010's `filterBooks` and `FilterCriteria` without
  modification, the `ShelfFilters` component without
  modification, and the tag filter row layout
  without modification. The T2 commit touched only
  `ShelfList.tsx`, `ShelfSearch.tsx` (1 line), and
  the `ShelfList.test.tsx` file.
