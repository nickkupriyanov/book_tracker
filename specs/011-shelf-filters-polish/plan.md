# Plan: Shelf Filters — Polish

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Author:** —
> **Created:** 2026-06-06

---

## 1. Architecture summary

This spec is a focused polish of the shelf filters that
landed in spec 010. The architecture doesn't change:
`ShelfList` still owns three `useState` hooks, the
`filterBooks` pure function is reused as-is, and the
`StorageAdapter` stays untouched.

Two changes:

1. **Counts dependency shift.** The `counts` useMemo in
   `ShelfList` is rewritten to take `search` and
   `selectedTags` into account, computing the count for
   each tab independently. No new function, no new
   component, no new dependency — the existing
   `filterBooks(books, { search, tags, status: tab })`
   is called four times in a single useMemo.
2. **`ClearFilters` component.** A new controlled
   presentational component that wraps a shadcn
   `Button` (variant="outline", size="sm") with a
   lucide `X` icon and the text "Clear filters". Takes
   one prop, `onClick`, and renders `null` when nothing
   is active (parent passes the visibility flag).
   `ShelfList` owns the click handler, the visibility
   predicate, and the focus restoration.

Focus restoration (D7) is one extra line in
`ShelfList`: a ref to the `ShelfSearch` input element,
set in a `ref` callback passed via a new `inputRef?`
prop on `ShelfSearch`. This is the only API change to
`ShelfSearch` and it's strictly additive (optional
prop).

## 2. Module / file layout

```
src/features/shelf-list/
├── ShelfList.tsx              # MODIFIED:
│                              #   - counts useMemo now depends on
│                              #     [books, search, selectedTags] and
│                              #     calls filterBooks 4x
│                              #   - new handleClearFilters callback
│                              #   - new searchInputRef + ref callback
│                              #     passed to <ShelfSearch>
│                              #   - renders <ClearFilters … />
│                              #     below <ShelfTagFilter … />
├── ShelfSearch.tsx            # MODIFIED: + optional inputRef? prop
│                              #           forwarded to the <input>
├── ShelfTagFilter.tsx         # unchanged
├── ShelfFilters.tsx           # unchanged (it just receives `counts`)
├── ClearFilters.tsx           # NEW
├── BookCard.tsx               # unchanged
├── StatusPill.tsx             # unchanged
├── EmptyFilterResult.tsx      # unchanged (copy from spec 010)
└── index.ts                   # unchanged

tests/features/shelf-list/
├── ShelfList.test.tsx         # MODIFIED: ~6 new tests
├── ClearFilters.test.tsx      # NEW: 2-3 tests
├── ShelfSearch.test.tsx       # unchanged (ref prop is optional)
├── ShelfTagFilter.test.tsx    # unchanged
└── …
```

The `inputRef` prop on `ShelfSearch` is purely
mechanical — same DOM element, no behaviour change —
so the existing `ShelfSearch.test.tsx` tests continue
to pass with no edit.

## 3. Data flow

```
[user in shelf]   types in ShelfSearch
                  setSearch("tolkien")
                            │
                            ▼
                  ShelfList re-renders
                  - counts useMemo recomputes:
                      all   = filterBooks(books, {search:"tolkien", tags:[],   status:"all"     }).length
                      want  = filterBooks(books, {search:"tolkien", tags:[],   status:"want"    }).length
                      reading= filterBooks(books, {search:"tolkien", tags:[],   status:"reading" }).length
                      read  = filterBooks(books, {search:"tolkien", tags:[],   status:"read"    }).length
                  - filteredBooks useMemo recomputes (unchanged from 010)
                  - <ShelfFilters counts={counts} /> re-renders with new tab counts
                  - <ClearFilters … /> re-renders with the new isActive flag

[user clicks Clear filters]
                  handleClearFilters():
                      setSearch(""), setSelectedTags([]), setFilter("all")
                      searchInputRef.current?.focus()
                            │
                            ▼
                  ShelfList re-renders
                  - isActive predicate is false → <ClearFilters /> returns null
                  - counts revert to library counts
                  - filteredBooks = books (or filtered by status, but status='all')
                  - focus is on the search input
```

The `inputRef` is the only cross-component
communication channel needed for focus restoration.
It's a `useRef<HTMLInputElement | null>(null)` in
`ShelfList`, passed as `inputRef={searchInputRef}` to
`<ShelfSearch>`, and forwarded to the underlying
`<input>` element inside `ShelfSearch`.

## 4. Component breakdown

### `ShelfList` (MODIFIED)

Three changes:

- **Rebuild `counts` useMemo** to depend on
  `[books, search, selectedTags]` and call
  `filterBooks` four times (one per tab). The
  dependency on `filter` is **removed** because the
  count for each tab is independent of the active
  tab.
- **Add `handleClearFilters` callback** that resets
  the three state hooks and calls `.focus()` on the
  search input ref.
- **Add `searchInputRef`** and a ref-callback prop
  `inputRef` on `<ShelfSearch>`.
- **Render `<ClearFilters … />`** below
  `<ShelfTagFilter … />`, only when
  `search !== "" || selectedTags.length > 0 || filter !== "all"`.
  This is the same predicate the component uses
  internally to decide whether to render its button.

### `ShelfSearch` (MODIFIED, additive)

One change:

- Add an **optional** `inputRef?: React.Ref<HTMLInputElement>`
  prop. Forward it to the underlying `<input>`.

