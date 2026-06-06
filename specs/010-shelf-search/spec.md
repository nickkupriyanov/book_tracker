# Spec: Shelf Search & Filter

> **Status:** Implemented
> **Author:** —
> **Created:** 2026-06-06
> **Implemented:** 2026-06-06 (T1–T6)
> **Spec ID:** 010-shelf-search
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 002 (shelf list), spec 005 (detail view)
> **Successor:** —

---

## 1. Problem

The shelf already has a status filter (spec 002 D4): tabs above the
grid for `All` / `Want to read` / `Reading` / `Read`. That's the only
filter. As the library grows, finding a book by title or author means
scanning the whole grid; recalling a book by the tag the user filed it
under isn't possible from the shelf at all.

The data is already searchable on disk — `Book.title`, `Book.author`,
and `Book.tags` are all in the localStorage blob. There's no
"matches" model that ties them together for the shelf view.

## 2. Goal

Add a **text search** and a **tag chip filter** to the shelf, in
addition to the existing status tabs. All three combine with AND:
a book is shown only if it matches the active status tab AND has at
least one of the selected tags AND matches all search tokens.

Out of scope (per the design discussion 2026-06-06):
review-text search, fuzzy matching, URL persistence, sort options,
search-result highlighting, debounced input, "Clear all" button.

## 3. Non-goals

- **No search over `Book.review` text.** Review bodies are rich
  ProseMirror JSON; surfacing snippets of them in card-sized results
  changes the shelf's job from "browse your library" to "search your
  notes". Revisit in a future journal/annotation spec.
- **No fuzzy / typo-tolerant matching.** Substring is enough for a
  personal library of dozens to a few hundred books.
- **No URL persistence.** Filter state is local to the shelf page,
  same posture as spec 002 D4.
- **No sort / order changes.** Spec 002 already establishes
  "insertion order" as the shelf's sort. This spec doesn't touch it.
- **No "Clear all" button.** Each filter is cleared independently.
- **No debounce on the search input.** Filtering runs on every
  keystroke; for local-library scale, the O(n) string match is
  imperceptible.
- **No server-side search.** Local-first (constitution §1).
- **No changes to `StorageAdapter`, `Book`, or any domain type.**

## 4. Decisions

### D1. Search fields — `title` + `author` + `tag values`

The search input matches a case-insensitive substring in any of
three fields:

- `Book.title`
- `Book.author`
- any string in `Book.tags[]`

Review text, quote text, and notes are deliberately excluded (see
§3). The user typically remembers the title, the author, or the tag
they filed it under; those three cover the realistic recall paths.

### D2. Search matching — AND-tokens, case-insensitive

A search string is split on whitespace into tokens. Each token must
match (substring, case-insensitive) at least one of the searchable
fields. Example: `tol fantasy` matches a book with `title = "Tolkien
and the Fantasy Tradition"` and `tags = ["essay", "fantasy"]`
(both tokens match across the fields).

- Leading / trailing / repeated whitespace is ignored.
- Empty tokens are dropped.
- The order of tokens does not matter.
- Punctuation inside a token is treated literally (no regex, no
  tokenisation beyond whitespace). `c.s. lewis` becomes two tokens
  `c.s.` and `lewis`.

### D3. Tag chip filter — multi-select, OR within tags

A row of toggleable chips above the grid, one chip per unique tag
across all books. Clicking a chip toggles its selection. A book
passes the tag filter if it has at least one of the selected tags
(OR within the tag set). Combining with the search / status is AND.

- The list of tags is the **set union** of all `Book.tags` across
  the library, sorted alphabetically (locale-independent, plain
  string sort — `sort()` with no comparator).
- If the union is empty, the chip row is hidden entirely (the
  library has no tagged books; nothing to filter by).
- If the union is > 20 tags, the row scrolls horizontally
  (`overflow-x-auto`).
- Selected chips use the `secondary` Badge variant; unselected use
  `outline`. `role="checkbox"` + `aria-checked` for a11y.

### D4. Filter composition — AND across categories, OR within

- **AND** between categories: a book must pass the status filter
  AND the search filter AND the tag filter.
- **OR** within tags: a book must have ≥ 1 of the selected tags.
- Empty / default filter (`"all"` status, no search, no selected
  tags) is the identity filter — every book passes.

### D5. State — local to `ShelfList`, not persisted

Per spec 002 D4: filter state is component-local. A page reload
resets the filters. No `localStorage`, no URL params, no
`useSearchParams`. This is the simplest, most-cozy posture: a
filter is a temporary lens, not a stored view.

### D6. Empty state — generic message

