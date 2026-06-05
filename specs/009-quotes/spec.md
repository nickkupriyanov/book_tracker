# Spec: Book Quotes

> **Status:** Draft
> **Author:** —
> **Created:** 2026-06-04
> **Spec ID:** 009-quotes
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 005 (detail-view), spec 007 (review)

---

## 1. Problem

The book detail page already lets a user capture a personal rating (spec 006)
and a free-form review (spec 007). What's missing is a place for the actual
**passages** — quotes from the book the reader wants to remember. Today, a
user who wants to save a quote either dumps it into the review (mixing two
different things) or has nowhere to put it at all. The detail page is the
natural home for a small "Quotes" section: structured, distinct from the
review, easy to scan, and easy to add to.

## 2. Goal

Each book can have zero or more quotes. A quote is the passage text plus
optional attribution (page number) and an optional personal note. The
user can add, edit, and delete quotes from the book detail page. Quotes
persist with the book via the existing `StorageAdapter` (no new
persistence methods).

## 3. Non-goals

- We do **not** import quotes from external sources (e.g. Goodreads, Kindle
  highlights export). Quotes are typed in by hand.
- We do **not** support image / scan / OCR of a physical page.
- We do **not** add Markdown or rich-text formatting to a quote's text or
  note. Both are plain text, same posture as spec 007's review.
- We do **not** add a separate per-quote detail page, a quotes feed, or a
  cross-book quotes search. All quote UI lives on the parent book's
  detail page.
- We do **not** support sharing, public quotes, or any feature that
  implies more than one user (constitution §1, §5).
- We do **not** support comments on a quote, edit history, or version
  diffs.
- We do **not** expose a separate "quotes" page or tab in the shelf. The
  detail page is the only surface.

## 4. Users & scenarios

**Story.** Andy is reading *Piranesi*. He reads a passage that stopped him
cold. He opens the book detail page, scrolls to the new "Quotes" section
below the review, and clicks **+ Add quote**. A modal opens with three
fields: the quote text (already focused), an optional page number, and an
optional personal note. He pastes the passage, types `42`, and clicks
**Save**. The modal closes, the new quote appears at the top of the list
(newest first) with the text in italic, a small `p. 42` underneath, and
**Edit** / **Delete** affordances on the same line.

**Story.** A few weeks later Andy wants to fix a typo in one of his
quotes. He clicks **Edit** on the quote row, the modal opens pre-filled
with the existing text/page/note, he fixes the typo and clicks **Save**.
The modal closes; the list updates.

**Story.** Andy wants to remove a quote he no longer cares about. He
clicks **Delete** on the quote row. A confirm dialog appears showing the
quote text and **Cancel** / **Delete** buttons (same pattern as
`DeleteBookDialog`). He clicks **Delete**; the dialog closes, the quote
is gone.

**Story.** A book has no quotes yet. The section shows the empty state:
"No quotes yet. Add the first passage that stayed with you." plus an
outlined **+ Add quote** button.

## 5. UX

### 5.1 Placement and section shape

The new **Quotes** section sits **below** `<ReviewSection />` on the
book detail page. It reuses the existing `<DetailSection title="Quotes">`
wrapper from spec 005, mirroring how `<RatingSection />` and
`<ReviewSection />` are wrapped.

### 5.2 List rendering

When `book.quotes` is non-empty, the section renders one `<QuoteCard />`
per quote, sorted by `createdAt` **descending** (newest first), with an
`+ Add quote` button below the list.

A single quote (compact row, the option-A style from the brainstorming):

```
┌────────────────────────────────────────────┐
│ "When the Moon rose in the Third Northern   │
│  Hall I went there, and the Hall was full  │
│  of the sound of the tide."                 │
│                                            │
│  (italic muted) note: this line broke me    │
│  p. 42   ·   Edit   ·   Delete             │
└────────────────────────────────────────────┘
```

- The text is plain text rendered in italic with surrounding curly
  quotes — line breaks preserved (`whitespace-pre-line`).
- If `note` is set, it appears **above** the meta line, in a smaller,
  muted italic style. No "Note:" label (the smaller size carries the
  visual hierarchy).
- If `note` is absent, only the meta line is shown.
- The meta line is right-aligned on its own row: `p. 42` if set, then
  `· Edit · Delete` as small text links. When `page` is absent, the
  meta line shows only `Edit · Delete`. The visual hierarchy is
  "text → optional note → page + actions".

