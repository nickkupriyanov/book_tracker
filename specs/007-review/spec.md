# Spec: Book Review

> **Status:** Approved
> **Author:** nickkupriyanov
> **Created:** 2026-06-04
> **Spec ID:** 007-review
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

A book on the shelf has a status (want / reading / read),
tags, and (since spec 006) a 1-5 rating — but no place to
capture the user's longer-form thoughts. A rating is a
single integer; it can say "I loved it" or "I hated it"
but not *why*. The user has hinted at this since the
detail-view spec: "в дальнейшем я хочу, чтобы появился
функционал оценки книги, отзыва о книги" (rating done;
review is the next per-book content feature flagged in
spec 005 §12 D5).

## 2. Goal

Each book can have an optional free-form text review. The
review is edited inline on the detail page, persisted with
the book, and rendered with paragraph breaks. The review
is plain text — no Markdown, no rich-text formatting —
keeping the MVP small and safe (no XSS surface, no
heavyweight editor dependency). A future spec
(008 — rich text) will upgrade the field to support bold /
italic / underline / paragraphs / lists / colour highlight.

## 3. Non-goals

- We do **not** support Markdown or any other formatting
  markup. The review is plain text; newlines and
  paragraph breaks are preserved as-is (D1).
- We do **not** embed a rich-text editor (Lexical, TipTap,
  Slate, etc.) in this spec. That's a separate future
  spec (D9) with its own library / API evaluation.
- We do **not** add a `review` field to the existing
  `BookForm` / Add / Edit dialogs. The review is edited
  **only** inline on the detail page (D4).
- We do **not** show reviews of other users, public
  sharing, OpenGraph, or anything that would make a
  per-book URL meaningful outside the local app.
- We do **not** support comments on a review, edit
  history, or version diffs.
- We do **not** auto-save. The user clicks an explicit
  Save button.
- We do **not** add a separate "Delete review" button
  (D8). Clearing the textarea and saving deletes the
  review; that's the same affordance, fewer controls.
- We do **not** add `updatedAt`, "last edited", or any
  review-level metadata.

## 4. Users & scenarios

**Story.** Mia finished *Piranesi* and wrote a glowing
review last year. She opens the detail page; the
"Review" section is in read mode and shows her text,
formatted as paragraphs. She clicks "Edit review", the
textarea appears with her current text, she adds a
sentence, clicks Save. The dialog closes (section
returns to read mode), the new text is rendered, a
toast (or silent update) confirms the save.

**Story.** Andy has never written a review for
*Project Hail Mary*. He opens the detail page; the
"Review" section shows a calm "No review yet" message
and a "Write review" button. He clicks it, types a
paragraph, clicks Save. The section now shows his
review in read mode.

**Story.** Sara wants to delete her review. She opens
the detail page, clicks "Edit review", clears the
textarea, clicks Save. The section returns to read
mode and now shows "No review yet" again.

**Story.** Kim tries to save a 20,000-character review
(paste accident). The inline error
"Review must be 10,000 characters or fewer." appears
under the textarea; the section stays in edit mode; the
book's existing review is unchanged.

**Story.** Alex clicks Save while localStorage is full.
A toast says "Couldn't save review. Try again." The
section stays in edit mode; the book and its existing
review are unchanged.

## 5. UX

