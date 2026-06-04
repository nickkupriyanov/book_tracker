# Spec: Book Rating

> **Status:** Approved
> **Author:** nickkupriyanov
> **Created:** 2026-06-04
> **Spec ID:** 006-rating
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

A book on the shelf has a status (want / reading / read) and a
list of tags, but no subjective quality signal. The user can
finish a book, mark it read, and still have no way to remember
"did I actually enjoy it?". A 1-5 rating is the simplest
subjective signal and the natural first of the per-book content
features flagged in spec 005 §12 D5 ("Rating, review, quotes,
and reading time are separate specs that will each introduce
their own optional fields").

## 2. Goal

The user can rate any book 1-5 (integer) and see the rating on
the detail page. The rating is optional (a book can be "Not
rated"), persisted with the book, editable through the existing
Edit dialog, and reflected immediately on the detail page
without a manual reload.

## 3. Non-goals

- We do **not** support half-stars (0.5, 1.5, etc.).
- We do **not** support a 0/10 scale. The MVP rating is 1-5.
- We do **not** compute aggregated statistics per shelf
  (average rating, distribution, top-rated books).
- We do **not** sort or filter the shelf by rating.
- We do **not** display the rating on `BookCard` in the
  shelf. Rating is detail-view content (spec 005 D7); the
  card stays summary-only.
- We do **not** add a "Clear rating" button on the detail
  page (D3). The user clears via the Edit dialog.
- We do **not** support bulk rating (rate multiple books at
  once).
- We do **not** support free-floating ratings (ratings
  without a book).
- We do **not** add a "review" or any other long-form
  content. Review is a separate spec.
- We do **not** add quotes, reading time, or any other
  per-book content. Each is a separate spec.
- We do **not** track a rating history (no "rated on
  timestamp"). One rating per book, latest write wins.

## 4. Users & scenarios

**Story.** Mia finishes *Piranesi* and loved it. She opens
the detail page, sees "Rating — Not rated", clicks the
fourth star. The page re-renders with 4 filled stars
within the same tick. She refreshes the page — the 4
stars are still there.

**Story.** Andy tries to rate but his browser storage is
full. He clicks a star, the spinner appears briefly, then
a toast says "Couldn't save rating. Try again." The page
still shows the old rating (or "Not rated") and the stars
re-enable.

**Story.** Sara wants to rate a book and also fix a typo
in the title. She opens the Edit dialog, picks "4 stars"
from the new Rating Select, fixes the title, saves. The
toast says "Updated"; the detail page now shows 4 stars
and the corrected title.

**Story.** Kim rated *Project Hail Mary* a 2 last year
and now wants to remove the rating. She opens the Edit
dialog, picks "Not rated" from the Rating Select, saves.
The detail page now shows 5 empty stars under the
"Rating" heading.

## 5. UX

- **On the detail page** (`/book/<id>`):
  - A new section titled "Rating" appears in the page
    main, below `<DetailMeta>` and above any future
    sections (review, quotes, reading time). The section
    uses the existing `<DetailSection>` wrapper from spec
    005 T1 (D7).
  - The section contains a row of 5 star buttons. Each
    star is a small icon button; the row sits left-aligned
    inside the section content area.
  - If the book has a `rating` of N, stars 1..N are
    **filled** (solid icon), stars N+1..5 are **empty**
    (outlined icon). A `aria-label` on each button reads
    e.g. "Rate 4 stars".
  - If the book has no `rating`, all 5 stars are empty.
    The section is **not hidden** — the user can see the
    feature exists and click to rate.
  - Click on star N → sets the rating to N. There is no
    "click the current star to clear" toggle (D3); clear
    is via Edit.
  - During the in-flight `useBookLibrary.updateBook` call,
    all 5 stars are `disabled` (greyed, no pointer
    events). After the call resolves (success or failure),
    they re-enable.
  - On storage failure: `toast.error("Couldn't save
    rating. Try again.")` via sonner (D7). The book's
    rating in the store is unchanged; the visual state
    continues to reflect the last successful rating.

- **In the Add / Edit dialogs** (via the shared `BookForm`
  from spec 003):
  - A new field "Rating" appears **after** the Status
    Select and before the Cover URL field.
  - Implemented as a shadcn `Select` with six options:
    "Not rated" (value `""`), "1 star", "2 stars",
    "3 stars", "4 stars", "5 stars" (values `"1"` ..
    `"5"`).
  - The Select's initial value reflects
    `initialValues.rating` as a string, or `""` if
    `initialValues.rating` is `undefined`.
  - On submit, the form converts the string back to a
    number 1-5 (or omits the field if `""`), passing
    through the validator.

## 6. Functional requirements

- FR-1. `Book` and `BookInput` in `src/types/book.ts` have
  an optional field `rating?: 1 | 2 | 3 | 4 | 5`.
- FR-2. `validateBookInput` accepts a `rating` of 1, 2,
  3, 4, or 5, or its absence. Any other value
  (non-integer, out of range, wrong type) produces an
  inline `errors.rating` message; the `BookInput` is
  not returned.
- FR-3. `BookForm` renders a "Rating" Select field after
  the Status field. Options: "Not rated", "1 star",
  "2 stars", "3 stars", "4 stars", "5 stars". The
  Select's value reflects `initialValues.rating` (or
  "Not rated" if absent).
- FR-4. `BookForm`'s `onSubmit` builds a `BookInput`
  that includes `rating: <number>` if the user picked a
  value, or omits the field if the user picked
  "Not rated". The value passes through the validator.
- FR-5. `RatingStars` is a presentational component with
  props
  `{ value?: 1|2|3|4|5; onChange: (rating: 1|2|3|4|5) => void; disabled?: boolean }`.
  It renders 5 star buttons. Stars 1..`value` are
  filled, the rest are empty. Click on star N calls
  `onChange(N)`. When `disabled` is true, all buttons
  are non-interactive.
- FR-6. `RatingSection` is a "smart" component with
  props `{ book: Book }`. It renders
  `<DetailSection title="Rating">` containing
  `<RatingStars value={book.rating} onChange={...} disabled={isUpdating} />`.
  On `onChange`, it calls
  `useBookLibrary.updateBook(book.id, { ...book, rating })`
  and tracks an in-flight `isUpdating` state.
- FR-7. On `updateBook` rejection, `RatingSection`
  calls `toast.error("Couldn't save rating. Try again.")`
  via sonner, sets `isUpdating` back to false, and
  leaves the visual state unchanged (the store update
  failed; the page still shows the last successful
  rating).
- FR-8. `BookDetail` renders
  `<RatingSection book={book} />` in its main area,
  after `<DetailMeta book={book} />`. A book without
  `rating` shows 5 empty stars (the section is
  visible, not hidden).

## 7. Data

`src/types/book.ts` adds one optional field to `Book`
(and, transitively, to `BookInput` via the existing
`Omit` definition):

```ts
export interface Book {
  // ... existing fields ...
  /** Optional 1-5 rating. Absent means "not rated". */
  rating?: 1 | 2 | 3 | 4 | 5;
}
```

`src/lib/validation/book.ts` gains a new validator:

```ts
function validateRating(
  raw: unknown,
  errors: Record<string, string>
): 1 | 2 | 3 | 4 | 5 | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 1 ||
    raw > 5
  ) {
    errors.rating = "Rating must be a whole number between 1 and 5.";
    return undefined;
  }
  return raw as 1 | 2 | 3 | 4 | 5;
}
```

`validateBookInput` calls `validateRating(input["rating"], errors)`
alongside the existing field validators. The returned
`BookInput` value spreads `rating` into the object only
when the validator returns a non-`undefined` value
(matching the existing `coverUrl` pattern).

**Migration:** none required. Existing books in
localStorage have no `rating` field. `JSON.parse` reads
them as objects without the key; accessing `.rating`
returns `undefined`; the type and validator both treat
`undefined` as "not rated".

## 8. Storage interface

No changes. `LocalStorageAdapter` persists arbitrary
`Book` shapes via `JSON.stringify` / `JSON.parse`; an
additional optional field is transparent. The future
`HttpStorageAdapter` (Month 2) will inherit the same
behaviour.

## 9. Edge cases & errors

- **Book has no `rating`.** The detail page renders the
  "Rating" section with 5 empty stars. The user knows
  the feature exists and can click to rate. The Edit
  dialog shows "Not rated" as the Select value.
- **Invalid `rating` value** (e.g., 6, 3.5, "four",
  `null`). The validator catches it in `BookForm` and
  shows an inline `errors.rating` message. The form
  does not submit.
- **In-flight rating update.** While
  `useBookLibrary.updateBook` is pending, the stars are
  `disabled` and not interactive. A second click is a
  no-op.
- **Storage failure on rating update.** The adapter
  throws (quota, disabled, etc.). `RatingSection` catches
  the error, calls `toast.error("Couldn't save rating.
  Try again.")`, sets `isUpdating` back to false. The
  store is unchanged. The visual state continues to
  reflect the last successful rating.
- **Stale `book.id`** (book deleted in another tab).
  `updateBook` throws "not found" via the adapter. The
  toast fires, the stars re-enable, the page itself
  stays in the "found" state until the next store
  update. Same failure mode as a stale-id Edit save in
  spec 003.
- **Edit dialog flow with rating.** Same as any other
  field: the value passes through the validator, the
  store updates on save, the detail page reflects the
  new rating alongside any other edited fields.

## 10. Acceptance criteria

- [ ] `Book` and `BookInput` in `src/types/book.ts` have
      `rating?: 1 | 2 | 3 | 4 | 5`.
- [ ] `validateBookInput` accepts `rating: 1` .. `5` and
      rejects out-of-range / non-integer / wrong-type
      values with an inline `errors.rating` message.
- [ ] A book without `rating` validates successfully
      (no `errors.rating`).
- [ ] `BookForm` renders a "Rating" Select after the
      Status field with the 6 options ("Not rated" +
      "1 star" .. "5 stars").
- [ ] Submitting the form with a value passes
      `rating: <number>` through the validator and into
      the `BookInput`.
- [ ] Submitting the form with "Not rated" omits
      `rating` from the `BookInput`.
- [ ] `RatingStars` renders 5 stars; stars 1..`value`
      are filled, the rest are empty.
- [ ] Clicking a star in `RatingStars` calls
      `onChange(N)`.
- [ ] When `disabled` is true, all star buttons are
      non-interactive.
- [ ] `RatingSection` renders
      `<DetailSection title="Rating">` with the stars
      and a smart `onChange` handler that calls
      `useBookLibrary.updateBook`.
- [ ] `BookDetail` renders `<RatingSection book={book} />`
      after `<DetailMeta>`.
- [ ] A book without `rating` shows 5 empty stars (the
      section is visible, not hidden).
- [ ] Storage failure during a rating update shows a
      toast "Couldn't save rating. Try again." and
      re-enables the stars.
- [ ] No raw HTML controls where shadcn has an
      equivalent.
- [ ] Lint and tests pass; no new `any` introduced.
- [ ] No new npm dependencies.

## 11. Out of scope (for this spec)

- Half-stars (0.5, 1.5, etc.).
- 0/10 scale.
- Aggregated statistics (average rating per shelf,
  distribution, top-rated).
- Sort or filter the shelf by rating.
- Rating displayed on `BookCard` in the shelf.
- A "Clear rating" button on the detail page.
- Bulk rating (rate multiple books at once).
- Free-floating ratings (rating without a book).
- Review (long-form text) — separate spec.
- Quotes — separate spec.
- Reading time — separate spec.
- Rating history (no "rated on timestamp" or
  "previously rated X"). One rating per book, latest
  write wins.

## 12. Decisions

Resolved 2026-06-04.

- **D1. Rating scale: 1-5 integers, no 0, no half-stars.**
  Simplest literal type `1 | 2 | 3 | 4 | 5`. No rounding,
  no half-star visual, no edge cases. Aligns with the
  simplest possible MVP and the constitution's "small
  surface area" principle. Goodreads uses 0-5 with
  half-stars; IMDb uses 1-10 integers. The MVP picks the
  smallest viable scale; future specs can revisit if
  user feedback demands it.
- **D2. `rating` is optional in `Book` and `BookInput`.**
  Absence means "not rated". The validator, the form, and
  the section all treat `undefined` as "not rated". No
  sentinel value like 0 (which would be ambiguous with
  "rated 0 stars").
- **D3. No "Clear" button on the detail page.** Clicking
  the current rating does not clear it; the user clears
  via the Edit dialog. This keeps the detail-page UX
  simple (5 clickable stars, no toggle semantics) and
  centralises the "set or clear" choice in the form,
  where other edits happen too. The trade-off: removing
  a rating takes two clicks (open Edit → pick "Not
  rated" → save) instead of one. Acceptable for MVP.
- **D4. Form uses a `Select`; detail page uses
  clickable stars.** Two surfaces, two idioms: the form
  is data entry (Select with explicit options and
  discoverable "Not rated"), the detail page is quick
  interaction (click to rate). The form's `Select` is
  the source of truth for "set or clear"; the stars on
  the detail page only set.
- **D5. Section title: "Rating".** Calm, declarative,
  not "Your rating" or "How would you rate it?". The
  section is for content display, not a question.
- **D6. `RatingSection` is "smart": it imports
  `useBookLibrary` and calls `updateBook` directly.**
  Mirrors the pattern of `EditBookDialog` and
  `DeleteBookDialog` from specs 003 and 004. The
  orchestrator (`BookDetail`) just drops the section
  in with `<RatingSection book={book} />`. No callback
  wiring from the parent. Future sections (review,
  quotes, reading time) follow the same pattern (spec
  005 D7).
- **D7. Storage failure UX: `toast.error` via sonner.**
  "Couldn't save rating. Try again." The toast is the
  user's feedback. The stars re-enable, the store is
  unchanged, the visual state reflects the last
  successful rating. Inline error UI under the stars
  was considered (matching the Edit / Delete dialog
  pattern) but rejected: the section is meant to be
  glanceable, not chatty, and a toast doesn't take up
  screen real estate. Console-only logging was also
  rejected: silent failures violate the constitution's
  "empty / loading / error states are first-class"
  principle.
- **D8. `BookForm` state for rating is a string (Select
  value).** On submit, convert: `""` → omit the field;
  `"1"` .. `"5"` → `Number(v) as 1|2|3|4|5`. This
  matches the existing `coverUrl` pattern (string in
  form, optional in `BookInput`). shadcn `Select`
  values are strings, so a string-state form is the
  natural fit.

## 13. Open questions

All resolved (see Decisions D1-D8).
