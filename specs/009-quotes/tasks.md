# Tasks: Book Quotes

> **Status:** Done
> **Spec:** `../spec.md` (`Implemented`)
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task
`[x]` only when its acceptance line is satisfied and
`npm run lint && npm run test` pass.

Order matters: T1 establishes the type and validator contract; T2–T4
build the presentational pieces (no inter-dependencies); T5 stitches
them into a section; T6 wires the dialogs into the page; T7 polishes
and verifies.

---

## T1. Types + validators (`Quote`, `Book.quotes?`, `validateQuote`, `validateQuotes`)

- [x] **Files:**
  `src/types/quote.ts` (new),
  `src/types/book.ts` (modified),
  `src/lib/validation/book.ts` (modified),
  `tests/validation/book.test.ts` (modified).
- **Acceptance:**
  - New `src/types/quote.ts` exports `Quote` and `QuoteInput`
    exactly as in spec §7.1.
  - `Book` gains `quotes?: Quote[]` and imports `Quote` from
    `./quote`. `BookInput` inherits the new optional field via
    `Omit` (decided during implementation: `BookInput =
    Omit<Book, "id" | "createdAt">` keeps `quotes: Quote[]` at
    the adapter boundary; see D-P amendment in plan §6 and the
    `validateBookQuote` split below).
  - New `validateQuoteText` / `validateQuotePage` /
    `validateQuoteNote` / `validateQuote` (id-less, exported
    public, returns `QuoteInput`) / `validateBookQuote`
    (full Quote, requires `id` + `createdAt`, returns `Quote`,
    used by `validateBookInput`).
  - New `validateQuotes(raw, errors): Quote[] | undefined`
    helper:
    - `raw === undefined` → returns `undefined` (no quotes
      field).
    - Non-array → `errors.quotes = "Quotes must be an array."`,
      returns `undefined`.
    - Array of N > 200 → `errors.quotes = "At most 200 quotes
      allowed."`, returns `undefined`.
    - Array contains an item that fails `validateBookQuote` →
      forwards the item's errors under `quotes.<i>.<field>` keys.
    - Valid array → returns the normalised array.
  - `validateBookInput` calls `validateQuotes` alongside the
    other field validators. The returned `BookInput` spreads
    `quotes` into the value object only when defined, else
    omits the key (mirroring `coverUrl` / `rating` / `review`).
  - Tests cover: each combination of valid quote fields; each
    invalid text / page / note case; valid `validateQuotes`
    shapes (empty, 1, 200); invalid shapes (non-array, > 200,
    item with invalid sub-field). 23 new tests.
- [x] **Notes:** TDD — red-green-refactor. 88 validator tests
  total pass.

## T2. `QuoteCard` (presentational, compact row)

- [x] **Files:**
  `src/features/quotes/QuoteCard.tsx` (new),
  `src/features/quotes/index.ts` (new — barrel).
- **Acceptance:**
  - Exports a `QuoteCard` component with props
    `{ quote: Quote; onEdit: () => void; onDelete: () => void }`.
  - Renders the text inside a `<p className="italic
    whitespace-pre-line">` wrapped in curly quotes (literal
    `&ldquo;` / `&rdquo;`).
  - If `quote.note` is set, renders a `<p
    className="text-sm text-muted-foreground italic">` above the
    meta line with the note text. No "Note:" label.
  - Renders a right-aligned meta row with `p. <number>` (when
    set) followed by two `Button` (variant `link`, size `xs`)
    for **Edit** and **Delete**. Page label and divider dots
    are conditional on `quote.page` so the row never starts
    with `·`.
  - Soft card surface: `bg-muted/40 border-border/40
    rounded-lg p-3.5`.
  - `data-testid` attributes: `quote-card`, `quote-text`,
    `quote-note`, `quote-page`, `quote-edit-button`,
    `quote-delete-button`.
  - No new tests — presentational. Behaviour captured by
    `QuotesSection` integration test.
- [x] **Notes:** no new npm deps. Click handlers are pure
  callbacks.

## T3. `QuoteDialog` (modal add/edit)

- [x] **Files:**
  `src/features/quotes/QuoteDialog.tsx` (new),
  `src/features/quotes/index.ts` (modified — add export),
  `tests/features/quotes/QuoteDialog.test.tsx` (new).