- **On the detail page** (`/book/<id>`):
  - A new section titled "Review" appears in the page
    main, below `<RatingSection>` and above any future
    sections (quotes, reading time). The section uses
    the existing `<DetailSection>` wrapper from spec
    005 T1.
  - The section has two modes: **read** and **edit**.
    State is owned by `ReviewSection` (local to the
    section).
  - **Read mode — book has a review:**
    - The review text is rendered inside a `<p
      className="whitespace-pre-line">`. Newlines in
      the string become line breaks in the rendered
      output (D5).
    - Two buttons: **"Edit review"** and
      **(nothing else — no separate Delete button
      per D8)**. "Edit review" switches to edit mode.
  - **Read mode — book has no review:**
    - A muted "No review yet." message.
    - One button: **"Write review"**, switches to edit
      mode.
  - **Edit mode:**
    - A `<Textarea>` (shadcn) pre-filled with the
      current review (or empty if none).
    - Inline error message under the textarea if the
      value fails validation.
    - Three buttons (right-aligned): **"Cancel"**,
      **"Save"**. Cancel discards changes and returns
      to read mode. Save calls `updateBook`; on success
      returns to read mode with the new content; on
      failure shows a toast and stays in edit mode.
    - While the in-flight `updateBook` is pending, the
      textarea and both buttons are disabled.
  - On storage failure: `toast.error("Couldn't save
    review. Try again.")` via sonner (D7). The
    textarea re-enables; the section stays in edit
    mode; the existing review is unchanged.

- **In the Add / Edit dialogs** (via the shared
  `BookForm`): **no change**. The review field is not
  exposed there. The form continues to handle title,
  author, status, rating, cover URL, and tags. (D4.)

- **In the BookCard** (shelf): **no change**. The card
  stays summary-only; the review is detail-page content
  (per spec 005 D7).

## 6. Functional requirements

- FR-1. `Book` and `BookInput` in `src/types/book.ts`
  have an optional field `review?: string`.
- FR-2. `validateBookInput` accepts a `review` that is
  either `undefined` / `null` (returns `undefined`, no
  error) or a string with length ≤ 10 000 characters
  after trim. Any other value (non-string, > 10 000
  chars) produces an inline `errors.review` message.
- FR-3. An empty / whitespace-only `review` string is
  normalised to `undefined` in the returned
  `BookInput` (treats the field as "no review"), and the
  `review` key is **absent** from the value object
  (mirroring the `coverUrl` / `rating` patterns).
- FR-4. `ReviewSection` is a "smart" component with
  props `{ book: Book }`. State: `mode: "read" | "edit"`
  (initial `"read"`) and `draft: string` (only
  meaningful in edit mode; initialised from
  `book.review ?? ""` when entering edit mode).
- FR-5. In read mode, the section renders
  `<DetailSection title="Review">` with the review
  text (or "No review yet.") and the appropriate
  button(s) per D8. `<p className="whitespace-pre-line">`
  is used so newlines in the review string become
  line breaks in the rendered output.
- FR-6. In edit mode, the section renders the
  `<Textarea>` pre-filled with `draft`, plus
  "Cancel" and "Save" buttons. Cancel returns to
  read mode without saving. Save calls
  `useBookLibrary.updateBook(book.id, { ...book, review: trimmed })`
  where `trimmed` is `draft.trim() === "" ? undefined : draft.trim()`.
  On success the store updates and the section
  re-renders in read mode with the new value. On
  error, the section shows a toast and stays in edit
  mode.
- FR-7. On `updateBook` rejection, `ReviewSection`
  calls `toast.error("Couldn't save review. Try
  again.")` via sonner, sets the in-flight state back
  to false, and remains in edit mode with the current
  `draft` preserved.
- FR-8. `BookDetail` renders `<ReviewSection
  book={book} />` after `<RatingSection>`. The
  `space-y-6` parent handles vertical spacing.

## 7. Data

`src/types/book.ts` adds one optional field to `Book`
(and, transitively, to `BookInput` via the existing
`Omit` definition):

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

`src/lib/validation/book.ts` gains a new validator:

```ts
function validateReview(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") {
    errors.review = "Review must be text.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > REVIEW_MAX) {
    errors.review = `Review must be ${REVIEW_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}
