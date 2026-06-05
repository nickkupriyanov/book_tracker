# Tasks: Book Quotes

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Plan:** `../plan.md` (Draft)

Each task is small enough to be one commit. Mark a task `[x]` only when
its acceptance line is satisfied and `npm run lint && npm run test`
pass.

Order matters: T1 establishes the type and validator contract; T2–T4
build the presentational pieces (no inter-dependencies); T5 stitches
them into a section; T6 wires the dialogs into the page; T7 polishes
and verifies.

---

## T1. Types + validators (`Quote`, `Book.quotes?`, `validateQuote`, `validateQuotes`)

- **Files:**
  `src/types/quote.ts` (new),
  `src/types/book.ts` (modified),
  `src/lib/validation/book.ts` (modified),
  `tests/validation/book.test.ts` (modified).
- **Acceptance:**
  - New `src/types/quote.ts` exports `Quote` and `QuoteInput`
    exactly as in spec §7.1.
  - `Book` gains `quotes?: Quote[]` and imports `Quote` from
    `./quote`. `BookInput` inherits the new optional field via
    `Omit`.
  - New `validateQuote(raw, errors): QuoteInput | undefined`
    helper in `src/lib/validation/book.ts`:
    - `raw.text` non-string / empty / whitespace-only / > 2000
      chars after trim → `errors.text` set, returns `undefined`.
    - `raw.text` valid string → returns the trimmed string.
    - `raw.page === undefined` / `null` → returns `undefined`
      for the field.
    - `raw.page` non-integer or < 1 or > 99999 →
      `errors.page = "Page must be a whole number between 1 and
      99999."`, returns `undefined`.
    - `raw.page` integer 1..99999 → returns the number.
    - `raw.note === undefined` / `null` → returns `undefined`.
    - `raw.note` whitespace-only → returns `undefined`
      (normalised to absent).
    - `raw.note` non-string / > 1000 chars → `errors.note` set.
    - `raw.note` valid string → returns the trimmed string.
  - New `validateQuotes(raw, errors): QuoteInput[] | undefined`
    helper:
    - `raw === undefined` → returns `undefined` (no quotes
      field).
    - Non-array → `errors.quotes = "Quotes must be an array."`,
      returns `undefined`.
    - Array of N > 200 → `errors.quotes = "At most 200 quotes
      allowed."`, returns `undefined`.
    - Array contains an item that fails `validateQuote` →
      forwards the item's errors (e.g. `errors["quotes.0.text"]`
      or similar keyed under the same `errors` map).
    - Valid array → returns the normalised array.
  - `validateBookInput` calls `validateQuotes` alongside the
    other field validators. The returned `BookInput` spreads
    `quotes` into the value object only when defined, else
    omits the key (mirroring `coverUrl` / `rating` / `review`).
  - Validator tests cover: each combination of valid quote
    fields; each invalid text / page / note case; valid
    `validateQuotes` shapes (empty, 1, 200); invalid shapes
    (non-array, > 200, item with invalid sub-field). ≥ 8 tests.
- **Notes:** TDD — red-green-refactor. Mirror the existing
  `validateRating` / `validateReview` patterns (spec 006 / 007
  T1). The 200 cap is enforced at the array level, not the
  per-item level, so the 201-case is in `validateQuotes`, not
  `validateQuote` (plan D-P4).

## T2. `QuoteCard` (presentational, compact row)

- **Files:**
  `src/features/quotes/QuoteCard.tsx` (new),
  `src/features/quotes/index.ts` (new — barrel).
- **Acceptance:**
  - Exports a `QuoteCard` component with props
    `{ quote: Quote; onEdit: () => void; onDelete: () => void }`.
  - Renders the text inside a `<p className="italic
    whitespace-pre-line">` wrapped in curly quotes (literal `"` /
    `"` characters, not styled). Line breaks preserved.
  - If `quote.note` is set, renders a `<p
    className="text-sm text-muted-foreground italic">` above the
    meta line with the note text.
  - Renders a right-aligned meta row:
    - If `quote.page` is set, the text `p. <number>` followed
      by ` · `.
    - Followed by two `<button type="button" className="text-sm
      text-primary hover:underline">` for **Edit** and
      **Delete**; clicking each fires the matching `onEdit` /
      `onDelete` prop.
  - `data-testid` attributes: `quote-card`, `quote-text`,
    `quote-note`, `quote-page`, `quote-edit-button`,
    `quote-delete-button`.
  - No new tests — presentational, mirrors the "A — Compact
    row" style decision. Behaviour is captured by the
    `QuotesSection` integration test.
- **Notes:** no new npm deps. Pure presentational; all
  interaction flows through the callbacks.

## T3. `QuoteDialog` (modal add/edit)

