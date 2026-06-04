# Plan: Book Review

> **Status:** Approved
> **Spec:** `../spec.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-04

---

## 1. Architecture summary

Book Review is the second per-book content feature, after
Rating (spec 006). It follows the section-based architecture
from spec 005 D7: a new `ReviewSection` drops in below the
existing `RatingSection` in the detail page. The biggest
design call is **D4** — the review is edited **inline on
the detail page**, not via the `BookForm` / Add / Edit
dialogs. The section has two modes (read / edit) with local
state, mirroring the smart pattern of `RatingSection`
(spec 006 T3) for the underlying store mutation.

The domain type gets one new optional field (`review?: string`),
the validator gets one new helper (`validateReview`), and a
new shadcn `Textarea` primitive is added (per D4 the form
does not get a review field, so the textarea is a
section-only asset). The storage layer is untouched.

Rich text is explicitly deferred to spec 008 (D9); this
spec builds the section-based infrastructure that spec 008
will plug into without rework.

## 2. Module / file layout

```
src/types/book.ts                              # MODIFIED: add review?: string
src/lib/validation/book.ts                     # MODIFIED: add validateReview
src/components/ui/textarea.tsx                 # NEW: shadcn Textarea wrapper
src/features/review/                           # NEW feature folder
├── ReviewSection.tsx                          # NEW: smart, read/edit mode
└── index.ts                                   # NEW: barrel
src/features/detail-view/BookDetail.tsx        # MODIFIED: render <ReviewSection>
tests/
├── features/review/                           # NEW folder
│   └── ReviewSection.test.tsx                 # NEW
├── lib/validation/book.test.ts                # MODIFIED: review validation
```

No deletions. No new domain types beyond the `Book` change.
No new storage or state changes. No new npm dependencies
(`Textarea` is shadcn-style boilerplate; `sonner` is already
used for toasts in specs 003 / 004 / 006).

## 3. Data flow

```
[Detail page] (/book/<id>)
  user clicks "Edit review" / "Write review"
  -> ReviewSection setMode("edit"); setDraft(book.review ?? "")
  -> user edits the textarea
  -> user clicks "Save"
       ReviewSection handleSave():
         draftTrim = draft.trim()
         if (draftTrim === "") review = undefined
         else review = draftTrim
         result = validateBookInput({ ...book, review })  // local check
         if (!result.ok) setErrors(result.errors); return
         setIsUpdating(true)
         try {
           await updateBook(book.id, { ...book, review: draftTrim === "" ? undefined : draftTrim })
           setMode("read")
         } catch {
           toast.error("Couldn't save review. Try again.")
         } finally {
           setIsUpdating(false)
         }
  -> on success: store updates, BookDetail re-renders
     with new book.review, ReviewSection receives the
     new book prop and renders read mode with the new text
  -> on error: toast, stay in edit mode, draft preserved
