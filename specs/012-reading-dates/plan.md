# Plan: Reading Dates

> **Status:** Approved
> **Spec:** `../spec.md` (Draft)
> **Author:** —
> **Created:** 2026-06-06

---

## 1. Architecture summary

This spec extends the `Book` domain with two optional
calendar-date fields (`startedAt`, `finishedAt`), wires
them through the shared `BookForm`, surfaces them on the
detail page, and adds a shelf-level sort menu that
includes the new dates alongside a few natural
alphabetical and rating-based options.

The architecture follows the project's "small surface area,
reuse what exists" principle:

- **Domain.** Two optional `string` fields on `Book`. No new
  domain type, no new entity, no new aggregate. `BookInput`
  inherits via `Omit<Book, "id" | "createdAt">`.
- **Persistence.** Zero changes. `StorageAdapter` interface
  and `LocalStorageAdapter` implementation are unchanged.
  Existing localStorage records are valid (the fields are
  optional).
- **Validation.** Two new helpers in the existing
  `src/lib/validation/book.ts` (`validateStartedAt`,
  `validateFinishedAt`) and a single cross-field check in
  `validateBookInput`. The boundary contract (form payload
  → normalized `BookInput`) stays the same.
- **Pure logic.** One new pure function
  `sortBooks(books, sort)` in `src/lib/shelf-sort.ts` and
  one new pure function `formatReadingDuration(started,
  finished)` in `src/lib/format/reading-duration.ts`. Both
  TDD, both reusable from any future test.
- **UI.** `BookForm` (shared by Add and Edit) gets two new
  `<input type="date">` fields. A new `<ShelfSort>`
  component is a thin shadcn `<Select>` wrapper that lives
  in `src/features/shelf-list/`. `DetailMeta` gains three
  conditional lines under the existing "Added on" line.
- **State.** `ShelfList` gains a single
  `useState<SortValue>("recently-added")`. The Zustand
  store's `sortByCreatedAtDesc` invariant is preserved
  (D12): it is the "library order" baseline; the shelf
  sort is a view-level override applied on top of
  `filterBooks`'s output.

Sort runs **after** filtering (`sortBooks(filteredBooks,
sort)`) so the work is bounded by what the user is going
to see (D11). Both layers are `O(n log n)` on a small
filtered list — no debounce, no memoization beyond a
single `useMemo([filteredBooks, sort])`.

## 2. Module / file layout

```
src/types/
└── book.ts                       # MODIFIED: + startedAt?, + finishedAt?

src/lib/validation/
└── book.ts                       # MODIFIED: + validateStartedAt,
                                  #           + validateFinishedAt,
                                  #           + cross-field check

src/lib/
├── shelf-filter.ts               # unchanged
├── shelf-sort.ts                 # NEW: SortValue, SORT_LABELS, sortBooks
└── format/
    └── reading-duration.ts       # NEW: formatReadingDuration

src/storage/
├── storage-adapter.ts            # unchanged
└── local-storage-adapter.ts      # unchanged

src/state/
└── book-library.ts               # unchanged (sortByCreatedAtDesc preserved)

src/components/
└── BookForm.tsx                  # MODIFIED: + 2 useState hooks,
                                  #           + 2 <Input type="date"> blocks,
                                  #           + spread into BookInput

src/features/add-book/
└── AddBookDialog.tsx             # MODIFIED: add startedAt: "", finishedAt: ""
                                  #           to initialValues

src/features/edit-book/
└── EditBookDialog.tsx            # MODIFIED: spread book.startedAt /
                                  #           book.finishedAt into initialValues

src/features/shelf-list/
├── ShelfList.tsx                 # MODIFIED: + useState<SortValue>,
                                  #           + sortedBooks useMemo,
                                  #           + <ShelfSort /> between
                                  #             <ShelfFilters /> and
                                  #             <ShelfTagFilter />,
                                  #           grid maps over sortedBooks
├── ShelfSort.tsx                 # NEW: shadcn <Select> wrapper
├── ShelfSearch.tsx               # unchanged
├── ShelfFilters.tsx              # unchanged
├── ShelfTagFilter.tsx            # unchanged
├── ClearFilters.tsx              # unchanged
├── EmptyFilterResult.tsx         # unchanged
├── BookCard.tsx                  # unchanged
├── StatusPill.tsx                # unchanged
└── index.ts                      # MODIFIED: + export ShelfSort

src/features/detail-view/
├── DetailMeta.tsx                # MODIFIED: + 3 conditional <p> lines,
                                  #           + extract formatDate() helper
├── BookDetail.tsx                # unchanged
├── DetailHeader.tsx              # unchanged
├── DetailSection.tsx             # unchanged
├── DetailLoading.tsx             # unchanged
├── DetailNotFound.tsx            # unchanged
└── index.ts                      # unchanged

tests/
├── lib/
│   ├── shelf-filter.test.ts      # unchanged
│   ├── shelf-sort.test.ts        # NEW: ~14 cases
│   └── format/
│       └── reading-duration.test.ts  # NEW: ~8 cases
├── components/
│   └── BookForm.test.tsx         # MODIFIED: + 6 date-field tests
├── features/
│   ├── shelf-list/
│   │   ├── ShelfList.test.tsx    # MODIFIED: + 4 sort-wiring tests
│   │   ├── ShelfSort.test.tsx    # NEW: 3 tests
│   │   └── …                     # others unchanged
│   ├── detail-view/
│   │   └── DetailMeta.test.tsx   # MODIFIED: + 4 conditional-line tests
│   ├── add-book/
│   │   └── AddBookDialog.test.tsx  # MODIFIED (or unchanged if
│   │                              # covered by BookForm tests + edit-time
│   │                              # initialValues spot check)
│   └── edit-book/
│       └── EditBookDialog.test.tsx  # MODIFIED: + 1 prefill test
└── lib/validation/
    └── book.test.ts (or .tsx)    # MODIFIED: + 10 validator tests
```

