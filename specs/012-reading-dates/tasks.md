# Tasks: Reading Dates

> **Status:** Pending
> **Spec:** `../spec.md` (Draft)
> **Plan:** `../plan.md` (Approved)

Each task is small enough to be one commit. Mark a
task `[x]` only when its acceptance line is satisfied
and `npm run lint && npm run test` passes.

Order: T1–T2 build the new pure functions in isolation
(TDD); T3 expands the type and validator; T4–T5 build
the two new UI components; T6 wires sort into
`ShelfList` and the two dialogs; T7 surfaces the dates
on the detail page; T8 verifies.

---

## T1. `formatReadingDuration` helper (TDD) — [ ]

- **Files:**
  `src/lib/format/reading-duration.ts` (new),
  `tests/lib/format/reading-duration.test.ts` (new).
- **Acceptance:**
  - Exports
    `formatReadingDuration(startedAt: string, finishedAt: string): string`
    per spec FR-8 / D9.
  - Pure: no React, no DOM, no `Date.now()` call site
    (only `new Date(string)` for the day-diff math, or
    arithmetic on `Date.UTC(...)`).
  - Format rules (all locked in by tests):
    - `startedAt === finishedAt` → `"a day"`
    - `days === 1` → `"a day"`
    - `2 <= days <= 7` → `"N days"`
    - `8 <= days <= 30` → `"N weeks"` (rounded down
      via `Math.floor(days / 7)`)
    - `days >= 31` → `"N months"` (rounded to nearest
      whole month using a 30.4375-day average:
      `Math.round(days / 30.4375)`)
  - 8 unit tests covering: same day, 1 day, 2 days, 7
    days, 8 days, 30 days, 31 days, 365 days. Plus 2
    edge tests: 400 days → "13 months" (rounding
    up); 6 days → "6 days" (boundary of the
    days/weeks split). Total: 10 tests.
  - `npm run lint && npm run test` green.
- **Notes:** the helper has no other consumers in this
  spec. `DetailMeta` (T7) is the only caller.
  Months-average constant (30.4375) lives as a
  `const` at the top of the file with a one-line
  comment.

## T2. `sortBooks` + `SortValue` (TDD) — [ ]

- **Files:**
  `src/lib/shelf-sort.ts` (new),
  `tests/lib/shelf-sort.test.ts` (new).
- **Acceptance:**
  - Exports
    `type SortValue` (union of 7 strings),
    `SORT_LABELS: Record<SortValue, string>`, and
    `sortBooks(books: Book[], sort: SortValue): Book[]`.
  - Pure: no React, no DOM, no mutation. Returns a
    new array.
  - Stable: ties on the comparator preserve input
    order. (JS `Array.prototype.sort` is stable per
    ECMA-262 since ES2019 — verified by a tie test.)
  - Comparator table matches spec FR-5 exactly:
    - `recently-added`:
      `b.createdAt.localeCompare(a.createdAt)`
    - `recently-started`:
      `b.startedAt.localeCompare(a.startedAt)`,
      nulls last
    - `recently-finished`:
      `b.finishedAt.localeCompare(a.finishedAt)`,
      nulls last
    - `title-az`:
      `a.title.localeCompare(b.title)`
    - `author-az`:
      `a.author.localeCompare(b.author)`
    - `highest-rated`:
      `(b.rating ?? -1) - (a.rating ?? -1)`,
      nulls last
    - `longest-read`:
      `days(b) - days(a)` where `days` is
      `(Date.UTC(finished) - Date.UTC(started)) /
      86_400_000`; books without both dates go last
      (use `days = -1` so they sort below any
      `days >= 0` book)
  - `sortBooks(books, "recently-added")` returns the
    same order as
    `sortByCreatedAtDesc(books)` from
    `src/state/book-library.ts`. (Cross-checked by a
    test that imports both and asserts equality — or
    by re-implementing the comparator locally in the
    test. Pick the cleaner one in implementation.)
  - 14 tests covering: 1 immutability (input array
    unchanged), 1 stability (ties preserve order), 1
    return type (new array), 1 happy-path per sort
    mode (7), 1 nulls-last per sort mode that
    involves an optional field (4 of the 7:
    `recently-started`, `recently-finished`,
    `highest-rated`, `longest-read`), 1
    recently-added ↔ store sort equivalence. Total:
    14 tests.
  - `npm run lint && npm run test` green.