- **Files:**
  `src/features/quotes/QuoteDialog.tsx` (new),
  `src/features/quotes/index.ts` (modified — add export),
  `tests/features/quotes/QuoteDialog.test.tsx` (new).
- **Acceptance:**
  - Props:
    ```ts
    {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      initialValue?: QuoteInput;
      onSave: (input: QuoteInput) => Promise<void>;
    }
    ```
  - State: `text`, `page` (raw string), `note` (all initialised
    from `initialValue` or empty); `errors: Record<string,
    string>`; `isSaving: boolean`.
  - Renders `<Dialog open onOpenChange>` with `<DialogContent>`:
    - `<DialogTitle>` = "Add quote" if no `initialValue`, else
      "Edit quote".
    - `<DialogDescription>` = short helper text.
    - `<Textarea rows={6}>` for `text`, autofocused on open,
      `aria-label="Quote"`, `aria-invalid` set when
      `errors.text` is present.
    - `<Input type="number">` for `page`,
      `aria-label="Page (optional)"`.
    - `<Textarea rows={3}>` for `note`,
      `aria-label="Note (optional)"`.
    - Per-field inline error message (`role="alert"`).
    - Footer: outline **Cancel** + primary **Save** (or
      "Saving…" while in-flight). Save disabled while
      `isSaving`; both buttons disabled.
  - Behaviour:
    - Cancel / dialog close: `onOpenChange(false)` without
      calling `onSave`.
    - Save: local `validateQuote({ text, page, note })`; on
      failure set `errors` and return; on success call
      `props.onSave(input)`; on rejection, `toast.error
      ("Couldn't save quote. Try again.")` and stay open.
  - `data-testid` attributes: `quote-dialog`, `quote-text-input`,
    `quote-page-input`, `quote-note-input`,
    `quote-cancel-button`, `quote-save-button`,
    `quote-error-text`, `quote-error-page`, `quote-error-note`.
  - Tests cover: renders empty form in add mode; renders
    pre-filled form in edit mode (text + page + note all
    visible); empty text + Save → inline error, no `onSave`
    call; non-integer page + Save → inline error, no `onSave`
    call; valid input + Save → `onSave` called with normalised
    `QuoteInput`, dialog closes; `onSave` rejection → toast
    fired, dialog stays open; Cancel button → `onOpenChange
    (false)` without `onSave`. ≥ 5 tests.
- **Notes:** uses the shadcn `Dialog`, `Input`, `Textarea`,
  `Button` primitives — all already in `src/components/ui/`.
  `sonner` is already a project dep.

## T4. `DeleteQuoteDialog` (modal delete confirm)

- **Files:**
  `src/features/quotes/DeleteQuoteDialog.tsx` (new),
  `src/features/quotes/index.ts` (modified — add export).
- **Acceptance:**
  - Props:
    ```ts
    {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      quote: Quote | null;
      onConfirm: () => Promise<void>;
    }
    ```
  - Renders `<Dialog open onOpenChange>` with `<DialogContent>`:
    - `<DialogTitle>` = "Delete quote".
    - Body `<p>` with the quote text. If text length > 120
      chars, truncate to 120 chars + "…". If `quote === null`,
      render an empty body (dialog should not be open in that
      case anyway).
    - Footer: outline **Cancel** + destructive **Delete**
      (variant destructive) (or "Deleting…" while in-flight).
  - Behaviour:
    - Cancel / dialog close: `onOpenChange(false)` without
      calling `onConfirm`.
    - Delete: `props.onConfirm()`; on rejection, `toast.error
      ("Couldn't delete quote. Try again.")` and stay open.
  - `data-testid` attributes: `delete-quote-dialog`,
    `delete-quote-cancel-button`, `delete-quote-confirm-button`.
  - No new tests — mirrors the existing `DeleteBookDialog`
    pattern (spec 004 T2). The truncation logic is captured
    in the section's integration test.
- **Notes:** the destructive button uses
  `variant="destructive"` from shadcn — same as
  `DeleteBookDialog`. No new npm deps.

## T5. `QuotesSection` (dumb section, callbacks up)

- **Files:**
  `src/features/quotes/QuotesSection.tsx` (new),
  `src/features/quotes/index.ts` (modified — add export),
  `tests/features/quotes/QuotesSection.test.tsx` (new).