No behaviour change. No test change. The ref is just
a passthrough.

### `ClearFilters` (NEW, in `src/features/shelf-list/`)

- **Props:**
  ```ts
  interface ClearFiltersProps {
    onClick: () => void;
  }
  ```
- **Renders:**
  ```tsx
  export function ClearFilters({ onClick }: ClearFiltersProps) {
    return (
      <div className="flex justify-end" data-testid="shelf-clear-filters-row">
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          data-testid="shelf-clear-filters"
        >
          <X aria-hidden="true" />
          Clear filters
        </Button>
      </div>
    );
  }
  ```
- **Notes:**
  - Parent `ShelfList` decides **whether** to render
    this component at all (visibility predicate). The
    component itself is dumb and unconditional.
  - The wrapper `<div>` provides
    `data-testid="shelf-clear-filters-row"` for
    integration tests; the button itself has
    `data-testid="shelf-clear-filters"`.
  - `lucide-react` is already in the bundle (1.17.0).
    `X` is exported.
  - `shadcn` `Button` (variant="outline", size="sm")
    matches the visual language of the rest of the
    app (used by `BookCard` and dialogs).

- **Tests** (`tests/features/shelf-list/ClearFilters.test.tsx`):
  1. renders the button with the text "Clear filters"
     and a `data-testid="shelf-clear-filters"`
  2. clicking the button calls `onClick` exactly once
  3. has an accessible name containing "Clear filters"
     (the icon is `aria-hidden`, so the text label is
     the accessible name)

### `ShelfList` integration tests (NEW, in `tests/features/shelf-list/ShelfList.test.tsx`)

Six new tests:

1. `search` non-empty, no tags — counts on the four
   tabs reflect `filterBooks(books, { search, tags: [], status: tab }).length`.
2. `selectedTags` non-empty, no search — same, with
   the tag set.
3. `search` and `selectedTags` both non-empty — counts
   are the AND result.
4. `Clear filters` button is not in the DOM when no
   filter is active.
5. `Clear filters` button appears in the DOM when
   `search !== ""` and clears on click.
6. `Clear filters` button clears all three filter
   dimensions on click; after the click, focus is on
   the search input (asserted via
   `expect(searchInput).toHaveFocus()`).

## 5. Storage adapter changes

**None.** Same as spec 010.

## 6. Decisions & trade-offs

- **D-P1. The `inputRef` prop on `ShelfSearch` is
  optional.** The component is still usable on its
  own (the existing tests prove this). A future
  caller can opt in to focus management by passing
  a ref.
- **D-P2. Visibility predicate lives in the parent
  (`ShelfList`), not in `ClearFilters`.** Keeps the
  child presentational. `ClearFilters` doesn't know
  what "active" means; it just renders a button.
- **D-P3. No new `useCallback` for the click handler
  inside `ShelfList`.** The handler closes over
  `setSearch` / `setSelectedTags` / `setFilter` /
  `searchInputRef`, all of which are stable. Wrapping
  in `useCallback` would be ceremony with no
  benefit.
- **D-P4. No new `useMemo` for the
  `isClearFiltersVisible` predicate.** The expression
  `search !== "" || selectedTags.length > 0 || filter !== "all"`
  is trivially cheap (three string/array comparisons
  per render). A `useMemo` would cost more in
  dependencies than it saves.
- **D-P5. Counts recompute on every search
  keystroke.** `filterBooks` is O(n × m × t) per
  call; called 4× per render; for ≤ 1 000 books this
  is < 1 ms. No debounce, no `useDeferredValue`
  (consistent with 010 D-P4).
- **D-P6. Single button, no keyboard shortcut.** No
  `Esc`-to-clear. The search input already has a
  native browser `×`. Adding an Esc binding would be
  a separate spec.

## 7. Risks

- **Bundle size.** None. `Button` is already in
  `src/components/ui/`, `lucide-react` is already in
  the bundle, and the new component is a small
  presentational wrapper. Worst case: a handful of
  extra bytes.
- **Focus management regression.** If a future
  refactor moves the `<input>` element out of
  `ShelfSearch` (e.g. into a different primitive),
  the forwarded `inputRef` would point at the wrong
  element. Mitigated by the optional nature of the
  prop: the test that asserts `toHaveFocus()` on the
  input will fail loudly.
- **Counts off by one if `filterBooks` ever stops
  being the source of truth.** The contract is
  centralised in `src/lib/shelf-filter.ts`. The
  counts are derived from the same function that
  produces `filteredBooks`, so they cannot drift
  relative to each other.
- **`Clear filters` resets status to `"all"` even if
  the user was happy on a different tab.** D1
  decision. If this turns out to be annoying, future
  spec can split into "Clear search & tags" and
  "Reset to All". YAGNI for now.

## 8. Rollout

- **No migration, no flag, no `StorageAdapter`
  change.**
- **Manual QA** (per spec §13, 12 steps): 1-8 are
  covered by the new tests + an interactive
  smoke-test; 9-12 are regression sanity (persistence,
  add/delete, dialogs).
- **Verification:** `npm run lint && npm run test`
  pass; `npx tsc --noEmit` clean; `npm run build`
  succeeds; no new `any`; no new dependencies.
- **Expected test count after 011:** **~386** (377
  from spec 010 + ~9 new from spec 011: 3
  `ClearFilters` + 6 `ShelfList` integration).