- **Notes:** the helper has no React or DOM. `Date.UTC`
  is used for the days diff (no timezone surprises).
  The `days` sentinel for the longest-read mode is
  `-1`, well below any possible positive day count.

## T3. `Book` type + `validateStartedAt` / `validateFinishedAt` + cross-field (TDD) — [ ]

- **Files:**
  `src/types/book.ts` (modified),
  `src/lib/validation/book.ts` (modified),
  `tests/lib/validation/book.test.ts` (modified —
  add new tests; create the file if it does not
  exist).
- **Acceptance:**
  - `Book` interface gains two new optional fields,
    `startedAt?: string` and `finishedAt?: string`,
    with JSDoc comments matching spec §Appendix A.
  - `BookInput` (currently `Omit<Book, "id" |
    "createdAt">`) inherits the new fields
    automatically. No edit to `BookInput`.
  - `validateStartedAt` and `validateFinishedAt`
    helpers added to `src/lib/validation/book.ts`,
    following the same per-field helper pattern as
    `validateCoverUrl` / `validateTags`.
  - Both helpers:
    - Accept `undefined` / `null` / `""` → return
      `undefined`, no error.
    - Reject non-strings → field-level error
      (`"Started must be a string."` /
      `"Finished must be a string."`).
    - Reject strings that don't match
      `^\d{4}-\d{2}-\d{2}$` →
      `"Started must be a YYYY-MM-DD date."` /
      `"Finished must be a YYYY-MM-DD date."`.
    - Reject calendar-invalid dates (e.g.
      `"2026-02-30"`, `"2026-13-01"`) — verified by
      constructing
      `new Date(raw + "T00:00:00Z")` and confirming
      `d.toISOString().slice(0, 10) === raw`. On
      mismatch →
      `"Started must be a real calendar date."` /
      same for finished.
    - Return the canonical string on success.
  - `validateBookInput` integrates both calls in the
    same one-pass style as the other fields, and adds
    a cross-field check after both helpers succeed:
    if both are defined and
    `startedAt > finishedAt` (lexicographic),
    push `errors.finishedAt = "Finish date must be
    on or after the start date."`.
  - The new fields are spread into the final
    `BookInput` only when defined, matching the
    existing pattern for `coverUrl` / `rating` /
    `review` / `quotes`.
  - 10 new tests in
    `tests/lib/validation/book.test.ts`:
    1. omit both → ok, value has neither
    2. set `startedAt` only → ok, value has it
    3. set `finishedAt` only → ok, value has it
    4. set both, same day → ok
    5. set both, `startedAt < finishedAt` → ok
    6. set both, `startedAt > finishedAt` →
       error on `finishedAt`
    7. malformed `startedAt` (`"2026/04/01"`) →
       error on `startedAt`
    8. calendar-invalid `startedAt`
       (`"2026-02-30"`) → error on `startedAt`
    9. calendar-invalid `finishedAt`
       (`"2026-13-01"`) → error on `finishedAt`
    10. both fields set with empty strings → ok,
        value has neither (the `""` → `undefined`
        normalization happens at the form boundary
        and is re-tested there; the validator
        accepts `""` as "no date" for symmetry.)
  - `npm run lint && npm run test` green. No
    regression in the 20+ existing validator tests.
- **Notes:** the calendar-validity check uses
  `new Date(raw + "T00:00:00Z")` (forced UTC) to
  avoid the local-midnight rollover. The
  round-trip check (`toISOString().slice(0, 10)`)
  catches every case where `Date` silently rolls
  the day forward.

## T4. `BookForm` — two date inputs (TDD) — [ ]

- **Files:**
  `src/components/BookForm.tsx` (modified),
  `src/features/add-book/AddBookDialog.tsx`
  (modified),
  `src/features/edit-book/EditBookDialog.tsx`
  (modified),
  `tests/components/BookForm.test.tsx` (modified —
  add new tests; create the file if it does not
  exist),
  `tests/features/edit-book/EditBookDialog.test.tsx`
  (modified — add 1 prefill test).