`EmptyFilterResult` currently says "No books with this status."
That message is too narrow now that filters can combine. The new
message: **"No books match your filters."** No CTA — the user can
clear individual filters above (per D5, no "Clear all" button).

### D7. Architecture — pure function + dumb components

`filterBooks(books, criteria): Book[]` lives in `src/lib/`, takes
plain data, returns plain data. No React, no DOM. Tested in
isolation with TDD (co-located test file, per spec 008 D-P1
convention). The UI components are controlled and dumb: they
read a value, render it, and call `onChange` / `onToggle` when
the user interacts. `ShelfList` owns the state.

## 5. Why this spec exists now

The user filed a roadmap item on 2026-06-06 (after spec 008 T8
verification). The status tabs have been the only shelf filter
since spec 002; with the library growing, recall-by-text and
recall-by-tag are the two realistic paths to a book, and both are
missing. The building blocks are already in place — shadcn `Input`
and `Badge` are in the UI library, the `Book` type already has
all three searchable fields, the shelf already has a controlled
filter pattern to copy. This spec is small, contained, and
unblocks both browsing and triage workflows.

## 6. UX

### 6.1 Read mode — `<ShelfClient>` with new filter row

Layout (top to bottom inside `<main>`):

```
┌─────────────────────────────────────────────────┐
│  Book Tracker                       [+ Add book]│  ← unchanged
├─────────────────────────────────────────────────┤
│  🔍  Search title, author, or tag…              │  ← NEW: ShelfSearch
├─────────────────────────────────────────────────┤
│  All (12)  Want (3)  Reading (2)  Read (7)     │  ← unchanged: ShelfFilters
├─────────────────────────────────────────────────┤
│  #essay  #fiction  #history  #reread  ...       │  ← NEW: ShelfTagFilter
│  (only if any book has tags; scrollable if > 20)│
├─────────────────────────────────────────────────┤
│  [ BookCard ]  [ BookCard ]  [ BookCard ]  ... │  ← unchanged
│                                                 │
│  or                                             │
│                                                 │
│  No books match your filters.                   │  ← EmptyFilterResult (text changed)
└─────────────────────────────────────────────────┘
```

### 6.2 `ShelfSearch`

- Renders a shadcn `Input type="search"`.
- Placeholder: `Search title, author, or tag…`
- `aria-label="Search books"`, `data-testid="shelf-search"`.
- Controlled: `value` from props, `onChange` bubbles up.
- The native browser ✕ button on `type="search"` is acceptable; we
  don't add a custom one in MVP. Users can also select-all + delete
  or backspace.

### 6.3 `ShelfTagFilter`

- Renders a horizontal flex of `Badge` chips.
- If `tags` prop is empty, the component returns `null` (nothing
  rendered; no "No tags" placeholder).
- If `tags.length > 20`, the wrapping div gets
  `overflow-x-auto whitespace-nowrap`.
- Selected chips: `variant="secondary"`, `aria-checked="true"`.
- Unselected chips: `variant="outline"`, `aria-checked="false"`.
- Each chip is a `<button>` for keyboard activation
  (Enter / Space).

### 6.4 `ShelfList` state additions

```ts
const [filter, setFilter] = useState<FilterValue>("all");     // existing
const [search, setSearch] = useState<string>("");             // NEW
const [selectedTags, setSelectedTags] = useState<string[]>([]); // NEW

const allTags = useMemo(
  () => Array.from(new Set(books.flatMap((b) => b.tags))).sort(),
  [books]
);

const filteredBooks = useMemo(
  () => filterBooks(books, { search, tags: selectedTags, status: filter }),
  [books, search, selectedTags, filter]
);
```

`useMemo` keeps the filter recomputation off the hot path; with
small libraries this is mostly a defensive measure, but it costs
nothing.

### 6.5 Empty / loading / error states

- **Loading / error:** unchanged, owned by `ShelfClient` (status
  reads from `useBookLibrary`).
- **Empty library:** unchanged, `EmptyShelf` (no books at all).
- **Filter match-zero:** `<EmptyFilterResult />` with the new
  message "No books match your filters." Same component, same
  positioning, different copy.

## 7. Functional requirements

- FR-1. A search input is visible at the top of the shelf, above
  the status tabs.
- FR-2. Typing in the search input narrows the visible cards in
  real time (no submit button, no debounce).
- FR-3. Search is case-insensitive and tokenised on whitespace
  (AND-join of tokens).
- FR-3a. A search token matches a substring of `title`, `author`,
  or any tag value.
- FR-4. A row of tag chips is visible when the library has ≥ 1
  tag, hidden otherwise.
- FR-5. Clicking a tag chip toggles its selection. Selected chips
  have a distinct visual style (secondary vs outline).
