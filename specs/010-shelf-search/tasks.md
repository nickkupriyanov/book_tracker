# Tasks: Shelf Search & Filter

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task
`[x]` only when its acceptance line is satisfied and
`npm run lint && npm run test` passes.

Order: T1 establishes the pure-function core (foundation for
T5 and for the tests in T2–T4); T2–T4 add the UI components
in isolation; T5 wires them into `ShelfList`; T6 is the
final verification.

---

## T1. `filterBooks` pure function + TDD

- **Files:**
  `src/lib/shelf-filter.ts` (new),
  `src/lib/shelf-filter.test.ts` (new, co-located).
- **Acceptance:**
  - `FilterCriteria` and `filterBooks` exported exactly as
    in plan §4.
  - The internal helpers (`parseSearchTokens`, `matchesStatus`,
    `matchesTags`, `matchesSearch`) are private to the module.
  - `parseSearchTokens`: trims, lowercases, splits on `\s+`,
    drops empty entries. Returns `[]` for empty / whitespace.
  - `matchesStatus`: `"all"` → `true`; else strict equality.
  - `matchesTags`: `[]` → `true`; else `selected.some(t =>
    book.tags.includes(t))` (OR).
  - `matchesSearch`: `[]` → `true`; else every token must be a
    case-insensitive substring of `title`, `author`, or any
    `tag` value.
  - ≥ 14 unit tests covering the matrix in plan §4 (empty
    criteria, single-token in each of 3 fields, multi-token
    AND, case-insensitivity, whitespace handling, empty-tag
    filter, single-tag match, multi-tag OR, status alone,
    all three combined, no-match, books with empty `tags`).
  - `npm run lint && npm run test` green.
- **Notes:** TDD — red-green-refactor. The T1 commit is the
  pure-function core; UI tasks (T2–T4) will import from
  `src/lib/shelf-filter.ts`.

## T2. `ShelfSearch` component

- **Files:**
  `src/features/shelf-list/ShelfSearch.tsx` (new),
  `tests/features/shelf-list/ShelfSearch.test.tsx` (new).
- **Acceptance:**
  - Props: `{ value: string; onChange: (next: string) => void }`.
  - Renders shadcn `Input` (`type="search"`).
  - Placeholder: `"Search title, author, or tag…"`.
  - `aria-label="Search books"`, `data-testid="shelf-search"`.
  - Calls `onChange(e.target.value)` on user input.
  - 3 RTL tests: renders, displays value, calls onChange.
  - `npm run lint && npm run test` green.
- **Notes:** presentational. The `Input` primitive is already
  in `src/components/ui/`.

## T3. `ShelfTagFilter` component

- **Files:**
  `src/features/shelf-list/ShelfTagFilter.tsx` (new),
  `tests/features/shelf-list/ShelfTagFilter.test.tsx` (new).
- **Acceptance:**
  - Props: `{ tags: string[]; selected: string[];
    onToggle: (tag: string) => void }`.
  - Returns `null` when `tags.length === 0`.
  - Renders one `<button role="checkbox">` per tag, with
    `aria-checked={selected.includes(tag)}` and a wrapping
    `Badge` (`variant="secondary"` for selected,
    `variant="outline"` for unselected). Chip text is
    `#{tag}`.
  - Each button has `data-testid={`shelf-tag-${tag}`}`.
  - Wrapper has `overflow-x-auto whitespace-nowrap` when
    `tags.length > 20`; `flex flex-wrap gap-1` otherwise.
  - 4 RTL tests: empty-tags returns null, renders chips,
    toggles on click, overflow class on > 20.
  - `npm run lint && npm run test` green.
- **Notes:** the wrapping `<button>` is required for keyboard
  activation and a11y. `Badge` is non-interactive (D-P3).

## T4. `EmptyFilterResult` copy change

- **Files:**
  `src/features/shelf-list/EmptyFilterResult.tsx` (modified).
- **Acceptance:**
  - The displayed text changes from `"No books with this
    status."` to `"No books match your filters."`.
  - No structural change. The `data-testid="review-empty"`
    (if any) is preserved.
  - Any existing test that asserts the old text is updated
    to the new text. (Likely in
    `tests/features/shelf-list/` — if a test exists, update
    it; if not, skip.)
  - `npm run lint && npm run test` green.
- **Notes:** trivial copy change. Bundled with T5 if the
  test file lives next to a T5 change; otherwise a separate
  commit. The text now covers the AND-combined filter case
  (status + search + tags), not just status.

## T5. `ShelfList` wiring (state, `useMemo`, new renders)

- **Files:**
  `src/features/shelf-list/ShelfList.tsx` (modified),
  `tests/features/shelf-list/ShelfList.test.tsx` (modified
  — add 4-5 integration tests).
- **Acceptance:**
  - New `useState` hooks: `search: string` (default `""`),
    `selectedTags: string[]` (default `[]`).
  - `allTags = useMemo(() => Array.from(new Set(books
    .flatMap(b => b.tags))).sort(), [books])`.
  - `filteredBooks = useMemo(() => filterBooks(books, {
    search, tags: selectedTags, status: filter }), [books,
    search, selectedTags, filter])`.
  - Layout (top to bottom inside `space-y-6`):
    1. `<ShelfSearch value={search} onChange={setSearch} />`
    2. `<ShelfFilters … />` (unchanged)
    3. `<ShelfTagFilter tags={allTags} selected={selectedTags}
       onToggle={handleTagToggle} />` (with
       `handleTagToggle` adding/removing the tag from
       `selectedTags`).
    4. Either `<EmptyFilterResult />` or the grid of
       `<BookCard>`s over `filteredBooks` (existing logic).
  - The existing 4-5 `ShelfList` tests (status filter,
    dialogs) still pass.
  - 4-5 new integration tests:
    - search input is visible on the shelf
    - typing in search narrows the grid
    - clicking a tag chip narrows the grid
    - all three filters combined → only AND matches
    - zero matches → `EmptyFilterResult` shows the new copy
  - `npm run lint && npm run test` green.
- **Notes:** the edit/delete dialog wiring is untouched. The
  outer `space-y-6` div gets two more children. No new
  `useEffect`s.

## T6. Polish & verification

- **Files:**
  `specs/010-shelf-search/spec.md` (status → `Implemented`),
  `specs/010-shelf-search/plan.md` (status → `Approved`),
  `specs/010-shelf-search/tasks.md` (status → `Done`,
  ticks).
- **Acceptance:**
  - All spec §11 acceptance criteria verified.
  - `npm run lint` clean.
  - `npm run test` passes: **~360/~360 across ~30 files**
    (342 from spec 008 baseline + ~15–20 new from spec 010:
    `shelf-filter.test.ts` 14, `ShelfSearch.test.tsx` 3,
    `ShelfTagFilter.test.tsx` 4, `ShelfList.test.tsx`
    +4-5).
  - `npx tsc --noEmit` clean.
  - `npm run build` succeeds. No bundle delta to record
    (no new dependencies).
  - No new `any` introduced.
  - No new npm dependencies.
  - Manual QA (per spec §13, 15 steps) is run.
- **Notes:** verification report recorded in the T6 commit
  message.