## 3. Data flow

### 3.1 Adding a book with dates

```
[user in Add Book dialog]
  sets Started = "2026-04-01", Finished = "2026-04-15"
                    │
                    ▼
  BookForm state: { startedAt: "2026-04-01",
                    finishedAt: "2026-04-15", … }
  user clicks "Add book"
                    │
                    ▼
  BookForm.handleSubmit builds the BookInput:
    {
      title, author, status, coverUrl?, tags,
      rating?, review?, quotes?,
      startedAt: "2026-04-01",     // spread only if non-empty
      finishedAt: "2026-04-15",
    }
                    │
                    ▼
  validateBookInput(input):
    - validateStartedAt("2026-04-01") → "2026-04-01" (OK, round-trips)
    - validateFinishedAt("2026-04-15") → "2026-04-15"
    - cross-field: "2026-04-01" <= "2026-04-15" → OK
    - returns { ok: true, value: BookInput }
                    │
                    ▼
  onSubmit(result.value) → addBook(input)
    → adapter.addBook stamps { id, createdAt }
    → store prepends (sortByCreatedAtDesc invariant)
    → toast, close dialog
```

### 3.2 Editing dates

```
[user on detail page clicks Edit]
  EditBookDialog opens with:
    initialValues = {
      title: book.title, author: book.author,
      status: book.status,
      coverUrl: book.coverUrl,         // spread if defined
      tags: book.tags,
      startedAt: book.startedAt,       // spread if defined
      finishedAt: book.finishedAt,
    }
  user changes Finished to "2026-05-01" (after Started)
  user clicks "Save changes"
                    │
                    ▼
  BookForm.handleSubmit builds the BookInput,
  validateBookInput runs, onSubmit calls
  updateBook(book.id, input)
                    │
                    ▼
  adapter.updateBook preserves id and createdAt,
  replaces the rest with the new payload
                    │
                    ▼
  store map() replaces the book in place
    (createdAt unchanged → position unchanged)
```

### 3.3 Shelf sort

```
[user on shelf, default state]
  ShelfList:
    books (from store, sorted by createdAt desc)
    filter = "all", search = "", selectedTags = []
    sort = "recently-added"  (default)
                    │
                    ▼
  filteredBooks = filterBooks(books, { search, tags, status: filter })
                    │  (for the default state, this is `books` itself,
                    │   no tags to AND, status is "all")
                    ▼
  sortedBooks = sortBooks(filteredBooks, "recently-added")
                    │  (default mode: b.createdAt.localeCompare(a.createdAt)
                    │   — equivalent to the store's sort)
                    ▼
  grid renders sortedBooks

[user picks "Recently started" in <ShelfSort>]
  onChange("recently-started")
                    │
                    ▼
  ShelfList re-renders:
    sortedBooks = sortBooks(filteredBooks, "recently-started")
                    │  b.startedAt.localeCompare(a.startedAt)
                    │  nulls last
                    ▼
  grid re-renders in the new order
    (search / tags / filter unchanged — four independent
     shelf-local state axes)
```

### 3.4 Detail page rendering