- FR-6. Multiple tag chips can be selected simultaneously. The
  filter is OR within the selected set: a book matches if it has
  ≥ 1 of the selected tags.
- FR-7. The status tab filter, the search, and the tag chips
  combine with AND: a book must pass all three.
- FR-8. Each filter is cleared independently. There is no "Clear
  all" button.
- FR-9. Filter state resets on page reload (D5).
- FR-10. If no books match, `EmptyFilterResult` shows "No books
  match your filters." in place of the grid.
- FR-11. Tag chips scroll horizontally if there are > 20 unique
  tags.
- FR-12. Search and tag filtering do not mutate the store; they
  only narrow the rendered list.

## 8. Data

### 8.1 New file `src/lib/shelf-filter.ts`

```ts
import type { Book, ReadingStatus } from "@/types/book";

export interface FilterCriteria {
  search: string;
  tags: string[];
  status: "all" | ReadingStatus;
}

export function filterBooks(books: Book[], criteria: FilterCriteria): Book[];
```

Internal helpers (not exported; tested directly via `filterBooks`):

```ts
function parseSearchTokens(raw: string): string[];
function matchesStatus(book: Book, status: FilterCriteria["status"]): boolean;
function matchesTags(book: Book, selected: string[]): boolean;
function matchesSearch(book: Book, tokens: string[]): boolean;
```

### 8.2 No changes to `Book` or `StorageAdapter`

Search and tag filtering are read-side operations on the existing
`Book` shape. No new fields, no new persistence, no new storage
methods. Constitution §3 ("types are the contract") is satisfied
by leaving the contract alone.

## 9. Storage interface

**No changes.** `StorageAdapter` keeps its four methods
(`listBooks`, `addBook`, `updateBook`, `deleteBook`). The new
filtering is a pure read-side operation in the UI layer.

## 10. Edge cases & errors

- **Empty search string** → `parseSearchTokens("")` returns `[]`,
  which short-circuits `matchesSearch` to `true` (no filter
  applied). Standard identity behaviour.
- **No tags in library** → `allTags` is `[]`, `<ShelfTagFilter />`
  returns `null` (no empty-state placeholder).
- **> 20 unique tags** → chip row is `overflow-x-auto`. No
  truncation, no fade, no "show more" — horizontal scroll is
  cheap and discoverable on mobile.
- **All filters active, zero matches** → `EmptyFilterResult` with
  the new message; no error, no warning toast.
- **Token with punctuation** (`c.s. lewis`) → split on whitespace,
  not on punctuation. Tokens are `["c.s.", "lewis"]`. The user
  will type a contiguous substring and get substring matches; if
  `c.s.` isn't in the data, that token simply fails to match
  and the book is excluded.
- **Token with non-ASCII / Cyrillic** → `.toLowerCase()` is
  Unicode-aware in JS (it lowercases Cyrillic correctly).
  No special handling needed.
- **Tag with whitespace** → can't happen: `validateBookInput`
  already normalises tags via `validateTags` (lowercased, trimmed,
  max 24 chars). Tags with internal whitespace are stored as a
  single trimmed string but the validator rejects strings with
  internal whitespace in most form flows. To be safe, the
  filter does not split on internal whitespace inside a tag —
  a tag is a single token at the tag level, but the search
  index matches it as a substring.
- **Many books (1000+)** → `filterBooks` is O(n × m) where n =
  books, m = tokens + tags. For 1000 books × 5 tokens × 3 fields,
  this is ~15 k `String.prototype.includes` calls — well under
  10 ms in practice. No optimisation needed for MVP.
- **Stale `selectedTags` after a book is deleted** → irrelevant
  in the rendering: `useMemo` recomputes when `books` changes,
  and the filter only matches books that still exist.
- **A book whose only tag is the only one selected, then the
  book is deleted, leaving the tag selection dangling** → same as
  above; the dangling selection just means no books match, and
  `EmptyFilterResult` shows the new message.

## 11. Acceptance criteria

- [ ] `npm run lint && npm run test` are green.
- [ ] `src/lib/shelf-filter.ts` exports `filterBooks` and
      `FilterCriteria` exactly as in §8.1.
- [ ] `filterBooks` is TDD-covered with ≥ 12 unit tests covering:
      empty criteria, single-token search, multi-token AND-search,
      case-insensitivity, whitespace handling, empty-tag-filter,
      single-tag match, multi-tag OR match, status filter alone,
      all three combined, no-match case, books with no tags.
- [ ] `<ShelfSearch />` is a controlled shadcn `Input` with
      `aria-label="Search books"`, `data-testid="shelf-search"`,
      and placeholder text per §6.2.
