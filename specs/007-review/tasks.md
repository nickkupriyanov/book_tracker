# Tasks: Book Review

> **Status:** Draft
> **Spec:** `../spec.md`
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task
`[x]` only when its acceptance line is satisfied and
`npm run lint && npm run test` pass.

Order matters: T1 establishes the type and validator
contract; T2 adds the shadcn Textarea primitive; T3
builds the smart section; T4 wires it into the page;
T5 polishes and verifies.

---

## T1. Type + validator (`Book.review?`, `validateReview`)

- [x] **Files:**
  `src/types/book.ts` (modified),
  `src/lib/validation/book.ts` (modified),
  `tests/validation/book.test.ts` (modified).
- **Acceptance:**
  - `Book` and `BookInput` (via `Omit`) gain
    `review?: string`.
  - New `validateReview(raw, errors)` helper:
    - `raw === undefined` or `null` → returns
      `undefined`, no error.
    - Non-string → `errors.review = "Review must be
      text."`, returns `undefined`.
    - String longer than 10 000 chars after trim
      → `errors.review = "Review must be 10 000
      characters or fewer."`, returns `undefined`.
    - Otherwise → returns the trimmed string.
  - `validateBookInput` calls `validateReview`
    alongside the other field validators. The
    returned `BookInput` spreads `review` into the
    object only when defined, else omits the key
    (mirroring the `coverUrl` / `rating` patterns).
  - An empty / whitespace-only string normalises
    to `undefined` (D3) — the `review` key is
    absent from the value object.
  - Validator tests cover: valid mid-length string,
    empty / whitespace-only (key absent), missing
    (undefined), missing (null), non-string, > 10 000
    chars. ≥ 4 tests.
- [x] **Notes:** mirror the existing `validateRating`
  pattern (spec 006 T1). The empty-trim-to-absent
  behaviour matches the spec 003 norm for "the
  user means to clear this field" (D3, D8).

## T2. shadcn `Textarea` primitive

- [ ] **Files:**
  `src/components/ui/textarea.tsx` (new).
- **Acceptance:**
  - Exports a `Textarea` component that renders a
    styled `<textarea>` matching the project's
    design tokens (mirrors the existing
    `src/components/ui/input.tsx` style: same
    `border-input` / `focus-visible:ring-ring` /
    `aria-invalid:border-destructive` / padding
    classes).
  - No new tests — the wrapper is a thin pass-through
    to the native `<textarea>`, like `input.tsx`,
    `dialog.tsx`, etc.
- **Notes:** copy the canonical shadcn boilerplate
  with minor adjustments to match the project's
  existing `input.tsx` (consistent focus, invalid,
  disabled, placeholder styling). No new npm deps.

## T3. `ReviewSection` (smart, read/edit mode)

- [ ] **Files:**
  `src/features/review/ReviewSection.tsx` (new),
  `src/features/review/index.ts` (new — barrel),
  `tests/features/review/ReviewSection.test.tsx`
  (new).
- **Acceptance:**
  - Props: `{ book: Book }`.
  - State: `mode: "read" | "edit"` (initial
    `"read"`); `draft: string` (initialised from
    `book.review ?? ""` on entering edit mode);
    `errors: Record<string, string>`;
    `isUpdating: boolean`.
  - Read mode (book has a review): renders the
    review text inside `<p
    className="whitespace-pre-line">`, plus an
    "Edit review" button.
  - Read mode (book has no review): renders
    "No review yet." plus a "Write review" button.
  - Clicking "Edit review" / "Write review"
    switches to edit mode. The `<Textarea>` is
    pre-filled (empty for a new review, current
    text otherwise).
  - Edit mode: "Cancel" returns to read mode
    without saving. "Save" runs the local
    validator (length ≤ 10 000, trimmed); on
    success calls
    `useBookLibrary.updateBook(book.id, { ...book, review })`
    and switches back to read mode; on
    storage failure calls
    `toast.error("Couldn't save review. Try
    again.")`, stays in edit mode, re-enables
    controls.
  - Empty / whitespace-only `draft` is normalised
    to `undefined` for the `updateBook` call (D3,
    D8) — the book loses its review.
  - During the in-flight `updateBook` call, the
    textarea and both buttons are `disabled`.
  - Tests cover: read mode with review; read mode
    without review; click "Edit review" → edit mode
    with pre-filled textarea; click "Write review" →
    edit mode with empty textarea; edit + save
    → `updateBook` called with the right input +
    read mode; edit + cancel → no `updateBook` call
    + read mode; storage failure → toast + stays in
    edit; too-long draft → no `updateBook` call +
    stays in edit; empty draft + save → `updateBook`
    called with `review: undefined`; in-flight
    controls disabled. ≥ 7 tests.
- **Notes:** the smart pattern matches
  `RatingSection` (spec 006 T3) and
  `EditBookDialog` / `DeleteBookDialog`. The
  detail page just drops the section in.

## T4. `BookDetail` renders `<ReviewSection>`

- [ ] **Files:**
  `src/features/detail-view/BookDetail.tsx`
  (modified),
  `tests/features/detail-view/BookDetail.test.tsx`
  (modified).
- **Acceptance:**
  - In the page main, after `<RatingSection
    book={book} />`, render `<ReviewSection
    book={book} />`. The `space-y-6` parent
    handles spacing.
  - For a found book with a review, the
    "Review" section is visible with the text.
  - For a found book without a review, the
    "Review" section is visible with "No review
    yet.".
  - Tests cover: the "Review" heading is present
    on the page; the section is visible in both
    rated-with-review and unrated-without-review
    cases. ≥ 2 tests.
- **Notes:** the existing BookDetail tests for
  loading / not-found / found / edit / delete /
  rating still pass. The new tests extend the
  "found" coverage.

## T5. Polish & verification

- [ ] **Files:** (no new code);
  `specs/007-review/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 007 are
    verified manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (expected ~219–222
    tests total: 209 from spec 006 + ~10–13 new
    from spec 007).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds.
  - No new `any` introduced.
  - No new npm dependencies introduced
    (`Textarea` is shadcn-style boilerplate).
  - No raw HTML controls where shadcn has an
    equivalent (the textarea uses the new
    `Textarea` primitive).
  - Update this file: tick all `[x]`s, set
    Status to `Done`.
- **Notes:** verification report goes here when
  the task is closed out.