```
[user opens /book/<id>]
  BookDetail → DetailMeta({ book })
                    │
                    ▼
  DetailMeta:
    existing rows (cover, title, author, status, tags, "Added on …")
                    │
                    ▼
    if book.startedAt:
      <p>Started {formatDate(book.startedAt)}</p>      ← new
    if book.finishedAt:
      <p>Finished {formatDate(book.finishedAt)}</p>    ← new
    if book.startedAt && book.finishedAt:
      <p>Read over {formatReadingDuration(s, f)}</p>   ← new
```

The three lines are mutually independent in render — a
book with only `startedAt` shows one new line, with both
shows three. No empty placeholders.

## 4. Component breakdown

### `Book` type (MODIFIED, additive)

```ts
export interface Book {
  // ... existing fields unchanged ...
  startedAt?: string;
  finishedAt?: string;
}
```

`BookInput` (= `Omit<Book, "id" | "createdAt">`) picks
them up automatically. No new types, no new union
variants, no narrowing required at the call sites.

### `validateStartedAt` / `validateFinishedAt` (NEW, in `src/lib/validation/book.ts`)

Symmetric helpers, following the existing
`validateCoverUrl` pattern (empty / undefined = no
value, no error). Mirrors the per-field helpers
`validateQuoteText` etc.

- Accept `undefined`, `null`, and `""` → return
  `undefined`, no error.
- Reject non-strings → field-level error.
- Match the regex `^\d{4}-\d{2}-\d{2}$`. Reject otherwise.
- Round-trip through `Date` to confirm calendar
  validity:
  ```ts
  const d = new Date(raw + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) → invalid
  if (d.toISOString().slice(0, 10) !== raw) → invalid
  ```
  The slice-back check catches `2026-02-30` (which
  `new Date(...)` would happily roll over to
  `2026-03-02`).
- Return the canonical string (unchanged, since
  round-trip preserves it for valid dates).

### Cross-field check in `validateBookInput`

After both validators return successfully, if both
values are defined, compare lexicographically. If
`startedAt > finishedAt`, push
`errors.finishedAt = "Finish date must be on or after
the start date."`. The error rides on `finishedAt` (the
field the user is most likely to want to fix).

### `BookForm` (MODIFIED, additive)

Two new `useState` hooks, two new `<Input type="date">`
blocks. Spread both values into the `BookInput` payload
inside `handleSubmit` — using the same
`...(value ? { key: value } : {})` pattern as
`coverUrl` and `rating`.

New block placement: **after the Tags field, before
the submit button**. Same `space-y-1.5` wrapper. The
error block uses the same pattern as `title` /
`author` / `coverUrl` / `tags`:
`<p id="…-error" className="text-sm text-destructive">`.

`canSubmit` is unchanged (no date is required).

### `AddBookDialog` (MODIFIED, additive)

`initialValues` gains `startedAt: ""` and
`finishedAt: ""` (alongside the existing defaults).
No new side effects, no new state. The dialog's
`onSubmit` (which calls `addBook(input)`) is
unchanged — the new fields flow through
`BookInput` transparently.

### `EditBookDialog` (MODIFIED, additive)

`initialValues` spreads `book.startedAt` and
`book.finishedAt` when defined, same pattern as
`book.coverUrl`. The dialog's `onSubmit` (which calls
`updateBook(book.id, input)`) is unchanged.

### `sortBooks` (NEW, in `src/lib/shelf-sort.ts`)

```ts
export type SortValue =
  | "recently-added"
  | "recently-started"
  | "recently-finished"
  | "title-az"
  | "author-az"
  | "highest-rated"
  | "longest-read";

export const SORT_LABELS: Record<SortValue, string> = {
  "recently-added":    "Recently added",
  "recently-started":  "Recently started",
  "recently-finished": "Recently finished",
  "title-az":          "Title (A→Z)",
  "author-az":         "Author (A→Z)",
  "highest-rated":     "Highest rated",
  "longest-read":      "Longest read",
};

export function sortBooks(books: Book[], sort: SortValue): Book[];
```

Pure, non-mutating, stable. Comparator table per FR-5.
Nulls-last for every sort that involves an optional
field. Returns a new array (the spread-then-sort idiom
already in `sortByCreatedAtDesc`).

### `ShelfSort` (NEW, in `src/features/shelf-list/`)

```ts
export interface ShelfSortProps {
  value: SortValue;
  onChange: (v: SortValue) => void;
}
```

Renders a shadcn `<Select>` (same primitive used by
`BookForm` for status / rating). The trigger shows the
current `SORT_LABELS[value]`. The list of items is the
seven labels. Selecting an item calls
`onChange(value)`. `data-testid="shelf-sort"`.