- **Acceptance:**
  - Props:
    ```ts
    {
      book: Book;
      onAdd: () => void;
      onEdit: (quote: Quote) => void;
      onDelete: (quote: Quote) => void;
    }
    ```
  - Owns no state. All state lives in `BookDetail`.
  - Renders `<DetailSection title="Quotes">`:
    - if `book.quotes === undefined` or `book.quotes.length === 0`:
      `<p className="text-muted-foreground text-sm"
      data-testid="quotes-empty">"No quotes yet. Add the first
      passage that stayed with you."</p>` + outlined **+ Add
      quote** button.
    - else: a `<div className="space-y-3">` of `<QuoteCard>`s,
      sorted by `createdAt` desc; then a **+ Add quote** button
      (solid variant, `data-testid="add-quote-button"`).
    - The `+ Add quote` button is `disabled` (still rendered,
      non-interactive) when `book.quotes.length >= 200`.
  - On `+ Add quote` click, calls `props.onAdd`.
  - On per-quote Edit / Delete button click, calls
    `props.onEdit(quote)` / `props.onDelete(quote)`.
  - Tests cover: empty state for `undefined` `quotes`; empty
    state for `[]`; list of N cards for N entries; sort order
    is newest first (assertion against the rendered order via
    test ids on the cards); `+ Add quote` click calls `onAdd`;
    `+ Add quote` is `disabled` when `book.quotes.length === 200`;
    Edit click on a card calls `onEdit(quote)`; Delete click on
    a card calls `onDelete(quote)`. ≥ 5 tests.
- **Notes:** section is intentionally dumb — same posture as
  the existing `BookCard` (spec 002). The only "intelligence"
  is the sort, which is a one-liner.

## T6. `BookDetail` wires the dialogs and renders `<QuotesSection>`

- **Files:**
  `src/features/detail-view/BookDetail.tsx` (modified),
  `tests/features/detail-view/BookDetail.test.tsx` (modified).
- **Acceptance:**
  - New state fields: `editingQuote: QuoteInput | null`,
    `deletingQuote: Quote | null`.
  - New handlers:
    - `handleAddQuote()` → `setEditingQuote({ text: "",
      page: undefined, note: undefined })`.
    - `handleEditQuote(quote)` → `setEditingQuote({ text:
      quote.text, page: quote.page, note: quote.note })`.
    - `handleDeleteQuote(quote)` → `setDeletingQuote(quote)`.
    - `handleSaveQuote(input)` →
      ```
      const newQuote: Quote = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      const next = [newQuote, ...(book.quotes ?? [])];
      const result = validateBookInput({ ...book, quotes: next });
      if (!result.ok) { toast.error("Couldn't save quote."); return; }
      try {
        await updateBook(book.id, { ...book, quotes: next });
        setEditingQuote(null);
      } catch { toast.error("Couldn't save quote. Try again."); }
      ```
    - `handleConfirmDeleteQuote()` →
      ```
      if (!deletingQuote) return;
      const next = (book.quotes ?? []).filter(q => q.id !== deletingQuote.id);
      try {
        await updateBook(book.id, { ...book, quotes: next });
        setDeletingQuote(null);
      } catch { toast.error("Couldn't delete quote. Try again."); }
      ```
  - In the page main, after `<ReviewSection book={book} />`,
    render `<QuotesSection book={book} onAdd={handleAddQuote}
    onEdit={handleEditQuote} onDelete={handleDeleteQuote} />`.
  - After the main `<div>`, render:
    ```tsx
    <QuoteDialog
      open={editingQuote !== null}
      initialValue={editingQuote ?? undefined}
      onOpenChange={(open) => { if (!open) setEditingQuote(null); }}
      onSave={handleSaveQuote}
    />
    <DeleteQuoteDialog
      open={deletingQuote !== null}
      quote={deletingQuote}
      onOpenChange={(open) => { if (!open) setDeletingQuote(null); }}
      onConfirm={handleConfirmDeleteQuote}
    />
    ```
  - Tests cover: "Quotes" heading is visible on a found book;
    "Quotes" section appears after "Review" (relative order);
    clicking the section's `+ Add quote` button renders the
    `QuoteDialog` with empty fields. ≥ 3 tests.
- **Notes:** the orchestrator gets fatter (now owns 4 dialog
  states). Acceptable per plan §7. Mirrors the existing
  `EditBookDialog` / `DeleteBookDialog` pattern.

## T7. Polish & verification

- **Files:** (no new code);
  `specs/009-quotes/tasks.md` updated.
- **Acceptance:**
  - All spec §10 acceptance criteria for 009 are verified
    manually (per plan §8 QA list).
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes (estimated ~245–250 total: ~220
    from spec 007 baseline + ~25–30 new from spec 009:
    validators 8, QuoteDialog 5, QuotesSection 7,
    BookDetail 3).
  - `tsc --noEmit` clean.
  - `npm run build` succeeds.
  - No new `any` introduced.
  - No new npm dependencies introduced.
  - No raw HTML controls where shadcn has an equivalent
    (the dialog uses `<Dialog>`, the form uses
    `<Textarea>` / `<Input>`).
  - Update this file: tick all `[x]`s, set Status to `Done`.
- **Notes:** verification report (post-implementation):
  - [filled in after tasks T1–T6 are committed]
  - Manual QA pending (not run in this environment). The
    full QA list is in `plan.md` §8.