- **Acceptance:**
  - Props: `{ open, onOpenChange, initialValue?: QuoteInput,
    onSave: (input) => Promise<void> }`.
  - State: `text`, `page` (raw string), `note`, `errors`,
    `isSaving`.
  - Renders `<Dialog>` with three fields: `<Textarea rows={6}>`
    for `text` (autofocused via `queueMicrotask` deferred
    until content mounts), `<Input type="number">` for `page`,
    `<Textarea rows={3}>` for `note`. Per-field inline error
    via `aria-invalid` + `aria-describedby`.
  - Footer: outline **Cancel** + primary **Save** (label
    "Saving…" while in-flight). Save disabled while
    `isSaving`.
  - Form state resets on `open` / `initialValue` change via
    `useEffect`.
  - Local `validateQuote({ text, page, note })` on Save; on
    success calls `props.onSave(value)`; on rejection,
    `toast.error("Couldn't save quote. Try again.")` and
    stays open.
  - Cancel / dialog close: `onOpenChange(false)` without
    calling `onSave`.
  - 8 tests covering: empty add form, pre-filled edit form,
    empty text → inline error, non-integer page → inline error,
    valid save → `onSave` with normalised payload + close,
    blank page/note → absent (no key on payload), `onSave`
    rejection → toast + stay open + input preserved, Cancel
    → close without `onSave`.
- [x] **Notes:** uses shadcn `Dialog`, `Input`, `Textarea`,
  `Button` primitives — all in `src/components/ui/`. `sonner`
  is already a project dep.

## T4. `DeleteQuoteDialog` (modal delete confirm)

- [x] **Files:**
  `src/features/quotes/DeleteQuoteDialog.tsx` (new),
  `src/features/quotes/index.ts` (modified — add export).
- **Acceptance:**
  - Props: `{ open, onOpenChange, quote: Quote | null,
    onConfirm: () => Promise<void> }`.
  - Renders shadcn `<AlertDialog>` (mirrors
    `DeleteBookDialog` — destructive actions use
    `AlertDialog`).
  - Title "Delete quote?", description with warning, body
    shows a 120-char preview of the quote text (with
    ellipsis if longer) in a soft warm card matching
    `QuoteCard`.
  - Footer: outline **Cancel** + destructive **Delete**
    (variant destructive, "Deleting…" while in-flight).
  - Action uses `e.preventDefault()` to keep the dialog open
    on storage failure and close manually on success.
  - On `onConfirm` rejection, `toast.error("Couldn't delete
    quote. Try again.")` and stays open.
  - `data-testid` attributes: `delete-quote-dialog` (on
    content), `delete-quote-cancel-button`,
    `delete-quote-confirm-button`, `delete-quote-preview`.
  - No new tests — mirrors `DeleteBookDialog` posture.
- [x] **Notes:** the destructive button uses
  `variant="destructive"` from shadcn. No new npm deps.

## T5. `QuotesSection` (dumb section, callbacks up)

- [x] **Files:**
  `src/features/quotes/QuotesSection.tsx` (new),
  `src/features/quotes/index.ts` (modified — add export),
  `tests/features/quotes/QuotesSection.test.tsx` (new).
- **Acceptance:**
  - Props: `{ book: Book; onAdd: () => void; onEdit: (quote:
    Quote) => void; onDelete: (quote: Quote) => void }`.
  - Owns no state. All state lives in `BookDetail`.
  - Renders `<DetailSection title="Quotes">`:
    - if `book.quotes` is undefined or `[]`: muted empty
      copy + outlined **+ Add quote** button.
    - else: a `<div className="space-y-3">` of `<QuoteCard>`
      items, sorted by `createdAt` desc, then a solid
      **+ Add quote** button.
    - The button is `disabled` (rendered, not removed) when
      `book.quotes.length >= 200`.
  - 10 tests covering: heading, empty (undefined), empty
    (`[]`), list of N cards, sort newest first, **+ Add**
    click → `onAdd`, button disabled at 200, button enabled
    at 199 (boundary), per-card Edit click → `onEdit(quote)`,
    per-card Delete click → `onDelete(quote)`.
- [x] **Notes:** section is intentionally dumb — same posture
  as `BookCard` (spec 002). Sort is a one-liner applied at
  render time on a copy of the array.

## T6. `BookDetail` wires the dialogs and renders `<QuotesSection>`

- [x] **Files:**
  `src/features/detail-view/BookDetail.tsx` (modified),
  `tests/features/detail-view/BookDetail.test.tsx` (modified).
- **Acceptance:**
  - New state fields: `editingQuote: QuoteInput | null`,
    `isAddingQuote: boolean`, `deletingQuote: Quote | null`.
    The `isAddingQuote` flag is a post-plan deviation
    (D11) — see spec §12 and commit `c3d2004`.
  - New handlers: `handleAddQuote` (sets `isAddingQuote=true`,
    `editingQuote=null`), `handleEditQuote(quote)` (sets
    `editingQuote` payload, `isAddingQuote=false`),
    `handleDeleteQuote(quote)` (sets `deletingQuote`),
    `handleSaveQuote(input)` (stamps `id` + `createdAt`,
    prepends to `book.quotes`, defensive
    `validateBookInput` for the 200 cap, `updateBook`),
    `handleConfirmDeleteQuote` (filters by id, `updateBook`).
  - In the page main, after `<ReviewSection book={book} />`,
    render `<QuotesSection book={book} onAdd={handleAddQuote}
    onEdit={handleEditQuote} onDelete={handleDeleteQuote} />`.
  - After the main `<div>`, render `<QuoteDialog>` and
    `<DeleteQuoteDialog>` as siblings. Both clear their
    respective state on `onOpenChange(false)`.
  - 4 new tests: "Quotes" heading appears below "Review"
    (via `compareDocumentPosition` +
    `DOCUMENT_POSITION_FOLLOWING`), empty state copy,
    **+ Add quote** click opens the `QuoteDialog` with
    empty form fields, existing quotes render newest-first.
