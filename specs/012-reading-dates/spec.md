# Spec: Reading Dates

> **Status:** Draft
> **Author:** —
> **Created:** 2026-06-06
> **Spec ID:** 012-reading-dates
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 001 (add book), spec 003 (edit book), spec 005 (detail view), spec 006 (rating)
> **Successor:** —

---

## 1. Problem

The book record has `createdAt` ("added on") and `status`
(`want` / `reading` / `read`), but no record of **when the user
actually started or finished reading**. Three concrete gaps:

1. **The detail page shows only "Added on"**, which conflates
   "I bought / heard about this book" with "I started reading
   it". A book added in March and started in June currently
   reads as "Added in March" — there is no signal that the
   user actually opened it in June.

2. **There is no way to sort the shelf by reading timeline.**
   "Recently added" works as a proxy for "what I engaged with
   recently", but a user mid-year who wants to look at "the
   books I finished this spring" or "the books I started and
   abandoned in the last quarter" cannot.

3. **Reading duration is invisible.** Without a start and
   finish date, there is no way to look at a book later and
   see "I read this over 3 weeks" — a small but warm piece of
   data the cozy UX is missing.

The fix in this spec is small and well-scoped: add two
optional date fields to the `Book` domain, surface them in
the form and on the detail page, and add a sort menu on the
shelf that includes the new fields (plus a couple of natural
adjacent options).

## 2. Goal

Add `startedAt` and `finishedAt` (optional, calendar dates) to
the `Book` domain, with a form input for each, a derived
"Read over X" line on the detail page, and a shelf sort menu
that includes "Recently started" and "Recently finished"
alongside "Recently added" and a few natural alphabetical
options.

## 3. Non-goals (out of scope)

- **Tight coupling between `status` and the dates.** Per D1,
  the dates are independent: a `want` book can have a
  `startedAt`, a `read` book can have neither. We do not
  auto-stamp `startedAt` on transition to `reading` or
  `finishedAt` on transition to `read`.
- **Date-time granularity.** Both fields are calendar dates
  (`YYYY-MM-DD`). No time-of-day, no timezone math. Per D2.
- **Reading sessions / progress tracking.** "I read pages
  10–50 on Tuesday". A separate spec, possibly a journal.
- **Reading streaks, goals, stats.** Constitution §1 forbids
  dashboard-like metrics. Any "books-read-this-year"
  counter is out of scope.
- **Sort persistence.** Like search / tag / status filter,
  the sort lives in `ShelfList` local state. Reloading the
  page resets it to `Recently added`.
- **Migration of existing records.** Old localStorage books
  have neither field. They are still valid; the fields are
  optional. No data migration.
- **New `StorageAdapter` method.** Existing
  `addBook` / `updateBook` carry the new fields through
  `BookInput` unchanged. No new method, no new contract.
- **Editing dates on the detail page directly.** Dates are
  edited only via the Add / Edit Book dialog (the existing
  form). No inline edit, no separate "Reading dates" dialog.

## 4. Decisions

### 4.1 New decisions for 012

- **012-D1. Dates are independent of `status`.** A book with
  `status: "want"` may have a `startedAt` (the user started
  reading before adding the book to the tracker, or simply
  forgot to update the status). A book with
  `status: "read"` may have neither or only one of the
  dates. Editing `status` does not auto-stamp any date. The
  three fields are independent axes; the user is in full
  control. (Rationale: simpler model, no surprise
  side-effects, matches the project's general "no magic"
  posture.)

- **012-D2. Both dates are calendar dates in `YYYY-MM-DD`
  form.** Not ISO datetimes. `<input type="date">` natively
  produces this shape. Sort order is lexicographic
  (`a.localeCompare(b)`), which for `YYYY-MM-DD` is the same
  as chronological. No timezone conversions, no
  `Intl.DateTimeFormat` gymnastics. (Rationale: the cozy UX
  is about days, not moments. Datetime adds a timezone
  surprise vector for zero benefit.)