Visual: small, unobtrusive, right-aligned inside a
`<div className="flex justify-end">` (the row in
`ShelfList`). No label, no icon — the trigger's own
text is the affordance.

### `ShelfList` (MODIFIED)

Three changes:

- New `useState<SortValue>("recently-added")` at the
  top of the component, alongside the four existing
  shelf-local state hooks.
- New
  `sortedBooks = useMemo(() => sortBooks(filteredBooks, sort), [filteredBooks, sort])`
  right after the `filteredBooks` useMemo.
- The grid's `map()` iterates over `sortedBooks`
  (was `filteredBooks`). All other consumers of
  `filteredBooks` (e.g. the
  `filteredBooks.length === 0` check) are unchanged
  — they care about count, not order.

JSX order (D10):
1. `<ShelfSearch>`
2. `<ShelfFilters>`
3. **`<ShelfSort>`** — new, always visible, right-aligned
4. `<ShelfTagFilter>`
5. `<ClearFilters>` (conditional)
6. grid / `<EmptyFilterResult>`

The store's `sortByCreatedAtDesc` invariant is
preserved (D12). `addBook` and `updateBook` in the
store do not change.

### `formatReadingDuration` (NEW, in `src/lib/format/reading-duration.ts`)

```ts
export function formatReadingDuration(
  startedAt: string,
  finishedAt: string
): string;
```

Pure function. D9 format table. ~8 unit tests cover
the boundaries (same day, 1 day, 2-7, 8-30, 31+, plus
rounding edges for the months branch).

The `src/lib/format/` directory is new but tiny (one
file). It mirrors the `src/lib/validation/` layout.

### `DetailMeta` (MODIFIED)

Three new conditional `<p>` lines under "Added on …",
rendered in fixed order (per the strengthened FR-7 in
the spec). The existing inline date format
(`Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`)
is extracted into a `formatDate(date: string)` helper
at the top of the file so all four lines (including
the existing "Added on") share one formatter.

The "Read over" line uses
`formatReadingDuration(startedAt, finishedAt)`. Only
rendered when both dates are set.

## 5. Storage adapter changes

**None.** Same as every prior spec since 003. The new
fields flow through the existing `BookInput` shape and
the existing `addBook` / `updateBook` methods. No
migration is required — old localStorage records are
valid because both fields are optional, and the
validator returns `undefined` for missing values.

## 6. Decisions & trade-offs

- **D-P1. The store's `sortByCreatedAtDesc` is
  preserved.** Two layers of sort, by design: the
  store owns "library order" (an invariant of
  `useBookLibrary.getState().books`); the shelf owns
  "view order" (a per-user UI preference). Removing
  the store's sort would change the contract that
  `addBook` and `updateBook` rely on. Keeping it means
  the shelf sort is a strict superset of the existing
  behavior.
- **D-P2. `sortBooks` runs on the filtered list, not
  the unfiltered one.** Cheaper, and the user only
  sees the filtered slice. A `useMemo` keyed on
  `[filteredBooks, sort]` is sufficient — no
  `useDeferredValue`, no debounce, no second memo for
  "filtered then sorted".
- **D-P3. Reading duration is a derived string, not
  a stored field.** The dates are the source of truth.
  Storing duration would be a denormalization that
  drifts from the dates if either is edited.
- **D-P4. Months use a 30.4375-day average.** 365.25
  / 12. This is documented in the helper's doc comment
  and surfaced in the test cases (31 days → "1 month",
  365 → "12 months", 400 → "13 months"). Rounded with
  `Math.round` so the "nearest whole month" wording in
  the spec is honored.
- **D-P5. No `useCallback` for the `setSort` callback
  passed to `<ShelfSort>`.** `setSort` (returned by
  `useState`) is stable. Wrapping it would be
  ceremony with no benefit.
- **D-P6. Default sort is `"recently-added"`, not
  "remembered from last session".** Consistent with
  the rest of the shelf's local-only state (search,
  tag, status filter). Reloading the page resets to
  the default; users who want a different default
  re-pick it in 2 seconds.
- **D-P7. Empty `<Input type="date">` value is the
  empty string `""`.** Browsers vary in what they
  emit when the picker is cleared (some emit `""`,
  others emit `undefined`). We normalize: if the
  input is falsy, we treat it as "no date" and omit
  the field from `BookInput`. The validator accepts
  `""` as "no date" for the same reason.
