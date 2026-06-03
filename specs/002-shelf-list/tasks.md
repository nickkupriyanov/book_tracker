# Tasks: Shelf List

> **Status:** In Progress
> **Spec:** `../spec.md` (`Approved`)
> **Plan:** `../plan.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-02

Each task is one commit. Mark a task `[x]` only when its acceptance line
is satisfied and `npm run lint && npm run test` pass.

Order matters: T1 first (shadcn primitives), T2–T5 build the feature,
T6 wires the page, T7 verifies.

---

## T1. Add shadcn Card, Tabs, Badge primitives

- [x] **Files:** `src/components/ui/card.tsx`, `src/components/ui/tabs.tsx`,
  `src/components/ui/badge.tsx`, possibly new deps in `package.json`.
- **Acceptance:**
  - `npx shadcn@latest add card tabs badge --yes --silent` succeeds.
  - Three new files exist under `src/components/ui/`.
  - If CLI misses deps, install manually (per T7 lesson).
  - `tsc --noEmit` clean; `npm run build` succeeds.
  - `npm run test` still passes (no regression).
- **Notes:** reuse the T7 install path. Already have CVA, clsx,
  tailwind-merge, lucide-react from spec 001.

## T2. BookCard (TDD)

- [x] **Files:** `src/features/shelf-list/BookCard.tsx`,
  `tests/features/shelf-list/BookCard.test.tsx`.
- **Acceptance:**
  - Renders cover `<img>` when `book.coverUrl` is set.
  - Renders placeholder (BookOpen icon) when `book.coverUrl` is absent.
  - Swaps to placeholder after `<img>` `onError` fires (cover-failure fallback).
  - Shows title (serif) and author (muted-foreground).
  - Title and author are truncated when long (CSS class is present).
  - Renders status pill: muted for `want`, primary for `reading`,
    muted+checkmark for `read` (D1).
  - Shows up to 3 tags; with 4+ tags, shows "+N" overflow chip.
  - Tests cover all of the above (≥ 4 tests).
- **Notes:** local `coverFailed` state is OK (per plan §4). Status pill
  is a custom `<span>` (D-P4), not shadcn Badge.

## T3. ShelfFilters (TDD)

- [x] **Files:** `src/features/shelf-list/ShelfFilters.tsx`,
  `tests/features/shelf-list/ShelfFilters.test.tsx`.
- **Acceptance:**
  - Renders 4 triggers with labels: "All", "Want to read", "Reading", "Read".
  - Each trigger shows a count: "All (3)", "Want to read (1)", etc.
  - Clicking a trigger calls `onChange` with the corresponding value.
  - The active trigger matches the `value` prop.
  - Tests cover: counts display, onChange callback, active state (≥ 3 tests).
- [x] **Notes:** built on shadcn Tabs. Controlled component (value/onChange).

## T4. EmptyFilterResult component

- **Files:** `src/features/shelf-list/EmptyFilterResult.tsx`.
- **Acceptance:**
  - Renders the message "No books with this status." (muted).
  - No props, no state.
- **Notes:** visual-only, no tests (constitution §4).

## T5. ShelfList (TDD)

- **Files:** `src/features/shelf-list/ShelfList.tsx`,
  `src/features/shelf-list/index.ts`,
  `tests/features/shelf-list/ShelfList.test.tsx`.
- **Acceptance:**
  - Local filter state, default `'all'`.
  - `counts` derived from `books` via `useMemo`.
  - Renders `<ShelfFilters>` with the current value and counts.
  - Renders the grid of `<BookCard>` when filtered list is non-empty.
  - Renders `<EmptyFilterResult>` when filtered list is empty but
    `books.length > 0`.
  - Renders nothing (just the filters block) when `books.length === 0` —
    actually the parent renders `EmptyShelf` in that case, so this
    component is only mounted when `books.length > 0`.
  - Tests cover: filtering by each status, default 'all', counts
    recompute on book add, empty-filter result (≥ 5 tests).
- **Notes:** orchestrator. Pure props in, JSX out + local state.

## T6. Wire ShelfClient to use ShelfList

- **Files:** `src/app/ShelfClient.tsx`.
- **Acceptance:**
  - When `status === 'ready' && books.length > 0`, renders
    `<ShelfList books={books} />` instead of "You have N books" placeholder.
  - `npm run build` succeeds, no hydration warnings.
  - Manual: visit `/` with 0 books → `EmptyShelf`. Add a book → grid shows.
- **Notes:** integration point. Existing T10 + T6 tests cover the
  add-book flow; this change swaps the post-add rendering.

## T7. Polish & verification

- **Files:** (no new code); `specs/002-shelf-list/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 002 are verified manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (expected ~95 tests total: 80 from spec 001
    + 15 from spec 002).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds.
  - No new `any` introduced.
  - No raw HTML controls where shadcn has an equivalent.
  - Update this file: tick all `[x]`s, set Status to `Done`.
- **Notes:** verification gate. If anything in §10 fails, open a
  follow-up task — don't silently expand the scope.