- **Acceptance:**
  - `BookForm` gains two new `useState` hooks:
    `startedAt` and `finishedAt`, initialized from
    `initialValues.startedAt` and
    `initialValues.finishedAt` (with `?? ""`).
  - `BookForm` renders two new
    `<Input type="date">` fields in this order,
    after the Tags field and before the submit
    button:
    - `<Label htmlFor="book-form-started">Started
      (optional)</Label>` +
      `<Input id="book-form-started" type="date"
      value={startedAt} onChange={(e) =>
      setStartedAt(e.target.value)} … />`
    - `<Label htmlFor="book-form-finished">Finished
      (optional)</Label>` + the same pattern for
      `finishedAt`.
  - Errors from `validateBookInput` for
    `startedAt` / `finishedAt` are rendered under
    the field using the existing pattern (matching
    `title` / `author` / `coverUrl`).
  - `handleSubmit` spreads the two values into the
    `BookInput` payload only when non-empty, using
    the same `...(value ? { key: value } : {})`
    pattern as `coverUrl` and `rating`.
  - `canSubmit` is unchanged — no date is required.
  - `AddBookDialog`'s `initialValues` gains
    `startedAt: ""` and `finishedAt: ""`.
  - `EditBookDialog`'s `initialValues` spreads
    `book.startedAt` and `book.finishedAt` when
    defined, using the same `…(value !== undefined ?
    { key: value } : {})` pattern as `coverUrl`.
  - 6 new RTL tests in
    `tests/components/BookForm.test.tsx`:
    1. renders the two new fields with the correct
       `id` and labels
    2. accepts a valid `YYYY-MM-DD` value
       (controlled-input change)
    3. accepts empty values (form submit omits the
       fields from `BookInput`)
    4. shows an error on `startedAt` when the
       validator rejects the field (mock or feed
       an invalid value via initial)
    5. shows an error on `finishedAt` when
       `finishedAt < startedAt` (mock or feed)
    6. preserves the existing canSubmit behaviour:
       empty dates are still submittable
  - 1 new RTL test in
    `tests/features/edit-book/EditBookDialog.test.tsx`:
    `EditBookDialog` pre-fills the form with
    `book.startedAt` and `book.finishedAt` when
    present, and with empty strings when absent.
  - `npm run lint && npm run test` green. No
    regression in the existing `BookForm` /
    `AddBookDialog` / `EditBookDialog` tests.
- **Notes:** the two new fields' `onChange`
  handler is `(e) => setStartedAt(e.target.value)`
  (no `Date` parsing). The native date input
  always emits a `YYYY-MM-DD` string (or empty)
  when the user picks or clears a date. The
  validator does the rest.

## T5. `ShelfSort` component (TDD) — [ ]

- **Files:**
  `src/features/shelf-list/ShelfSort.tsx` (new),
  `src/features/shelf-list/index.ts` (modified —
  add export),
  `tests/features/shelf-list/ShelfSort.test.tsx`
  (new).
- **Acceptance:**
  - Exports `ShelfSort` with props
    `{ value: SortValue; onChange: (v: SortValue)
    => void }`.
  - Renders a shadcn `<Select>` (the same primitive
    used by `BookForm` for status / rating).
  - The trigger shows `SORT_LABELS[value]`.
  - The list of items is the seven labels, in the
    canonical order from `SORT_LABELS`.
  - `data-testid="shelf-sort"` on the trigger
    element.
  - Selecting an option calls `onChange(value)`
    exactly once with the new `SortValue`.
  - 3 RTL tests:
    1. renders the trigger with the current
       `SORT_LABELS[value]` text
    2. opens the list and selects
       `"recently-started"`; asserts `onChange`
       called once with `"recently-started"`
    3. has an accessible name on the trigger
       (the `SelectValue` text serves as the
       accessible name)
  - `index.ts` exports `ShelfSort` alongside the
    existing exports.
  - `npm run lint && npm run test` green.
- **Notes:** the component is dumb / presentational.
  The parent (`ShelfList`) owns the state. The
  trigger has no placeholder — the current label
  is always shown.

## T6. `ShelfList` wiring (sort state, `sortBooks`, `<ShelfSort>`) — [ ]

- **Files:**
  `src/features/shelf-list/ShelfList.tsx`
  (modified),
  `tests/features/shelf-list/ShelfList.test.tsx`
  (modified — add 4 new tests).
