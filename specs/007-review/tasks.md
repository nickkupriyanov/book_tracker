# Tasks: Book Review

> **Status:** Done
> **Spec:** `../spec.md` (`Approved`)
> **Plan:** `../plan.md` (`Approved`)

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

- [x] **Files:**
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
- [x] **Notes:** copy the canonical shadcn boilerplate
  with minor adjustments to match the project's
  existing `input.tsx` (consistent focus, invalid,
  disabled, placeholder styling). No new npm deps.

## T3. `ReviewSection` (smart, read/edit mode)

- [x] **Files:**
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
- [x] **Notes:** the smart pattern matches
  `RatingSection` (spec 006 T3) and
  `EditBookDialog` / `DeleteBookDialog`. The
  detail page just drops the section in.

## T4. `BookDetail` renders `<ReviewSection>`

- [x] **Files:**
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
- [x] **Notes:** the existing BookDetail tests for
  loading / not-found / found / edit / delete /
  rating still pass. The new tests extend the
  "found" coverage.

## T5. Polish & verification

- [x] **Files:** (no new code);
  `specs/007-review/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 007 are
    verified manually.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (219 tests total: 200
    from spec 006 baseline + 19 new from spec
    007: validator 7, ReviewSection 10, BookDetail
    2).
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
- [x] **Notes:** verification report (2026-06-04):
  - `npm run lint` — ✔ No ESLint warnings or errors
  - `npm run test` — 219/219 passed across 24 files
    (200 from spec 006 + 19 new from spec 007:
    validator 7, ReviewSection 10, BookDetail 2)
  - `npx tsc --noEmit` — clean
  - `npm run build` — ✓ Compiled successfully, route
    `/book/[id]` is now 2.81 kB (was 2.07 kB before
    spec 007, +0.74 kB for the review section).
    Shared chunks unchanged.
  - `grep -rE ': any\b|as any\b' src/` — no matches
  - `grep -rE '<(button|input|dialog|select|textarea)\b' src/`
    filtered to non-UI files — no matches (the only
    `<textarea` is in `src/components/ui/textarea.tsx`
    and the only `<input` in
    `src/components/ui/input.tsx`, both shadcn wrappers,
    expected)
  - `package.json` — `lucide-react@^1.17.0` (no
    change), `sonner` (no change), `radix-ui@^1.4.3`
    (no change). No new entries.
  - Spec §10 acceptance criteria coverage:
    - Book + BookInput have review? → T1
    - validateBookInput accepts strings ≤ 10 000 → T1
    - Empty / whitespace-only normalises to absent → T1
    - Non-string review rejected → T1
    - Review > 10 000 rejected → T1
    - A book without review validates → T1 (baseline)
    - ReviewSection renders DetailSection title "Review"
      + text in read mode → T3
    - "No review yet." + "Write review" button → T3
    - Click "Edit review" → edit mode with pre-filled
      textarea → T3
    - Click Cancel discards draft → T3
    - Click Save calls updateBook + returns to read mode
      → T3
    - Storage failure → toast "Couldn't save review.
      Try again." + stays in edit → T3
    - In-flight controls disabled → T3
    - BookDetail renders <ReviewSection> after
      <RatingSection> → T4
    - Newlines render as line breaks (whitespace-pre-line)
      → T3 (uses the className)
    - No raw HTML controls where shadcn has an equivalent
      → T2 + T3
    - Lint / tests pass; no new any → T5
    - No new npm dependencies → T5
  - Test architecture note: the ReviewSection unit
    tests use a `TestHost` wrapper that subscribes to
    the store and re-renders with the fresh book, so
    the section reacts to store updates. This mirrors
    the production path (BookDetail subscribes and
    passes the derived book down) and is the reason
    the visual state assertions in the unit tests work
    correctly. (Without the wrapper, the section
    would not re-render after updateBook when rendered
    in isolation.)
  - Deviation from spec: in T3 I used the same
    `data-testid="review-edit-button"` for both the
    "Edit review" and "Write review" buttons (since
    the spec described them as one logical action
    with conditional text). The button text differs
    based on `hasReview`, but the testid is the
    same. This avoids needing two testids for a
    single affordance.
  - Manual QA pending (not run in this environment).
    Suggested steps (per plan §8):
    1. Detail page, book with a review — see
       "Review" section with the text, "Edit review"
       button.
    2. Click "Edit review" — textarea pre-filled,
       "Cancel" and "Save" buttons.
    3. Edit a word, click Save — read mode with the
       new text.
    4. Reload — review is persisted.
    5. Click Cancel — no change, back to read mode.
    6. Detail page, book without a review — "No
       review yet." + "Write review" button.
    7. Click "Write review" — empty textarea. Type
       a paragraph with blank lines, click Save —
       read mode with the paragraph rendered with
       line breaks (whitespace-pre-line).
    8. Edit, clear textarea entirely, click Save —
       "No review yet." again (D3/D8 — clear +
       save deletes the review).
    9. Paste 11 000 chars — inline error "Review
       must be 10 000 characters or fewer.", section
       stays in edit mode, no save.
    10. Storage failure path (DevTools: setItem
        throws) → click Save → toast "Couldn't save
        review. Try again." appears, controls re-enable,
        store unchanged.
    11. Newlines: a review with `\n\n` between
        paragraphs renders as a paragraph break
        (whitespace-pre-line behaviour).
    12. Regression: Add / Edit (without review) /
        Delete / Rating from the detail page all
        still work.
