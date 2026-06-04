# Tasks: Book Rating

> **Status:** Draft
> **Spec:** `../spec.md`
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task
`[x]` only when its acceptance line is satisfied and
`npm run lint && npm run test` pass.

Order matters: T1 establishes the type and validator
contract; T2 builds the dumb star row that T3 composes
into a smart section; T4 extends the form; T5 wires the
section into the page; T6 polishes and verifies.

---

## T1. Type + validator (`Book.rating?`, `validateRating`)

- [x] **Files:**
  `src/types/book.ts` (modified),
  `src/lib/validation/book.ts` (modified),
  `tests/validation/book.test.ts` (modified).
- **Acceptance:**
  - `Book` and `BookInput` (via `Omit`) gain
    `rating?: 1 | 2 | 3 | 4 | 5`.
  - New `validateRating(raw, errors)` helper accepts
    `1..5` integers, accepts `undefined` / `null`
    (returns `undefined`, no error), and rejects
    out-of-range, non-integer, or wrong-type values
    with `errors.rating = "Rating must be a whole
    number between 1 and 5."`.
  - `validateBookInput` calls `validateRating` alongside
    the other field validators; the returned
    `BookInput` spreads `rating` into the object only
    when defined (mirroring the `coverUrl` pattern in
    the same function).
  - Validator tests cover: valid 1, valid 5, missing
    (`undefined`), missing (`null`), out-of-range high
    (6), out-of-range low (0), non-integer (3.5), wrong
    type ("4"). ≥ 4 tests.
- [x] **Notes:** the existing `tests/validation/book.test.ts`
  already has a "valid input" and several "invalid input"
  tests; this task extends that file. No new helper
  files in `src/lib/validation/`.

## T2. `RatingStars` (presentational star row)

- [x] **Files:**
  `src/features/rating/RatingStars.tsx` (new),
  `tests/features/rating/RatingStars.test.tsx` (new).
- **Acceptance:**
  - Props:
    `{ value?: 1|2|3|4|5; onChange: (rating: 1|2|3|4|5) => void; disabled?: boolean }`.
  - Renders 5 icon buttons using `lucide-react` `Star`.
  - Stars 1..`value` are filled (e.g. `fill-current
    text-foreground`); stars `value+1`..5 are unfilled
    (e.g. `fill-none text-muted-foreground`).
  - `aria-label` per button: "Rate N stars". Each
    button has `data-testid="rating-star-<N>"`.
  - Click on star N calls `onChange(N)`.
  - When `disabled` is true, all buttons are
    non-interactive (`disabled` prop, no pointer
    events).
  - When `value` is `undefined`, all 5 stars are
    unfilled.
  - Tests cover: filled/empty pattern (e.g. value=3
    → 3 filled, 2 empty; value=undefined → 5 empty),
    click invokes `onChange` with the right number,
    disabled state makes the buttons non-interactive.
    ≥ 3 tests.
- [x] **Notes:** mirror the visual language of the existing
  icon buttons in the project (`size-4` for the
  Pencil/Trash2 in `BookCard`). Two-tone via Tailwind
  classes, no SVG swap.

## T3. `RatingSection` (smart, wraps `DetailSection` + `RatingStars`)

- [x] **Files:**
  `src/features/rating/RatingSection.tsx` (new),
  `src/features/rating/index.ts` (new — barrel),
  `tests/features/rating/RatingSection.test.tsx` (new).
- **Acceptance:**
  - Props: `{ book: Book }`.
  - Renders `<DetailSection title="Rating">` containing
    `<RatingStars value={book.rating} onChange={handleRate} disabled={isUpdating} />`.
  - State: `isUpdating: boolean` (initial `false`).
  - On `onChange(rating)`: `setIsUpdating(true)`; call
    `useBookLibrary.updateBook(book.id, { ...book, rating })`;
    on success the store updates and the section
    re-renders via the parent; on error,
    `toast.error("Couldn't save rating. Try again.")`;
    in both cases `setIsUpdating(false)` in `finally`.
  - Tests cover: renders the DetailSection with the
    title "Rating" and the stars; click invokes
    `updateBook` with the right input; storage failure
    shows a toast and re-enables the stars; during
    in-flight `updateBook`, the stars are disabled.
    ≥ 3 tests.
  - `index.ts` exports `RatingSection` (and
    `RatingStars` for completeness, but it's an
    internal of the section).
- [x] **Notes:** mirrors the smart pattern of
  `EditBookDialog` / `DeleteBookDialog` (imports
  `useBookLibrary` directly). The detail page just
  drops the section in.

## T4. `BookForm` rating field

- [x] **Files:**
  `src/components/BookForm.tsx` (modified),
  `tests/components/BookForm.test.tsx` (modified).
- **Acceptance:**
  - New state: `rating: string` (initialised from
    `initialValues.rating?.toString() ?? ""`).
  - New UI: a shadcn `Select` field labelled "Rating"
    placed after the Status Select and before the
    Cover URL field. Options: "Not rated" (value
    `""`), "1 star", "2 stars", "3 stars", "4 stars",
    "5 stars" (values `"1"` .. `"5"`).
  - `data-testid="book-form-rating-trigger"` on the
    trigger.
  - On submit, the `BookInput` builder includes
    `rating: Number(rating) as 1|2|3|4|5` when
    `rating` is non-empty, else omits the key.
  - Tests cover: renders the Select with the right
    initial value (from `initialValues.rating`);
    selecting a value and submitting produces an
    `onSubmit(input)` with `input.rating` matching the
    selection; selecting "Not rated" and submitting
    produces an `onSubmit(input)` without a `rating`
    key. ≥ 2 tests.
- [x] **Notes:** mirror the existing `coverUrl` pattern
  (string state in form, optional in `BookInput`).
  The validator catches any value the Select doesn't
  emit (e.g., `"3.5"` if a hostile form injected it).
  Radix `Select` reserves `value=""` for "no selection /
  show placeholder"; we use `"none"` as a sentinel for
  the "Not rated" SelectItem and translate to/from `""`
  in the form state.

## T5. `BookDetail` renders `<RatingSection>`

- [ ] **Files:**
  `src/features/detail-view/BookDetail.tsx` (modified),
  `tests/features/detail-view/BookDetail.test.tsx`
  (modified).
- **Acceptance:**
  - In the page main, after `<DetailMeta book={book} />`,
    render `<RatingSection book={book} />`. The
    `space-y-6` parent handles spacing.
  - For an unrated book, the section is visible
    (5 empty stars, not hidden) — verifies the
    "Not rated" UX.
  - For a rated book, the section is visible with
    the current rating reflected in the stars.
  - Tests cover: the "Rating" section is visible for
    a found book; click a star on the section (this
    is a BookDetail integration of the section's
    `onChange` → `updateBook` → page re-renders flow).
    ≥ 1 test.
- **Notes:** the existing BookDetail tests for
  loading / not-found / found / edit / delete still
  pass. The new test is a small extension of the
  "found" test, not a brand-new file.

## T6. Polish & verification

- [ ] **Files:** (no new code);
  `specs/006-rating/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 006 are
    verified manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (expected ~199–201 tests
    total: 184 from spec 005 + ~15–17 new from
    spec 006).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds.
  - No new `any` introduced.
  - No new npm dependencies introduced (`Star` from
    the existing `lucide-react@^1.17.0`; `sonner`
    already in `package.json`).
  - No raw HTML controls where shadcn has an
    equivalent.
  - Update this file: tick all `[x]`s, set Status
    to `Done`.
- **Notes:** verification report goes here when
  the task is closed out.