- [x] **Notes:** the orchestrator gets fatter (now owns
  6 dialog-state slots across 4 dialogs). Acceptable per
  plan §7. Deviation D11 (split `isAddingQuote` flag)
  recorded in spec §12 and the T6 commit message.

## T7. Polish & verification

- [x] **Files:** (no new code);
  `specs/009-quotes/tasks.md` updated,
  `specs/009-quotes/spec.md` amended with D11 + status
  bump to Implemented.
- **Acceptance:**
  - All spec §10 acceptance criteria for 009 are verified
    manually / via tests.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes: **280/280 across 24 files**
    (235 from spec 007 baseline + 45 new from spec 009:
    validators 23, QuoteDialog 8, QuotesSection 10,
    BookDetail 4).
  - `npx tsc --noEmit` clean.
  - `npm run build` succeeds. `/book/[id]` route is now
    4.53 kB (was 2.81 kB before spec 009, +1.72 kB for
    the Quotes section + dialogs).
  - No new `any` introduced (`grep -rE ': any\b|as
    any\b' src/ tests/` returns no matches).
  - No new npm dependencies introduced (no changes to
    `package.json`).
  - No raw HTML controls where shadcn has an equivalent
    (the only matches in `src/` are the shadcn wrappers
    themselves in `src/components/ui/textarea.tsx` and
    `src/components/ui/input.tsx`, plus two code-comment
    mentions of `<input>` in `BookDetail.tsx` and
    `QuoteDialog.tsx`).
  - Update this file: tick all `[x]`s, set Status to
    `Done`.
- [x] **Notes:** verification report (2026-06-05):
  - `npm run lint` — ✔ No ESLint warnings or errors
  - `npm run test` — 280/280 passed across 24 files
    (235 from spec 007 baseline + 45 new from spec 009:
    validators 23, QuoteDialog 8, QuotesSection 10,
    BookDetail 4)
  - `npx tsc --noEmit` — clean
  - `npm run build` — ✓ Compiled successfully, route
    `/book/[id]` is now 4.53 kB (was 2.81 kB before
    spec 009, +1.72 kB for the Quotes section + two
    dialogs). Shared chunks unchanged.
  - `grep -rE ': any\b|as any\b' src/ tests/` — no matches
  - `grep -rE '<(button|input|dialog|select|textarea)\b'
    src/` filtered to non-UI files — only the shadcn
    wrappers themselves (`textarea.tsx`, `input.tsx`) and
    two comment references. No raw HTML controls in the
    new code.
  - `package.json` — no changes. No new entries.
  - Spec §10 acceptance criteria coverage:
    - Book + BookInput have `quotes?: Quote[]` → T1
    - `validateQuote` TDD-covered with 23 new tests → T1
    - `validateBookInput` accepts arrays ≤ 200 → T1
    - Empty / whitespace-only page / note normalise to
      absent → T1
    - Non-string text rejected → T1
    - Text > 2000 rejected → T1
    - 201-quote array rejected → T1
    - A book without quotes (undefined or []) renders
      empty state → T5, T6
    - `<QuotesSection />` renders below `<ReviewSection />`
      → T6 (via `compareDocumentPosition` +
      `DOCUMENT_POSITION_FOLLOWING`)
    - **+ Add quote** click opens the `QuoteDialog` with
      empty form fields → T6
    - `QuoteDialog` add / edit both work; 4 quote-shape
      variants (text only / +page / +note / +both) all
      validate and render → T3
    - `onSave` rejection → toast "Couldn't save quote.
      Try again." + stays open + input preserved → T3
    - In-flight controls disabled → T3
    - List sort newest first → T5
    - 200-cap: button disabled, validator rejects 201 → T1,
      T5
    - BookDetail renders `<QuotesSection>` after
      `<ReviewSection>` → T6
    - No raw HTML controls where shadcn has an equivalent
      → T2, T3, T4
    - Lint / tests pass; no new `any` → T7
    - No new npm dependencies → T7
  - Deviation recorded in spec §12 D11 (the
    `isAddingQuote` split — see commit `c3d2004`).
  - Manual QA pending (not run in this environment).
    The full QA list is in `plan.md` §8.