- **Acceptance:**
  - `ShelfList` adds
    `useState<SortValue>("recently-added")` at the
    top of the component, alongside the four
    existing shelf-local state hooks.
  - `ShelfList` adds
    `sortedBooks = useMemo(() => sortBooks(filteredBooks, sort), [filteredBooks, sort])`
    right after the `filteredBooks` useMemo.
  - The grid's `map()` iterates over
    `sortedBooks` (was `filteredBooks`). The
    `filteredBooks.length === 0` check is
    unchanged.
  - JSX adds `<ShelfSort value={sort} onChange={setSort} />`
    in a new `<div className="flex justify-end">`
    row **between** `<ShelfFilters>` and
    `<ShelfTagFilter>`. The row is always visible
    (no conditional render).
  - 4 new integration tests:
    1. default sort is `"recently-added"`; the
       grid shows books in `createdAt` desc order
       (same as before)
    2. selecting `"title-az"` reorders the grid
       alphabetically by title
    3. selecting `"recently-started"` puts books
       with `startedAt` first (newest first) and
       books without `startedAt` at the bottom
    4. changing the sort does not reset search,
       tag, or status state (and vice versa)
  - `npm run lint && npm run test` green. No
    regression in the existing `ShelfList` tests
    (default sort preserves order).
- **Notes:** the store's `sortByCreatedAtDesc`
  invariant is preserved. The shelf sort is
  purely a view-level override.

## T7. `DetailMeta` — conditional date lines — [ ]

- **Files:**
  `src/features/detail-view/DetailMeta.tsx`
  (modified),
  `tests/features/detail-view/DetailMeta.test.tsx`
  (modified — add 4 new tests; create the file if
  it does not exist).
- **Acceptance:**
  - Extracts a private `formatDate(date: string): string`
    helper at the top of the file, using
    `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`.
    The existing "Added on {addedOn}" line is
    refactored to use the helper — no copy change.
  - Adds three new conditional `<p>` lines under
    the existing "Added on …" line, in this fixed
    order, each only rendered when its condition
    holds (no empty placeholders):
    1. `{book.startedAt && <p>Started {formatDate(book.startedAt)}</p>}`
    2. `{book.finishedAt && <p>Finished {formatDate(book.finishedAt)}</p>}`
    3. `{book.startedAt && book.finishedAt && <p>Read over {formatReadingDuration(book.startedAt, book.finishedAt)}</p>}`
  - Same visual style as the existing "Added on …"
    line: `text-muted-foreground text-sm`, no icon.
  - 4 new RTL tests:
    1. a book with no dates — only "Added on …"
       is rendered, no new lines
    2. a book with only `startedAt` — "Started …"
       is rendered, no "Finished" or "Read over"
    3. a book with both dates (multi-day) — all
       three new lines render
    4. a book with both dates (same day) — "Read
       over a day" is rendered
  - `npm run lint && npm run test` green. No
    regression in the existing `DetailMeta` tests.
- **Notes:** `DetailMeta` is a presentational
  component. The conditional lines do not need a
  wrapper element — they just render in source
  order. `formatReadingDuration` is imported
  from `@/lib/format/reading-duration`.

## T8. Polish & verification — [ ]

- **Files:**
  `specs/012-reading-dates/spec.md` (status →
  `Implemented`),
  `specs/012-reading-dates/plan.md` (already
  `Approved` — no change),
  `specs/012-reading-dates/tasks.md` (status →
  `Done`, ticks).
- **Acceptance:**
  - All spec §11 acceptance criteria verified.
  - `npm run lint` clean.
  - `npm run test` passes: **~433** (386 from
    spec 011 baseline + ~47 new from spec 012:
    10 `formatReadingDuration` + 14 `sortBooks` +
    10 validator + 6 `BookForm` + 3 `ShelfSort` +
    4 `ShelfList` integration + 1
    `EditBookDialog` prefill + 4 `DetailMeta`).
    Adjust the count in this file if the actual
    number differs by more than ±2.
  - `npx tsc --noEmit` clean.
  - `npm run build` succeeds.
  - Bundle deltas (route `First Load JS`):
    - `/` (shelf): expected ~+0.5 kB (the
      `<ShelfSort>` shadcn Select, two new date
      inputs, the `sortBooks` import). No new
      dependencies.
    - `/book/[id]` (detail): unchanged (no new
      heavy components on the detail route; the
      three conditional lines and the
      `formatReadingDuration` import are byte-cheap).
  - No new `any` introduced.
  - No new npm dependencies added.
  - Manual QA (per spec §13, 12 steps) covered
    by tests and a final interactive smoke test
    on the shelf + detail pages.
- **Notes:** the verification report is recorded
  in the T8 commit message. Bundle deltas are
  approximate and depend on Next.js minification;
  record the actual numbers, not the estimates.