- [ ] `<ShelfTagFilter />` renders one chip per tag, hides
      itself when no tags exist, scrolls horizontally when
      there are > 20 tags, toggles selection on click.
- [ ] `<EmptyFilterResult />` shows "No books match your filters."
      in place of "No books with this status."
- [ ] `ShelfList` integrates the new state and the new
      `useMemo`-cached `filteredBooks`.
- [ ] Search, tag chips, and status tabs combine with AND
      (verified by an integration test).
- [ ] Each filter can be cleared independently (verified by
      RTL tests).
- [ ] Filter state resets on page reload (verified by checking
      that no `localStorage` / URL is touched on filter change).
- [ ] No new `any` introduced.
- [ ] `tsc --noEmit` clean.
- [ ] `npm run build` succeeds. No new dependencies.
- [ ] No new domain types beyond `FilterCriteria` and the
      internal helpers in `src/lib/shelf-filter.ts`.
- [ ] Constitution §4: no new dependencies.
- [ ] Manual QA (per §13 below) is run and recorded in the
      T8 commit message.

## 12. Open questions

None. The brainstorm (2026-06-06) resolved all open questions:
- **D1** — search fields: title + author + tags (not review).
- **D2** — tokenisation: AND on whitespace.
- **D3** — tag UI: multi-select chips.
- **D4** — composition: AND across categories, OR within tags.
- **D5** — persistence: local-only.
- **D6** — empty state: generic message.
- **D7** — architecture: pure function + dumb components.

Future spec candidates (not part of 010):

- **Sort options** — by author, by date added, by rating, by title.
  Pair with this spec if sort is also wanted; or separate.
- **URL-persisted filters** — shareable filtered views.
- **Review-text search** — needs a snippet model in the card.
- **Highlighted matches** in card title / author.
- **Fuzzy / typo-tolerant matching** — overkill for personal
  libraries of dozens of books.

## 13. Manual QA

To be run after T8 build verification, before commit:

1. Shelf with 0 books — `EmptyShelf` unchanged, no new UI.
2. Shelf with 5 books, none tagged — no chip row visible.
3. Shelf with 25 unique tags — chip row scrolls horizontally.
4. Type `tol` in search → only books with "tol" in title/author/tag
   remain. Case-insensitive.
5. Type `tol fantasy` → only books matching both tokens.
6. Click a tag chip → its variant changes to `secondary`, grid
   narrows.
7. Click a second tag chip → grid shows books with EITHER tag (OR
   within tags).
8. Combine search + tag chip + status tab → only books passing
   all three remain.
9. Filter to zero matches → `EmptyFilterResult` shows the new
   message.
10. Clear the search input → grid reverts (or narrows further if
    tag / status are still active).
11. Click a selected tag chip again → deselects; grid widens.
12. Reload the page → all filters reset.
13. Clicking Edit / Delete on a card still works (sanity check
    that we didn't break the dialog flow).
14. Adding a new book with a new tag → the new tag appears in
    the chip row.
15. Removing a book that was the only one carrying a tag → the
    tag chip disappears (or, if selected, no longer affects
    the grid).

---

## Appendix A. Why this spec is small

The only new pure logic is `filterBooks` (~30 lines, fully TDD).
The only new UI is two controlled inputs. The only new wiring is
three `useState` hooks and a `useMemo` in `ShelfList`. The only
new test surface is `filterBooks` (TDD, ~12 tests) plus a handful
of RTL tests for the new components. Total estimated test count
after 010: ~360 (342 from spec 008 baseline + ~15–20 new from
spec 010).

No new dependencies, no new domain types, no new storage
methods. The biggest single change is the layout: a search input
and a chip row in `ShelfList`.

## Appendix B. Why no `Clear all` button

Considered, rejected. Reasoning:

- Each filter is cleared via a different affordance (backspace in
  search, click a selected chip, click "All" tab). All three are
  discoverable, all three are local to the filter they affect.
- A "Clear all" button adds visual weight that is invisible
  99 % of the time (no filters active) and a single source of
  truth for "what counts as cleared" (does it deselect chips
  too? does it clear search? does it leave the All tab?).
- A `useState`-level reset is one line of code in
  `ShelfList` if we ever want it.

## Appendix C. Why no debounce

The filter is O(n × m) on `Book` data only. For a personal
library of dozens to a few hundred books, the cost is sub-ms
even on a slow phone. Debouncing would add 200 ms of perceived
slack between typing and seeing results, which is a worse UX
than no debounce. Revisit if/when the library exceeds ~5 k
books or filter logic grows (e.g., review-text search).