- **D-P8. `formatDate` is a private helper inside
  `DetailMeta.tsx`, not exported.** It's a one-liner
  used four times in that file. A future spec that
  needs the same formatter in a second place can
  extract it to `src/lib/format/date.ts`. YAGNI for
  now.
- **D-P9. The new `<ShelfSort>` row is always
  visible.** A "currently collapsed" affordance would
  be a separate UI decision and isn't requested. The
  right-aligned `<Select>` is small enough to live
  on the shelf at all times.
- **D-P10. No keyboard shortcut for the sort.** No
  `S` key binding, no `Cmd+]`. The `<Select>` is
  tab-focusable like any other control; that's
  enough.
- **D-P11. The "Read over" line uses "a day" (not
  "1 day") for 0 / 1 day.** Matches English idiom
  ("in a day", not "in 1 day"). D9 documents this.
  The phrasing stays in English — the rest of the UI
  is English-only (en-GB locale for dates, en-US
  convention for plurals; the current UI is
  consistent enough that a future i18n spec can
  rephrase in bulk).

## 7. Risks

- **Bundle size.** Minimal. No new dependency. The
  two new helpers are tiny pure functions. The new
  `<ShelfSort>` is a thin shadcn `<Select>` wrapper
  that reuses a primitive already in
  `src/components/ui/`. Expected delta: < 1 kB on
  the shelf route, similar to spec 011's
  `ClearFilters`. Recorded in the T8 commit message.
- **TypeScript widening.** `startedAt` / `finishedAt`
  are `string | undefined` everywhere. No narrow
  guards needed at the call sites because the
  validator returns `undefined` and the form
  converts to/from the empty string. If a future
  refactor ever widens the type to `string` (e.g.
  for a required `startedAt` on `read` books), the
  conditional rendering in `DetailMeta` and the
  nulls-last logic in `sortBooks` would need to
  change. Documented in code comments; flagged in
  the spec's out-of-scope deferrals.
- **`new Date("YYYY-MM-DD")` interpretation.** The
  validator uses `new Date(raw + "T00:00:00Z")` to
  force UTC parsing — this avoids the
  "midnight-in-local-time" gotcha. The format
  helper does not need any timezone handling because
  it operates on the raw `YYYY-MM-DD` string. This
  separation keeps the surface area small.
- **Sort stability on ties.** JavaScript's
  `Array.prototype.sort` is stable per ECMA-262
  (since ES2019). The default sort in V8 is
  TimSort. The T2 test suite includes a tie case
  per comparator to make this guarantee observable
  (and to lock it in).
- **Edit form prefill reset.** `EditBookDialog`
  uses `key={book.id}` on the `<BookForm>`, which
  causes React to unmount / remount the form when
  the book changes. This means the `useState`
  initial values are picked up on every edit. The
  new date fields are pre-filled from
  `book.startedAt` / `book.finishedAt` exactly the
  same way `book.coverUrl` is, so this just works.
  A future refactor that removes the `key` would
  need to revisit this. Documented in
  `EditBookDialog`.
- **`<input type="date">` browser variance.** The
  native date picker UI varies by browser (Chrome
  vs Firefox vs Safari). We accept the variance —
  it's a standard primitive, no library. The
  underlying `value` is always `YYYY-MM-DD` (or
  empty), which the validator and `sortBooks`
  handle uniformly.

## 8. Rollout

- **No migration, no flag, no `StorageAdapter`
  change.** The only "migration" is that the
  validator starts accepting two new optional fields,
  which is a superset of the old behavior — old
  payloads are still valid.
- **No `package.json` change.** `<input type="date">`
  is native. `Intl.*` is built-in. `localeCompare`
  is built-in.
- **Manual QA** (per spec §13, 12 steps): covered by
  the new tests + an interactive smoke-test of the
  detail page and the shelf sort menu. Step 12
  (regression sanity across specs 002, 005, 006,
  007, 008, 009, 010, 011) is run by re-running
  the existing test suites and exercising the
  flows in the browser.
- **Verification:**
  `npm run lint && npm run test && npx tsc --noEmit`
  all pass; `npm run build` succeeds; no new `any`;
  no new dependencies.
- **Expected test count after 012:** **~433** (386
  from spec 011 + ~47 new from spec 012: 14
  `sortBooks` + 8 `formatReadingDuration` + 10
  validator + 6 `BookForm` + 3 `ShelfSort` + 4
  `ShelfList` integration + ~2 `DetailMeta` — the
  exact split will be settled in `tasks.md`).
- **Spec status transition:** Draft → Approved (this
  document) → Implemented (after T8).