- **012-D3. Both dates are optional.** A book may have
  `startedAt` and no `finishedAt` (still reading, or
  finished but not recorded), `finishedAt` and no
  `startedAt` (started before the tracker existed, only the
  finish date is known), or neither. The Add and Edit forms
  make both fields optional. The validator returns
  `undefined` for each when the value is missing or empty,
  and pushes no error.

- **012-D4. Cross-field rule: if both are set,
  `startedAt <= finishedAt`.** Enforced at the form
  boundary by the validator (pushes an error on
  `finishedAt`: `"Finish date must be on or after the start
  date."`). Same-day (`startedAt === finishedAt`) is valid
  ("Read over a day"). Either field alone is always valid.

- **012-D5. Seven sort options in `<ShelfSort>`:**

  1. `recently-added` (default — current behavior)
  2. `recently-started`
  3. `recently-finished`
  4. `title-az`
  5. `author-az`
  6. `highest-rated`
  7. `longest-read`

  Defined as a discriminated string union `SortValue`, with a
  `SORT_LABELS: Record<SortValue, string>` map. A pure
  function `sortBooks(books, sort)` implements the sort. See
  §5 / Appendix A for the comparator table. (Rationale:
  matches what a user reaching for a book-tracker would
  expect on a shelf, without overreaching into "stats".)

- **012-D6. Nulls-last for every sort that involves an
  optional field.** For `recently-started` and
  `recently-finished`, books without the field go to the
  end. For `highest-rated`, books without a rating go to the
  end. For `longest-read`, books without both dates go to
  the end. The "Recently added" sort is unaffected —
  `createdAt` is always present. (Rationale: keeps the
  interesting signal at the top of the list, instead of
  buried under "I haven't filled this in yet" entries.)

- **012-D7. Sort lives in `ShelfList` local state.** Not in
  the Zustand store, not in `localStorage`, not in the URL.
  Reloading the page resets to `Recently added`. Mirrors the
  posture of spec 002 D4 (filter) and spec 010 D5 (search,
  tag filter). (Rationale: the sort is a shelf-view
  preference, not a property of the library.)

- **012-D8. Reading duration is shown only when both dates
  are set.** Derived value, no new field. Format (per
  D9) appears in `DetailMeta` under "Started …" and
  "Finished …" as a third line: "Read over {N days / a day
  / N weeks / N months}". (Rationale: avoids storing
  derived state; the dates are the source of truth.)

- **012-D9. Reading duration format:**

  - `finishedAt === startedAt` → `"a day"`
  - `days === 1` → `"a day"`
  - `2 <= days <= 7` → `"N days"` (e.g. "3 days")
  - `8 <= days <= 30` → `"N weeks"` (rounded down;
    e.g. 10 days → "1 week", 28 → "4 weeks")
  - `days >= 31` → `"N months"` (rounded to nearest whole
    month using a 30.4375-day average; e.g. 31 days →
    "1 month", 365 → "12 months", 400 → "13 months")

  (Rationale: humans don't think in days past a month; the
  format is intentionally coarse after the first week.)

- **012-D10. `<ShelfSort>` placement.** A new row in the
  `ShelfList` `space-y-6` stack, **between** `<ShelfFilters>`
  and `<ShelfTagFilter>`, right-aligned. Always visible
  (unlike `<ClearFilters>`, which is conditional). Order:

  1. `<ShelfSearch>` (spec 010)
  2. `<ShelfFilters>` (spec 002)
  3. `<ShelfSort>` — **new**, always visible
  4. `<ShelfTagFilter>` (spec 010)
  5. `<ClearFilters>` (spec 011, conditional)
  6. grid or `<EmptyFilterResult>`

  (Rationale: keeps the stable, always-on controls
  contiguous; the conditional `<ClearFilters>` stays at the
  bottom near the grid.)

- **012-D11. Sort runs **after** filtering, not before.**
  `sortedBooks = sortBooks(filteredBooks, sort)`. The
  `filterBooks` pipeline is unchanged. (Rationale: don't
  sort books the user is not going to see.)