```

The validator runs **before** the `updateBook` call, so
client-side mistakes (too long, non-string) are caught
without touching the store. Storage failures (quota,
disabled) are caught at the `updateBook` call and toasts.

## 4. Component breakdown

### `ReviewSection` (NEW, in `src/features/review/`)

- **Props:** `{ book: Book }`.
- **State:**
  - `mode: "read" | "edit"` (initial `"read"`).
  - `draft: string` (meaningful only in edit mode;
    initialised from `book.review ?? ""` on entering
    edit mode).
  - `errors: Record<string, string>` (for inline
    `errors.review` if the local validator fails).
  - `isUpdating: boolean` (initial `false`).
- **Renders:** `<DetailSection title="Review">` with
  either:
  - **Read mode:** the review text inside
    `<p className="whitespace-pre-line">` (or "No
    review yet."), plus an "Edit review" / "Write
    review" button.
  - **Edit mode:** a `<Textarea>` pre-filled with
    `draft`, inline error display, "Cancel" and
    "Save" buttons. All controls `disabled` while
    `isUpdating`.
- **`handleSave`:** validate the draft, set
  `isUpdating`, call `updateBook`, handle success /
  error per FR-6 / FR-7.
- **Re-renders:** the parent (`BookDetail`) is
  subscribed to the store; on `updateBook` success
  the page re-renders, the section's `book` prop
  updates, the read-mode render uses the new
  `book.review`.
- **Tests:** ≥ 4
  - read mode with a review (text + "Edit review"
    button)
  - read mode without a review ("No review yet." +
    "Write review" button)
  - edit → save (calls updateBook, returns to read)
  - edit → cancel (no store call, returns to read)
  - storage failure (toast, stays in edit)
  - too-long input (inline error, no store call)
  - empty draft (clears review, treats as no
    review)
  - in-flight disabled state

### `Textarea` (NEW, in `src/components/ui/textarea.tsx`)

- Standard shadcn-style wrapper around the native
  `<textarea>` element. Renders a styled textarea
  matching the project's design tokens. No tests —
  thin pass-through, like the existing
  `src/components/ui/input.tsx` and `dialog.tsx`.

### `BookDetail` (MODIFIED)

- **One change:** in the page main, after
  `<RatingSection book={book} />`, render
  `<ReviewSection book={book} />`. The `space-y-6`
  parent handles spacing.
- **No new state, no new dialogs, no new router
  logic.**
- **Tests:** ≥ 2
  - the "Review" section is visible for a found
    book (with and without a review)
  - the section sits below the "Rating" section
    (relative order)

### `src/types/book.ts` (MODIFIED)

- **One new field:**
  ```ts
  export interface Book {
    // ... existing fields ...
    /**
     * Optional free-form review. Plain text, max 10 000
     * characters after trim. Absent means "no review"
     * (spec 007 D3). Will be upgraded to a structured
     * rich-text state in a future spec (D9).
     */
    review?: string;
  }
  ```
- `BookInput = Omit<Book, "id" | "createdAt">` inherits
  the new optional field automatically.

### `src/lib/validation/book.ts` (MODIFIED)

- **New helper:** `validateReview(raw, errors)` per
  spec §7. Returns `string | undefined` (already
  trimmed; `undefined` for absent / empty).
- **`validateBookInput` integration:** call
  `validateReview(input["review"], errors)`. In the
  `BookInput` value builder, spread `review` when
  defined, else omit (mirroring the `coverUrl` /
  `rating` patterns).
- **Tests:** ≥ 3 (valid mid-length string, valid
  empty / whitespace-only → returns `undefined`,
  out-of-range, non-string).

## 5. Storage adapter changes

None. `LocalStorageAdapter` persists arbitrary `Book`
shapes via `JSON.stringify` / `JSON.parse`. The new
optional field is transparent. Existing books in
localStorage (without `review`) parse back as `undefined`
for the field; the type allows that.

## 6. Decisions & trade-offs

- **D-P1. `ReviewSection` is smart, mirrors
  `RatingSection` (spec 006 T3) and `EditBookDialog`
  / `DeleteBookDialog`.** Imports `useBookLibrary`
  directly, owns the `updateBook` call and the
  in-flight state. No callback wiring from
  `BookDetail` — drop-in section per spec 005 D7.
- **D-P2. Reuse `DetailSection` from spec 005 T1.**
  No new section wrapper. `<ReviewSection>` is the
  smart component; `<DetailSection>` is the
  presentational wrapper. Layered.
- **D-P3. Inline edit, not dialog.** The section
  has a local `mode` state ("read" | "edit") and
  toggles via buttons. Mirrors the "calm, not
  dashboard" UX principle — no second modal, no
  nested dialogs.
- **D-P4. `Textarea` is shadcn boilerplate, no new
  npm dep.** Following the project's pattern of
  wrapping native HTML controls in shadcn-styled
  components (input, dialog, etc. all do this).
  ~15 lines.
- **D-P5. `whitespace-pre-line` for read mode.**
  Preserves newlines and multiple spaces in the
  review string. CSS-only, no JS wrapping. Aligns
  with D5.
- **D-P6. Storage failure UX: `toast.error` via
  sonner.** Same pattern as `RatingSection` (spec
  006). The toast is the user's feedback; the
  section stays in edit mode, controls re-enable.
- **D-P7. No new npm dependencies.** `Textarea` is
  shadcn-style boilerplate (no dep). `sonner` is
  already in `package.json` from specs 003 / 004
  / 006.
- **D-P8. No migration.** Optional field,
  transparent to `JSON.parse`. Existing books in
  localStorage work without changes.
- **D-P9. Future-proofed for spec 008 (rich text).**
  The validator pattern, the section structure,
  and the read-mode renderer are all designed so
  spec 008 can swap `string` for a structured
  rich-text state without touching this spec's
  page layout. The `validateReview` helper is the
  single point of branching on the new shape in
  spec 008.

## 7. Risks

- **`Textarea` CSS quirks.** shadcn's `Textarea`
  typically uses the same `border-input` /
  `focus-visible:ring-ring` tokens as `Input`. The
  visual language stays consistent. The boilerplate
  is well-trodden.
- **Long reviews and whitespace rendering.** The
  `whitespace-pre-line` style on `<p>` preserves
  all whitespace including blank lines. If the
  review is very long, the section can grow tall.
  The detail page is already scrollable; this is
  acceptable. (The 10 000 char cap is the upper
  bound.)
- **Stale `book.id` on review save.** Same as
  rating: `updateBook` throws "not found", the
  toast fires, the section stays in edit mode.
  Acceptable.
- **Section ordering on the page.** `ReviewSection`
  after `RatingSection` is the natural visual
  order: cover + meta, then rating, then review.
  Future sections (quotes, reading time) drop in
  below in the same `space-y-6` stack.
- **Textarea in edit mode is the only text input in
  the app.** No other surface uses a multi-line
  input. Risk of unexpected browser quirks is low.
- **Spec 008 (rich text) refactor risk.** When we
  swap `string` for a structured state, the
  validator's branching logic must support both
  the legacy `string` form and the new shape.
  The validator's signature stays the same
  (`(raw: unknown) => T | undefined`); the new
  branch is added inside. Existing plain-text
  reviews continue to validate and render
  unchanged. Mitigated by D-P9.

## 8. Rollout

- No feature flag, no migration.
- Manual QA (per spec §10):
  1. Detail page, book with a review — see "Review"
     section with the text, "Edit review" button.
  2. Click "Edit review" — textarea pre-filled, "Cancel"
     and "Save" buttons.
  3. Edit a word, click Save — read mode with the new
     text, no toast on success.
  4. Reload — review is persisted.
  5. Click Cancel — no change, back to read mode.
  6. Detail page, book without a review — "No review
     yet." + "Write review" button.
  7. Click "Write review" — empty textarea. Type a
     paragraph, click Save — read mode with the
     paragraph.
  8. Edit, clear textarea entirely, click Save —
     "No review yet." again.
  9. Paste 11 000 chars — inline error "Review must
     be 10 000 characters or fewer.", section stays
     in edit mode, no save.
  10. Storage failure path (DevTools: setItem
      throws) → click Save → toast "Couldn't save
      review. Try again." appears, textarea re-enables,
      store unchanged.
  11. Newlines: a review with `\n\n` renders as a
      paragraph break (whitespace-pre-line).
  12. Regression: Add / Edit (without review) / Delete
      / Rating from the detail page all still work.
- Verification: `npm run lint && npm run test`
  pass; `tsc --noEmit` clean; `npm run build`
  succeeds; no new `any`; no new npm dependencies.
- Expected test count: ~219–222 total (209 from spec
  006 + ~10–13 new from spec 007).