### 5.3 Add / Edit modal (`<QuoteDialog />`)

A `<Dialog />` (shadcn) with three fields:

- **Quote** — `<Textarea />`, 6 rows, autofocused on open. Required,
  1–2000 chars after trim.
- **Page** — `<Input type="number" />`. Optional, integer 1..99999.
- **Note** — `<Textarea />`, 3 rows. Optional, 1–1000 chars after trim.

Footer: **Cancel** (outline) and **Save** (primary). For Add the title
is "Add quote"; for Edit it is "Edit quote". Save is disabled while the
mutation is in flight; label changes to "Saving…".

### 5.4 Delete confirm (`<DeleteQuoteDialog />`)

A `<Dialog />` mirroring `DeleteBookDialog`. Body shows the quote text
truncated to 120 characters followed by an ellipsis if it exceeds that
length. Footer: **Cancel** (outline) and **Delete** (destructive).

### 5.5 States

- **Empty (no quotes):** muted small text "No quotes yet. Add the first
  passage that stayed with you." plus an outlined `+ Add quote` button.
- **Has quotes:** list + `+ Add quote` (solid or outline — finalized in
  plan.md, doesn't affect acceptance).
- **Loading:** none. Data is in the Zustand store by the time the
  detail page renders, so the section always sees a hydrated `book`.
- **Save error (mutation throws):** `toast.error("Couldn't save quote.
  Try again.")`, the dialog stays open with the user's input intact.
- **Delete error:** `toast.error("Couldn't delete quote. Try again.")`,
  the dialog stays open.

## 6. Functional requirements

- FR-1. The user can open an **Add quote** dialog from the Quotes
  section on a book's detail page.
- FR-2. The user can save a quote with text only (page and note
  optional). Empty `text` after trim is rejected with an inline error.
- FR-3. The user can save a quote with `text` and `page` only (no note).
- FR-4. The user can save a quote with `text` and `note` only (no page).
- FR-5. The user can save a quote with all three fields populated.
- FR-6. The user can open an **Edit quote** dialog from a single quote
  row, pre-filled with the existing text / page / note.
- FR-7. The user can save an edited quote; the row updates in place.
- FR-8. The user can open a **Delete quote** confirm dialog from a
  single quote row.
- FR-9. Confirming delete removes the quote from the section and
  persists the change.
- FR-10. Quotes within a section are sorted by `createdAt` descending
  (newest first). Sort is stable for equal timestamps.
- FR-11. The Quotes section renders correctly for a book with no
  `quotes` field (legacy / pre-feature data) — treated as zero quotes.
- FR-12. The Quotes section renders correctly for a book with an empty
  `quotes` array — empty state shown.
- FR-13. On save / delete mutation failure, the user sees a toast and
  the dialog stays open. The local input is preserved.
- FR-14. All changes are persisted via `useBookLibrary.updateBook`. The
  `StorageAdapter` is not extended.
- FR-15. A book may have at most **200** quotes (hard cap, enforced by
  `validateBookInput`). The **+ Add quote** button is rendered with
  the `disabled` attribute (visible but non-interactive) when the
  book is at the cap.

## 7. Data

### 7.1 New file `src/types/quote.ts`

```ts
export interface Quote {
  /** UUID v4, generated by the storage layer. */
  id: string;
  /** 1–2000 characters after trim. */
  text: string;
  /** Optional page number: integer 1..99999. */
  page?: number;
  /** Optional personal note: 1–1000 characters after trim. */
  note?: string;
  /** ISO 8601 timestamp, set by the storage layer on creation. */
  createdAt: string;
}

/** What the UI submits to add a quote. `id` and `createdAt` are storage-side. */
export type QuoteInput = Omit<Quote, "id" | "createdAt">;
```

### 7.2 Change to `src/types/book.ts`

```ts
import type { Quote } from "./quote";

export interface Book {
  // ... existing fields unchanged ...
  /** Quotes from the book, sorted by createdAt desc in the UI. */
  quotes?: Quote[];
}
```

`BookInput = Omit<Book, "id" | "createdAt">` automatically picks up the
new optional `quotes` field — no separate type change needed.

### 7.3 Migration

None required. Books persisted before this spec have no `quotes` field;
both the runtime (treats `undefined` as `[]`) and the validator
(accepts `undefined`) handle them transparently.

## 8. Storage interface

**No changes.** `StorageAdapter` keeps its four methods
(`listBooks`, `addBook`, `updateBook`, `deleteBook`). Quotes are saved
as part of the `Book` record via `updateBook`.

## 9. Edge cases & errors

- **Empty title / whitespace-only text.** Rejected by `validateQuote`:
  inline error on the dialog field, save disabled.
- **Page not a positive integer** (e.g. `0`, `-3`, `42.5`, `"42abc"`).
  Rejected by `validateQuote` with an inline error.
- **Page > 99999.** Rejected by `validateQuote`.
- **Note whitespace-only.** Treated as absent (`undefined`) by the
  validator, mirroring spec 007's review.
- **More than 200 quotes on a book** (e.g. imported data). `Add quote`
  is disabled; the section still renders the existing 200.
- **localStorage write fails** (quota / disabled). The adapter throws,
  the section catches via `useBookLibrary.updateBook`'s rejection, the
  section toasts and keeps the dialog open.
- **Two tabs editing the same book.** Last write wins, same as the
  existing book edit / review save flows. No real-time merge.
- **Reload mid-edit.** Dialog state is local; reload closes the dialog
  with the data unchanged. No auto-save.

## 10. Acceptance criteria

A reviewer can tick each box without asking a clarifying question.

- [ ] `npm run lint && npm run test` are green.
- [ ] `Book.quotes?: Quote[]` is in the type system; `Quote` is its own
      type in `src/types/quote.ts`.
- [ ] `validateQuote` is TDD-covered (red-green-refactor) and lives in
      `src/lib/validation/book.ts` next to the other field validators.
- [ ] `validateBookInput` is extended to validate `quotes` (≤ 200
      entries) and existing tests are extended with quote-bearing
      cases.
- [ ] `<QuotesSection />` renders below `<ReviewSection />` in
      `<BookDetail />`.
- [ ] An empty book shows the empty state copy and the **+ Add quote**
      button.
- [ ] Adding a quote with text only, text+page, text+note, and
      text+page+note all succeed and render the expected row.
- [ ] Editing a quote via the dialog updates the row in place.
- [ ] Deleting a quote via the confirm dialog removes the row and
      persists the change.
- [ ] The list is sorted newest first when 3+ quotes are added.
- [ ] Save failure → toast, dialog open, input preserved.
- [ ] Delete failure → toast, dialog open.
- [ ] Reloading the detail page after adding quotes shows the same
      list (persistence works).
- [ ] A book with no `quotes` field (legacy) renders as zero quotes.
- [ ] Adding a 201st quote is blocked at the validator (a unit test
      covers the 201-rejection case).
- [ ] Dialog state is owned by `<BookDetail />`, not by
      `<QuotesSection />` (matches the existing Edit/Delete pattern).
- [ ] Page is rendered as `p. <number>`; note is rendered as a smaller
      muted italic line above the meta; no `Note:` label.

## 11. Out of scope (for this spec)

- Quotes from external sources (Goodreads, Kindle).
- OCR / image quotes.
- Markdown / rich-text inside quote or note (deferred to spec 008).
- A dedicated quotes page or cross-book quotes search.
- Sharing, public quotes, multi-user.
- Quote comments, edit history, version diffs.
- Bulk import / export of quotes.
- Tagging or categorizing individual quotes.
- Per-quote timestamps in the UI (createdAt is the sort key, not shown).

## 12. Open questions

None at draft time. All decisions resolved during brainstorming
sessions 2026-06-04:

- **D1.** Quote shape = text + optional page + optional personal note.
- **D2.** Storage = embedded in `Book` as `Book.quotes?: Quote[]`; no
  `StorageAdapter` changes.
- **D3.** Edit existing = add + edit + delete (per-quote).
- **D4.** Position = below Review on the detail page.
- **D5.** Per-quote style = compact row (option A from brainstorming).
- **D6.** Add / Edit form = modal dialog (option B), mirroring
  `EditBookDialog`.
- **D7.** Sort order = newest first (`createdAt` desc).
- **D8.** Delete = confirm dialog, mirroring `DeleteBookDialog`.
- **D9.** Dialog state ownership = `<BookDetail />` (matches existing
  pattern). `<QuotesSection />` exposes `onAdd`, `onEdit(quote)`,
  `onDelete(quote)` callbacks.
- **D10.** Hard cap of 200 quotes per book (soft for MVP; revisitable
  when the backend arrives).