- **012-D12. Store-level `sortByCreatedAtDesc` is kept.**
  It remains the invariant for `useBookLibrary.getState()
  .books`: the list is always in `createdAt` desc order, so
  `addBook` and `updateBook` don't need to think about it.
  The shelf sort is a view-level override on top. (Rationale:
  separates "library order" from "shelf view"; both have
  clear ownership and don't fight each other.)

- **012-D13. No new npm dependency.** `<input type="date">` is
  native. `Intl.DateTimeFormat` and `Intl.NumberFormat` are
  built-in. `localeCompare` is built-in. No date-picker
  library, no dayjs, no date-fns.

### 4.2 Carried over from earlier specs

- **002-D4 / 010-D5.** Filter state and tag state are local
  to the shelf page; not persisted, not in the URL. Sort
  follows the same posture (D7).
- **006-D1, 006-D2.** `rating` is an integer 1–5, optional,
  "not rated" by absence. The shelf sort `highest-rated`
  treats absent ratings as nulls-last.
- **008-D2, 008-D6.** Rich-text `Review` lives on `Book`; the
  form / validator boundary is the single normalisation
  point. The new `startedAt` / `finishedAt` fields go
  through the same boundary.
- **011-D9.** No new dependency, no new `StorageAdapter`
  method, no new domain aggregate. The fields are two
  optional scalars on `Book`.

## 5. Functional requirements

### FR-1. `Book.startedAt` and `Book.finishedAt`

- New optional fields on `Book` (and therefore on
  `BookInput`): `startedAt?: string` and
  `finishedAt?: string`.
- When present, the value is a calendar date in
  `YYYY-MM-DD` form. The form is the only writer;
  the validator enforces it.
- Existing `Book` records without these fields are valid.
  The validator returns `undefined` for each when the
  payload does not include the field.

### FR-2. Validator

- `validateStartedAt` and `validateFinishedAt` accept
  `undefined` / `null` and an empty string as "no date" —
  return `undefined`, no error.
- A non-empty string must match `^\d{4}-\d{2}-\d{2}$` AND
  round-trip through `new Date()` (calendar validity:
  e.g. `2026-02-30` is rejected).
- If both are set in `validateBookInput` and
  `startedAt > finishedAt`, push error
  `finishedAt: "Finish date must be on or after the start
  date."`.
- `validateBookInput` integrates both calls in the same
  one-pass style as the other fields; failures are
  collected, not thrown.

### FR-3. Add Book form

- `AddBookDialog` initialises `startedAt: ""` and
  `finishedAt: ""` (alongside the existing defaults).
- `BookForm` renders two new `<Input type="date">` fields,
  labeled "Started (optional)" and "Finished (optional)".
- Empty input → empty string in state → field omitted from
  `BookInput` on submit (existing spread pattern).
- Non-empty input → ISO date string → included in
  `BookInput` and validated by `validateBookInput`.
- Errors from the validator render under the field, same
  pattern as `title` / `author` / `coverUrl`.
- `canSubmit` is unchanged: empty dates are valid; only
  title and author are required.

### FR-4. Edit Book form

- `EditBookDialog` pre-fills `book.startedAt` and
  `book.finishedAt` (when present) into the form's local
  state. The `<Input type="date">` value is the raw ISO
  string when set, `""` otherwise.
- Save passes the (possibly trimmed) values through the
  same `validateBookInput` → `updateBook` path as the other
  fields.

### FR-5. Shelf sort — `sortBooks` and `<ShelfSort>`

- New module `src/lib/shelf-sort.ts` exporting:
  - `type SortValue = "recently-added" | "recently-started" | "recently-finished" | "title-az" | "author-az" | "highest-rated" | "longest-read"`
  - `SORT_LABELS: Record<SortValue, string>`
  - `sortBooks(books: Book[], sort: SortValue): Book[]` —
    pure, non-mutating, stable.
- New component `src/features/shelf-list/ShelfSort.tsx`:
  - Props: `{ value: SortValue; onChange: (v: SortValue) => void }`.
  - Renders a shadcn `<Select>` (same primitive as
    `BookForm`'s status / rating selects).
  - `data-testid="shelf-sort"`.
  - Current value drives the trigger label; selecting an
    option calls `onChange`.
- Stability: `sortBooks` uses the default
  `Array.prototype.sort`, which is stable per ECMA-262
  (since ES2019). Ties on the comparator (e.g. two books
  with the same `rating`, or two books missing both
  dates) preserve their input order — which is the
  store's `createdAt` desc order, since the input is
  `filteredBooks`.
- Comparator table (per D5 / D6 / D8 / D9):
  - `recently-added`:
    `b.createdAt.localeCompare(a.createdAt)` —
    no nulls (always present).
  - `recently-started`:
    `b.startedAt.localeCompare(a.startedAt)` —
    books without `startedAt` last.
  - `recently-finished`:
    `b.finishedAt.localeCompare(a.finishedAt)` —
    books without `finishedAt` last.
  - `title-az`:
    `a.title.localeCompare(b.title)` — no nulls.
  - `author-az`:
    `a.author.localeCompare(b.author)` — no nulls.
  - `highest-rated`:
    `(b.rating ?? -1) - (a.rating ?? -1)` —
    books without `rating` last.
  - `longest-read`:
    `days(b) - days(a)` where
    `days(b) = (b.finishedAt && b.startedAt) ?
       (Date(b.finishedAt) - Date(b.startedAt)) / 86_400_000
     : -1` — books without both dates last.

### FR-6. `ShelfList` integration

- New `useState<SortValue>("recently-added")` in
  `ShelfList`. Default mirrors the current
  `sortByCreatedAtDesc` behavior.
- New
  `sortedBooks = useMemo(() => sortBooks(filteredBooks, sort), [filteredBooks, sort])`.
- The grid is rendered from `sortedBooks`, not
  `filteredBooks` (FR-11).
- The store's `sortByCreatedAtDesc` invariant is unchanged
  (D12).
- JSX order (D10): search → filters → **sort** → tag
  filter → clear → grid.
- Switching the sort does not clear search, tags, or status
  tab, and vice versa. All four axes are independent
  shelf-local state.

### FR-7. `DetailMeta` display

- Three new optional lines under "Added on …", in this
  fixed order (only the lines whose condition holds
  render — no empty placeholders):
  1. "Started {long-date}" when `book.startedAt` is set.
  2. "Finished {long-date}" when `book.finishedAt` is set.
  3. "Read over {duration}" when both are set, via
     `formatReadingDuration(startedAt, finishedAt)`.
- Format for both date strings:
  `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`
  (already in use for `createdAt` in `DetailMeta`).
- No new copy / section / icon. Same muted-foreground
  `text-sm` style as the existing "Added on" line.

### FR-8. `formatReadingDuration` helper

- New module `src/lib/format/reading-duration.ts`.
- Signature:
  `formatReadingDuration(startedAt: string, finishedAt: string): string`.
- Format per D9:
  - `startedAt === finishedAt` → `"a day"`
  - `days === 1` → `"a day"`
  - `2 <= days <= 7` → `"N days"`
  - `8 <= days <= 30` → `"N weeks"` (floor)
  - `days >= 31` → `"N months"` (round to nearest whole
    month using a 30.4375-day average)
- Precondition: `startedAt <= finishedAt`. The caller
  (`DetailMeta`) only calls this when both are set; the
  validator ensures the invariant.

## 6. UX

### 6.1 Shelf layout (inside the `space-y-6` stack)

1. `<ShelfSearch … />` — unchanged (spec 010).
2. `<ShelfFilters … />` — unchanged (spec 002 / 011).
3. **New row.** Always visible. Right-aligned:
   ```tsx
   <div className="flex justify-end">
     <ShelfSort value={sort} onChange={setSort} />
   </div>
   ```
   The sort is a small, unobtrusive shadcn `<Select>` with
   the current label as the trigger. The placeholder in
   the trigger is the current `SORT_LABELS[value]`.
4. `<ShelfTagFilter … />` — unchanged (spec 010).
5. `<ClearFilters … />` — unchanged, conditional (spec 011).
6. Either `<EmptyFilterResult />` or the grid of
   `<BookCard>`s over `sortedBooks` (the previously
   `filteredBooks` — see FR-6 / FR-11).

### 6.2 BookForm layout (Add / Edit)

The new fields are added **after** "Tags (optional,
comma-separated)" and before the submit button. The order
becomes:

1. Title
2. Author
3. Status
4. Rating
5. Cover URL
6. Tags
7. **Started (optional)** — new
8. **Finished (optional)** — new
9. Submit

### 6.3 DetailMeta layout

```
┌──────────────────────────────────────────────┐
│ [cover image]    Title (serif)               │
│                  Author                      │
│                  [StatusPill]                │
│                  [tag] [tag] [tag]           │
│                  Added on 21 March 2026      │
│                  Started 1 April 2026        │  ← new
│                  Finished 15 April 2026      │  ← new
│                  Read over 2 weeks           │  ← new (only if both)
└──────────────────────────────────────────────┘
```

Each new line is muted-foreground, `text-sm`, no icon. They
render conditionally — no empty placeholder rows.

### 6.4 Examples

**Example A — fresh add.**
The user opens Add Book, types title and author, leaves
Started and Finished empty, clicks "Add book". The book is
created with neither date. The shelf shows it under
"Recently added". Detail page shows only "Added on {date}".

**Example B — recording a book already in progress.**
The user edits an existing book, sets Status = "Reading",
Started = "2026-04-01", leaves Finished empty, saves. Shelf
shows it under "Recently started" first, then "Recently
added". Detail page shows Started, no Finished, no
duration.

**Example C — finishing a book.**
The user edits the same book, sets Status = "Read",
Finished = "2026-04-15", Started = "2026-04-01", saves.
Detail page shows all three new lines. Shelf under "Recently
finished" shows this book at the top. Under "Longest read"
it sits at the bottom (a 2-week read), and the rest of the
library passes it.

**Example D — same-day read.**
The user adds a short book, started = finished =
"2026-05-30". Validator accepts (D4). Detail page shows
"Read over a day". The shelf sort "Longest read" puts this
book above any multi-day read; same-day reads tie, broken
by the stable sort (their relative order in the store's
`createdAt`-desc list is preserved).

## 7. Constraints

- Both date fields are optional at every layer (type,
  validator, form). No field is required.
- `startedAt <= finishedAt` (or one / both absent) is the
  only cross-field rule.
- The sort is `O(n log n)` on the filtered list — fine
  for the expected library scale (≤ a few hundred books).
  No debounce, no memoization beyond a single
  `useMemo([filteredBooks, sort])`.
- No new `any` (constitution §3.1). `Date` arithmetic uses
  raw numbers (ms / 86_400_000), no library.
- No new npm dependency.
- No regression in the 002 / 010 / 011 acceptance criteria.
- Reading-duration math: months use the
  30.4375-day average (365.25 / 12). Documented in the
  helper's doc comment; the user-visible rounding matches
  the spec table in D9.

## 8. Trade-offs

- **Date-only, not datetime.** Trivial for the cozy UX; no
  timezone math; lex-sort = chrono-sort. Cost: a user
  cannot record "I read pages 200–250 on Tuesday at 8 pm"
  — but that level of detail is not the shelf's job, and
  a future reading-session / journal spec can carry it.
- **Two new visible lines on the detail page.** "Added
  on", "Started …", "Finished …", "Read over …" is
  four lines in the worst case. Could be condensed into
  a single "Reading: 1 Apr → 15 Apr 2026 · 2 weeks" —
  but the three-line version is more scannable and matches
  the existing "Added on" pattern. Kept explicit.
- **Seven sort options.** A `<Select>` with 7 items is
  the right ceiling for a small cozy UI — comfortable
  to scan, no scrolling. Going past 10 would push us
  toward a different surface (button group, segmented
  control); we are well under that.
- **Sort on top of the store's `createdAt` desc.** A
  reader scanning the code might wonder why the store
  sorts and the shelf sorts too. The comment in D12
  (and in `ShelfList.tsx`) makes the ownership clear:
  store = "library order", shelf = "view order". Both
  layers are small and each is justified.
- **`<input type="date">` UX varies slightly by browser.**
  On Chrome / Firefox / Safari recent versions, it is a
  native date picker with a calendar grid. On older
  browsers it falls back to a text input. We accept the
  variance — it is a standard primitive, no library, no
  custom CSS needed. (Constitution §4 — "Don't add
  dependencies casually".)
- **No inline "duration" badge on the card.** Cards are
  already busy (cover, title, author, status, up to 3
  tags). Adding a 4th metadata line is visual noise. The
  detail page is the right place for derived stats.

## 9. Open questions

None at draft time. All four follow-up questions (user
input during brainstorming) were resolved with the
recommended option. The validation rule (`startedAt <=
finishedAt`) and the duration format table are locked
(D4, D9).

## 10. Glossary

- **`startedAt`.** Optional `YYYY-MM-DD` date the user
  started reading the book. Independent of `status`.
- **`finishedAt`.** Optional `YYYY-MM-DD` date the user
  finished reading. Independent of `status`.
- **Reading duration.** A derived string shown on the
  detail page when both dates are set. Format per D9.
- **Sort value.** One of seven discriminators; drives
  `sortBooks` and the `<ShelfSort>` trigger label.
- **Nulls-last.** In a sort that involves an optional
  field, books missing that field are placed at the end
  of the list, after all books that have it. This applies
  to `recently-started`, `recently-finished`,
  `highest-rated`, and `longest-read`. It does not apply
  to `recently-added` (createdAt is always present) or
  to `title-az` / `author-az` (always present).

## 11. Acceptance criteria

- [ ] `Book` has two new optional fields,
      `startedAt?: string` and `finishedAt?: string`.
      `BookInput` inherits them via `Omit<Book, …>`.
- [ ] `validateBookInput` accepts payloads that omit both
      fields, that set either, and that set both with
      `startedAt <= finishedAt`. It returns
      `{ ok: true, value }` in each case.
- [ ] `validateBookInput` rejects payloads where both
      fields are set and `startedAt > finishedAt`, with
      `errors.finishedAt` set to
      `"Finish date must be on or after the start date."`.
- [ ] `validateBookInput` rejects malformed dates
      (`"not-a-date"`, `"2026-13-01"`, `"2026-02-30"`)
      with a clear field-level error and does not surface
      unrelated fields as invalid.
- [ ] Empty / missing `startedAt` and `finishedAt` are
      treated identically by the validator and the form —
      no "required" error, no placeholder confusion.
- [ ] `AddBookDialog` opens with `startedAt: ""` and
      `finishedAt: ""` initial values.
- [ ] `EditBookDialog` pre-fills the form with the book's
      current `startedAt` and `finishedAt` when present,
      and `""` when absent.
- [ ] `BookForm` renders two `<Input type="date">` fields
      with the labels `"Started (optional)"` and
      `"Finished (optional)"`, in that order, after the
      Tags field and before the submit button.
- [ ] Submitting the Add / Edit form with valid dates
      results in a `Book` record where the corresponding
      `BookInput` carries the date strings; submitting
      with empty fields results in a `Book` record where
      neither field is set.
- [ ] The Add / Edit form does not require any date field
      to be filled in — `canSubmit` is unchanged.
- [ ] `sortBooks` exists in `src/lib/shelf-sort.ts`, is
      pure, and implements all seven sort modes exactly
      per FR-5.
- [ ] For every sort that involves an optional field,
      books missing the field are placed last
      (FR-5 / D6).
- [ ] `sortBooks` does not mutate its input array.
- [ ] `sortBooks(books, "recently-added")` returns the
      same order as the existing store-level
      `sortByCreatedAtDesc(books)`.
- [ ] `<ShelfSort>` renders a shadcn `<Select>` with
      `data-testid="shelf-sort"`, lists the seven options
      with their labels, and calls `onChange` exactly
      once per selection.
- [ ] `ShelfList` includes a `<ShelfSort>` between
      `<ShelfFilters>` and `<ShelfTagFilter>`, right
      aligned via `flex justify-end`, always visible.
- [ ] The default `sort` in `ShelfList` is
      `"recently-added"`, so the existing behavior (shelf
      shows books in `createdAt` desc) is preserved.
- [ ] Switching the sort re-renders the grid in the new
      order without resetting search, tag, or status
      state.
- [ ] Switching search, tag, or status does not reset
      the chosen sort.
- [ ] `DetailMeta` renders the "Started …" line iff
      `book.startedAt` is set, and "Finished …" iff
      `book.finishedAt` is set, using
      `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`.
- [ ] `DetailMeta` renders "Read over …" iff both
      `startedAt` and `finishedAt` are set, using
      `formatReadingDuration`.
- [ ] `formatReadingDuration` returns `"a day"` for
      `startedAt === finishedAt` and for a 1-day
      difference; `"N days"` for 2–7; `"N weeks"` for
      8–30; `"N months"` for 31+, rounded to the nearest
      whole month.
- [ ] The store's `sortByCreatedAtDesc` invariant and
      implementation are unchanged.
- [ ] No new `any` is introduced.
- [ ] No new npm dependencies are added.
- [ ] All 011 acceptance criteria continue to hold
      (no regressions in 002, 005, 006, 007, 008, 009,
      010, 011).
- [ ] `npm run lint`, `npm run test`, and
      `npx tsc --noEmit` all pass.
- [ ] `npm run build` succeeds. No new bundle delta to
      record (no new dependency).
- [ ] Test count grows by at least 40 from the 011
      baseline (386 → 426+) — see §12 for the rough
      breakdown by task.

## 12. Out-of-scope deferrals

- **Reading sessions / progress events.** A future
  journal-style spec could record "I read pages X–Y on
  date Z" and derive a richer reading timeline. The
  current spec only has start / finish anchors.
- **Reading streaks / year-in-review.** Constitution §1
  forbids dashboard metrics. A "books-read-this-year"
  counter is out of scope until the product direction
  changes.
- **URL-persisted sort.** Consistent with the rest of the
  shelf's local-only state (D7). A future spec could
  add `?sort=…` query params if cross-device or
  shareable views become a goal.
- **Sort by "currently reading" first.** A semantic
  re-ordering (status-aware) is intentionally not in
  scope; the seven sort options are pure
  field-based.
- **Date pickers for status transitions.** Auto-stamping
  `startedAt` when moving to `"reading"` is explicitly
  rejected in D1. The dates are user-set, not derived
  from status.

## 13. Manual QA

To be run during the verification task (T8 of
implementation). 12 steps:

1. **Fresh add.** Open Add Book, type title + author,
   leave Started and Finished empty, save. Open the
   detail page — only "Added on {date}" is shown.
2. **Add a date.** Edit the same book, set Started to
   today, leave Finished empty, save. Detail page now
   shows "Started {today}", no "Finished" line, no
   "Read over" line.
3. **Finish the book.** Edit again, set Finished to
   today, leave Started unchanged, save. Detail page
   shows all three new lines. Duration reads
   "Read over a day" (same day) or "Read over N days"
   (different day).
4. **Cross-field rejection.** Edit the book, set
   Started = "2026-06-10", Finished = "2026-06-01",
   submit. The form rejects with an error under the
   Finished field; the book is not saved.
5. **Sort by Recently started.** Shelf shows the book
   at the top under "Recently started". Books without
   `startedAt` are at the bottom.
6. **Sort by Recently finished.** Same as above, but
   driven by `finishedAt`.
7. **Sort by Title (A→Z).** Shelf is alphabetical by
   title. The previous sort is forgotten on reload
   (refreshes the page → back to "Recently added").
8. **Sort by Highest rated.** Rated books come first
   in descending order. Unrated books are at the bottom.
9. **Sort by Longest read.** Books with both dates
   come first, longest first. Books missing one or both
   dates are at the bottom.
10. **Filter interaction.** Type a search that
    matches only one book. The sort still applies to
    that single-result grid. Switching the sort does
    not clear the search.
11. **No new dependency.** `package.json` is unchanged
    in `dependencies` and `devDependencies` (only
    version bumps are acceptable; no new entries).
12. **Regression sanity.** All 002, 005, 006, 007, 008,
    009, 010, 011 manual flows still work — Add, Edit,
    Delete, Detail, Rating, Review, Quotes, Shelf
    search, Shelf tag filter, Shelf clear filters.

## Appendix A — Type contract

```ts
// src/types/book.ts — addition
export interface Book {
  // ... existing fields unchanged ...
  /** Optional date the user started reading. `YYYY-MM-DD`. */
  startedAt?: string;
  /** Optional date the user finished reading. `YYYY-MM-DD`. */
  finishedAt?: string;
}
```

`BookInput` (= `Omit<Book, "id" | "createdAt">`) inherits
the new fields automatically. `Quote`, `Review`,
`ReadingStatus`, `StorageAdapter` are unchanged.

```ts
// src/lib/shelf-sort.ts — new
export type SortValue =
  | "recently-added"
  | "recently-started"
  | "recently-finished"
  | "title-az"
  | "author-az"
  | "highest-rated"
  | "longest-read";

export const SORT_LABELS: Record<SortValue, string>;

export function sortBooks(books: Book[], sort: SortValue): Book[];
```

```ts
// src/lib/format/reading-duration.ts — new
export function formatReadingDuration(
  startedAt: string,
  finishedAt: string
): string;
```

## Appendix B — File layout (proposed for plan.md)

```
NEW
  src/lib/shelf-sort.ts
  src/lib/format/reading-duration.ts
  src/features/shelf-list/ShelfSort.tsx
  tests/lib/shelf-sort.test.ts
  tests/lib/format/reading-duration.test.ts
  tests/features/shelf-list/ShelfSort.test.tsx

MODIFIED
  src/types/book.ts
    - add `startedAt?: string`, `finishedAt?: string`
      to `Book` (BookInput inherits via Omit)
  src/lib/validation/book.ts
    - add validateStartedAt / validateFinishedAt
    - integrate both calls in validateBookInput
    - cross-field check: startedAt > finishedAt
      → error on `finishedAt`
  src/components/BookForm.tsx
    - two new useState hooks (startedAt, finishedAt)
    - two new <Input type="date"> blocks (after Tags)
    - spread both into the BookInput payload
  src/features/add-book/AddBookDialog.tsx
    - add `startedAt: ""`, `finishedAt: ""` to
      initialValues
  src/features/edit-book/EditBookDialog.tsx
    - spread book.startedAt / book.finishedAt
      into initialValues (same pattern as coverUrl)
  src/features/shelf-list/ShelfList.tsx
    - new useState<SortValue>("recently-added")
    - new sortedBooks useMemo
    - render <ShelfSort> between <ShelfFilters> and
      <ShelfTagFilter>
    - grid now maps over sortedBooks
  src/features/detail-view/DetailMeta.tsx
    - three new conditional <p> lines
    - extract formatDate() helper
  tests/components/BookForm.test.tsx
    - 6 new tests for the date fields
  tests/features/shelf-list/ShelfList.test.tsx
    - 4 new tests for sort wiring
  tests/features/detail-view/DetailMeta.test.tsx
    - 4 new tests for the conditional lines
  tests/lib/validation/book.test.ts (or similar)
    - 10 new tests for validateStartedAt /
      validateFinishedAt / cross-field

NO CHANGE
  src/storage/* (StorageAdapter + LocalStorageAdapter)
  src/state/book-library.ts (store-level sort preserved)
  src/lib/shelf-filter.ts
  src/features/shelf-list/{ShelfSearch,ShelfFilters,
    ShelfTagFilter,ClearFilters,EmptyFilterResult,
    BookCard,StatusPill}.tsx
  src/features/quote*, review*, rating*
```