```

Where `REVIEW_MAX = 10_000`.

`validateBookInput` calls `validateReview(input["review"], errors)`
alongside the existing field validators. The returned
`BookInput` value spreads `review: validatedReview`
when defined, else omits the key (mirroring the
`coverUrl` and `rating` patterns).

**Migration:** none required. Existing books in
localStorage have no `review` field. `JSON.parse`
reads them as objects without the key; accessing
`.review` returns `undefined`; the type and validator
both treat `undefined` as "no review".

**Future-proofing (D9):** when spec 008 introduces
rich text, the validator will branch on
`typeof raw === "string"` (legacy plain text) vs a
new structured shape (e.g. `LexicalState` JSON). The
`Book.review` field type widens to a discriminated
union. Existing plain-text reviews continue to
validate and render via the legacy path. The
`ReviewSection` reads and renders accordingly. This
is a future concern; this spec leaves no additional
hooks for it (no `version` field, no migration
trigger).

## 8. Storage interface

No changes. `LocalStorageAdapter` persists arbitrary
`Book` shapes via `JSON.stringify` / `JSON.parse`; an
additional optional field is transparent. The future
`HttpStorageAdapter` (Month 2) will inherit the same
behaviour.

## 9. Edge cases & errors

- **Book has no `review`.** The section renders "No
  review yet." and a "Write review" button.
- **Empty / whitespace-only review** in the textarea.
  Treated as "no review" (D3) — save omits the key
  from the `BookInput`, the section returns to read
  mode and shows "No review yet.".
- **Review > 10 000 chars** (paste accident, hostile
  input). The validator catches it in `BookForm` (if
  the form ever gets a review field in a future spec)
  and shows an inline `errors.review` message. In the
  inline-edit path of this spec, the same logic runs
  before `updateBook` is called; the section shows the
  inline error and stays in edit mode.
- **In-flight review save.** The textarea and both
  buttons are `disabled` while `updateBook` is
  pending. A second click is a no-op.
- **Storage failure on review save.** The adapter
  throws (quota, disabled, etc.). `ReviewSection`
  catches the error, calls
  `toast.error("Couldn't save review. Try again.")`,
  re-enables the controls, stays in edit mode. The
  store is unchanged; the existing review (if any)
  remains.
- **Stale `book.id`** (book deleted in another tab).
  `updateBook` throws "not found" via the adapter. The
  toast fires; the section stays in edit mode until
  the user closes the dialog or the page detects the
  removal on the next store update.
- **Concurrent edit + delete from another tab.**
  Same as spec 004 / 006: the user opens the section
  for a book, then deletes the book in another tab.
  The save call throws "not found"; the toast fires;
  the section remains in edit mode. The user can
  close the dialog manually.

## 10. Acceptance criteria

- [ ] `Book` and `BookInput` in `src/types/book.ts`
      have `review?: string`.
- [ ] `validateBookInput` accepts `review` as a string
      of 0-10 000 chars (after trim) or as missing.
- [ ] An empty / whitespace-only `review` is normalised
      to absent in the returned `BookInput` (the
      `review` key is omitted from the value object).
- [ ] `validateBookInput` rejects a non-string
      `review` with an inline `errors.review` message.
- [ ] `validateBookInput` rejects a `review` longer
      than 10 000 chars with an inline `errors.review`
      message.
- [ ] A book without `review` validates successfully.
- [ ] `ReviewSection` renders a `<DetailSection
      title="Review">` with the review text in read
      mode when the book has a review.
- [ ] `ReviewSection` renders "No review yet." and a
      "Write review" button in read mode when the
      book has no review.
- [ ] Clicking "Edit review" / "Write review" switches
      the section to edit mode with the `<Textarea>`
      pre-filled (empty for a new review, current text
      otherwise).
- [ ] Clicking Cancel in edit mode discards the draft
      and returns to read mode without saving.
- [ ] Clicking Save in edit mode calls
      `useBookLibrary.updateBook` and on success
      returns to read mode with the new value.
- [ ] On storage failure, the section shows a toast
      "Couldn't save review. Try again." and stays
      in edit mode with the draft preserved.
- [ ] While `updateBook` is in flight, the textarea
      and buttons are disabled.
- [ ] `BookDetail` renders `<ReviewSection>` after
      `<RatingSection>`.
- [ ] Newlines in the review string render as line
      breaks in read mode (whitespace-pre-line
      behaviour).
- [ ] No raw HTML controls where shadcn has an
      equivalent (textarea is a shadcn primitive).
- [ ] Lint and tests pass; no new `any` introduced.
- [ ] No new npm dependencies.

## 11. Out of scope (for this spec)

- Markdown or any other formatting markup.
- Rich-text editor (Lexical, TipTap, Slate, etc.) —
  spec 008.
- Review field in the Add / Edit dialogs
  (`BookForm`).
- Review on `BookCard` in the shelf.
- "Delete review" button as a separate control.
- Auto-save.
- Edit history / diffs / versioning.
- Comments on a review.
- Public reviews, sharing, OpenGraph.
- `updatedAt` or "last edited" metadata on `Book`.
- Multi-paragraph styling beyond whitespace-pre-line
  (no first-line indent, no margin between paragraphs
  beyond the natural block layout of the parent).
- Reviews of other users.

## 12. Decisions

Resolved 2026-06-04.

- **D1. Plain text, not Markdown, not rich text.** The
  review is a free-form string; newlines and paragraph
  breaks are preserved as-is. The constitution
  prefers "cozy, not clever" — a calm text field is
  the smallest viable surface. No XSS risk, no parser,
  no editor dependency. Aligns with the MVP scope.
- **D2. Max 10 000 characters.** A sanity cap. Real
  reviews are 1 000-5 000 chars; the cap prevents
  accidental paste of novels / malicious huge input.
  Generous enough to not feel restrictive.
- **D3. Empty / whitespace-only review → `undefined`.**
  Treated as "no review" — the `review` key is absent
  from `BookInput`. This makes "delete by clearing"
  work without a separate Delete button (D8).
- **D4. Edit ONLY inline on the detail page, NOT in
  the `BookForm` / Add / Edit dialogs.** The review is
  per-book content, displayed in a dedicated section
  (D7 from spec 005). Adding a multi-line textarea to
  the `BookForm` would inflate the form and make it the
  place for a 10 000-char field, which is awkward UX.
  The detail page is the natural home for "view and
  edit this book's free-form content".
- **D5. Read mode: `whitespace-pre-line` on the
  `<p>`.** Preserves newlines and multiple spaces
  in the review string; paragraphs (separated by
  blank lines in the source) render as block-level
  line breaks. No additional CSS or DOM wrapping
  needed.
- **D6. Save through `useBookLibrary.updateBook`.**
  Mirrors the smart pattern of `RatingSection`
  (spec 006 T3) and `EditBookDialog` / `DeleteBookDialog`
  (specs 003 / 004). The section imports the store
  directly; the parent (`BookDetail`) just drops the
  section in.
- **D7. Storage failure UX: `toast.error` via sonner.**
  "Couldn't save review. Try again." Same pattern as
  `RatingSection` (spec 006 D7). The toast is the
  user's feedback. The section stays in edit mode,
  the controls re-enable, the existing review is
  unchanged.
- **D8. No separate "Delete review" button.** Clearing
  the textarea and clicking Save deletes the review
  (D3 normalises empty to absent). One affordance
  instead of two; less visual noise in the section
  header.
- **D9. Rich-text editor (Lexical / TipTap / Slate /
  custom) is deferred to spec 008.** This spec
  establishes the section structure, the field on
  `Book`, the validator, the read / edit mode pattern,
  the storage-failure UX, and the inline-edit UX.
  Spec 008 swaps the `string` field for a structured
  rich-text state, swaps the `<Textarea>` for a
  `<RichTextEditor>`, and adds a renderer for the read
  mode. No data loss: plain-text reviews from 007
  continue to render via the legacy path (a
  discriminated union on the field type).

## 13. Open questions

All resolved (see Decisions D1-D9).
