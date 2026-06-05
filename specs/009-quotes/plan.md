# Plan: Book Quotes

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Author:** —
> **Created:** 2026-06-04

---

## 1. Architecture summary

Book Quotes is the third per-book content feature, after Rating (spec 006)
and Review (spec 007). It uses the same section-based architecture from
spec 005 D7: a new `QuotesSection` drops in below the existing
`ReviewSection` in the detail page.

The biggest deviation from the spec 007 pattern is **dialog ownership**:
rating and review are inline / smart-section-only, but quotes need **two
modal dialogs** (Add/Edit, Delete) and there is no precedent for a section
owning dialogs. The spec resolved this in D9 — `BookDetail` owns the
dialog state and renders the dialogs as siblings of the section, mirroring
the existing `EditBookDialog` / `DeleteBookDialog` pattern. `QuotesSection`
is dumb: it receives `onAdd` / `onEdit(quote)` / `onDelete(quote)`
callbacks and renders the list.

Quotes are stored **embedded** in `Book` as `Book.quotes?: Quote[]`
(spec 009 D2). The `StorageAdapter` is not extended. A new domain type
`Quote` lives in its own file `src/types/quote.ts` (per the project's
"types are the contract" principle, constitution §3). The validator gets
two new helpers — `validateQuote` and `validateQuotes` — alongside the
existing per-field validators in `src/lib/validation/book.ts`.

Rich text inside a quote's `text` / `note` is explicitly out of scope
(constitution §1, §5) and already deferred to spec 008 (the same spec that
upgrades the review).

## 2. Module / file layout

```
src/types/quote.ts                              # NEW: Quote + QuoteInput
src/types/book.ts                               # MODIFIED: add quotes?: Quote[]
src/lib/validation/book.ts                      # MODIFIED: add validateQuote + validateQuotes
src/features/quotes/                            # NEW feature folder
├── QuoteCard.tsx                                # NEW: presentational, compact row
├── QuoteDialog.tsx                             # NEW: modal add/edit (form)
├── DeleteQuoteDialog.tsx                       # NEW: modal delete confirm
├── QuotesSection.tsx                           # NEW: section, dumb (callbacks up)
└── index.ts                                    # NEW: barrel
src/features/detail-view/BookDetail.tsx         # MODIFIED: own dialog state, render dialogs
tests/
├── validation/book.test.ts                     # MODIFIED: quote validation
├── features/quotes/                            # NEW folder
│   ├── QuoteDialog.test.tsx                    # NEW: form behaviour
│   └── QuotesSection.test.tsx                  # NEW: list / sort / empty / cap
├── features/detail-view/BookDetail.test.tsx    # MODIFIED: section + dialogs visible
```

No deletions. No new domain types beyond the new `Quote`. No new storage
or state changes. No new npm dependencies — all UI primitives
(`Dialog`, `Button`, `Input`, `Textarea`) are already in
`src/components/ui/`.

## 3. Data flow

Happy path for **adding a quote**:

```
[Detail page] (/book/<id>)
  user clicks "+ Add quote" in <QuotesSection>
  -> QuotesSection calls props.onAdd()
  -> BookDetail setEditingQuote({ /* empty input */ })
  -> <QuoteDialog open initialValue={undefined} onSave={handleSave}>
       user types text, page, note
       user clicks "Save"
         QuoteDialog handleSubmit():
           result = validateQuote({ text, page, note })  // local check
           if (!result.ok) setErrors(result.errors); return
           setIsSaving(true)
           try {
             await props.onSave({ text, page, note })  // BookDetail's handler
             props.onOpenChange(false)
           } catch {
             toast.error("Couldn't save quote. Try again.")
           } finally { setIsSaving(false) }
  -> BookDetail handleSave(input):
       next = [/* QuoteInput with id+createdAt from new UUID/timestamp */, ...book.quotes]
       result = validateBookInput({ ...book, quotes: next })  // catches 200 cap
       if (!result.ok) toast + return
       await useBookLibrary.updateBook(book.id, { ...book, quotes: next })
       setEditingQuote(null)
  -> on success: store updates, BookDetail re-renders with new book,
     QuotesSection re-renders with the new quote at the top (sort by
     createdAt desc), dialog closes.
  -> on error: toast, dialog stays open, input preserved.
```

Edit and Delete follow the same shape: `setEditingQuote(quote)` /
`setDeletingQuote(quote)`, dialog renders, `BookDetail.handleSave` /
`handleDelete` runs the store mutation, dialog closes on success or
toasts on failure.

Sort order is applied **at render time** in `QuotesSection`:
`[...book.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))`.
Storage order is irrelevant — the section always presents newest first
(spec 009 D7).

The 200-quote cap (spec 009 §6 FR-15) is enforced at `validateBookInput`
time, not at `validateQuote` time (each quote is valid; the constraint
is on the array size).

## 4. Component breakdown

### `QuoteCard` (NEW, in `src/features/quotes/`)

- **Props:** `{ quote: Quote; onEdit: () => void; onDelete: () => void }`.
- **Renders:** a compact row:
  - the text in italic with surrounding curly quotes, line breaks
    preserved (`whitespace-pre-line`)
  - if `note` is set: a smaller muted-italic line above the meta
  - a right-aligned meta row: `p. <number>` (if set) + `· Edit · Delete`
    as small text links
- **State:** none.
- **Tests:** none. Presentational, mirrors the "A — Compact row" style
  from brainstorming. Behaviour is captured by the `QuotesSection` test
  that asserts the row's text / note / page appear in the DOM.

### `QuoteDialog` (NEW, in `src/features/quotes/`)

- **Props:**
  ```ts
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialValue?: QuoteInput;       // undefined = Add mode
    onSave: (input: QuoteInput) => Promise<void>;
  }
  ```
- **State:**
  - `text: string` (initialised from `initialValue?.text ?? ""`)
  - `page: string` (raw input string; parsed to number on save)
  - `note: string`
  - `errors: Record<string, string>`
  - `isSaving: boolean`
- **Renders:** `<Dialog>` with `<DialogContent>`:
  - title `initialValue ? "Edit quote" : "Add quote"`
  - `<Textarea>` (6 rows) for `text`, autofocused on open
  - `<Input type="number">` for `page`
  - `<Textarea>` (3 rows) for `note`
  - inline error messages per field
  - footer: "Cancel" (outline) + "Save" (primary, disabled while saving,
    label changes to "Saving…")
- **Behaviour:**
  - "Cancel" / dialog close: `onOpenChange(false)` without saving.
  - "Save": local `validateQuote({ text, page, note })`; on success
    calls `props.onSave(input)`; on `props.onSave` rejection, toasts
    and stays open.
- **Tests:** ≥ 5
  - renders empty form in add mode
  - renders pre-filled form in edit mode
  - empty text after trim → inline error, no `onSave` call
  - text + page + note → `onSave` called with normalised input
  - `onSave` rejection → toast, dialog stays open
  - cancel button calls `onOpenChange(false)` without `onSave`

### `DeleteQuoteDialog` (NEW, in `src/features/quotes/`)

- **Props:**
  ```ts
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quote: Quote | null;
    onConfirm: () => Promise<void>;
  }
  ```
- **Renders:** `<Dialog>` mirroring `DeleteBookDialog` (spec 004):
  - title "Delete quote"
  - body: a `<p>` with the quote text, truncated to 120 chars + "…"
    if it exceeds that length
  - footer: "Cancel" (outline) + "Delete" (destructive, disabled
    while in-flight, label "Deleting…")
- **Behaviour:**
  - "Cancel" / dialog close: `onOpenChange(false)`.
  - "Delete": `onConfirm()`; on rejection, toast and stay open.
- **Tests:** none. Mirrors the existing `DeleteBookDialog` test
  patterns (a copy-paste of the truncation logic + dialog wiring is
  not behaviour we need to verify twice).

### `QuotesSection` (NEW, in `src/features/quotes/`)

- **Props:**
  ```ts
  {
    book: Book;
    onAdd: () => void;
    onEdit: (quote: Quote) => void;
    onDelete: (quote: Quote) => void;
  }
  ```
- **State:** none (all dialog state is in `BookDetail`).
- **Renders:** `<DetailSection title="Quotes">`:
  - if `book.quotes` is empty / undefined: empty state (`"No quotes
    yet. Add the first passage that stayed with you."`) + outlined
    `+ Add quote` button
  - else: a `<div className="space-y-3">` of `<QuoteCard>` items,
    sorted by `createdAt` desc, then the `+ Add quote` button (solid)
  - the `+ Add quote` button has `disabled` when
    `book.quotes.length >= 200` (FR-15)
- **Tests:** ≥ 5
  - empty state copy + button when `book.quotes` is undefined
  - empty state copy + button when `book.quotes` is `[]`
  - list of N `QuoteCard`s when `book.quotes` has N entries
  - list is sorted by `createdAt` desc (assertion against rendered
    order, using test ids on the cards)
  - `+ Add quote` click calls `onAdd`
  - `+ Add quote` is `disabled` at 200 quotes
  - per-quote Edit click calls `onEdit(quote)`
  - per-quote Delete click calls `onDelete(quote)`

### `BookDetail` (MODIFIED)

- **State:** two new fields:
  - `editingQuote: QuoteInput | null` (the **input** shape, not a full
    `Quote`, so an empty `{}` means "add mode")
  - `deletingQuote: Quote | null`
- **Handlers:**
  - `handleAddQuote()` → `setEditingQuote({ text: "", page: undefined,
    note: undefined })`
  - `handleEditQuote(quote)` → `setEditingQuote({ text, page, note })`
  - `handleDeleteQuote(quote)` → `setDeletingQuote(quote)`
  - `handleSaveQuote(input)` → assembles a new `Quote` (id from
    `crypto.randomUUID()`, `createdAt` from `new Date().toISOString()`),
    prepends to `book.quotes`, calls `updateBook`, closes the dialog
    on success or toasts on failure. Pre-validates via
    `validateBookInput` to catch the 200-quote cap.
  - `handleConfirmDeleteQuote()` → calls `updateBook(book.id,
    { ...book, quotes: book.quotes.filter(q => q.id !== deleting.id) })`,
    closes the dialog on success or toasts on failure.
- **Renders:** below `<ReviewSection>`, adds:
  ```tsx
  <QuotesSection
    book={book}
    onAdd={handleAddQuote}
    onEdit={handleEditQuote}
    onDelete={handleDeleteQuote}
  />
  ```
  After the main `<div>`, adds:
  ```tsx
  <QuoteDialog
    open={editingQuote !== null}
    initialValue={editingQuote ?? undefined}
    onOpenChange={(open) => { if (!open) setEditingQuote(null); }}
    onSave={async (input) => { await handleSaveQuote(input); }}
  />
  <DeleteQuoteDialog
    open={deletingQuote !== null}
    quote={deletingQuote}
    onOpenChange={(open) => { if (!open) setDeletingQuote(null); }}
    onConfirm={async () => { await handleConfirmDeleteQuote(); }}
  />
  ```
- **Tests:** ≥ 3
  - "Quotes" heading is present on the page
  - "Quotes" section appears below "Review" (relative order)
  - clicking the section's `+ Add quote` button opens the dialog
    (assertion against the `QuoteDialog` rendering)

### `src/types/quote.ts` (NEW)

- Exports `Quote` and `QuoteInput` exactly as in spec §7.1.

### `src/types/book.ts` (MODIFIED)

- Adds `import type { Quote } from "./quote"` and a new
  `quotes?: Quote[]` field on `Book`. `BookInput` inherits it via `Omit`.

### `src/lib/validation/book.ts` (MODIFIED)

- New helper: `validateQuote(raw, errors)` returns
  `QuoteInput | undefined`. Validates:
  - `text`: required string, 1–2000 chars after trim
  - `page`: optional integer 1..99999
  - `note`: optional string, 1–1000 chars after trim
    (whitespace-only → `undefined`)
- New helper: `validateQuotes(raw, errors)` returns
  `QuoteInput[] | undefined`. Validates that the input is an array
  of `QuoteInput` shapes (each re-validated via `validateQuote`),
  and the array length is ≤ 200.
- `validateBookInput` integration: calls both, and spreads `quotes`
  into the returned `BookInput` value when defined (mirroring
  `coverUrl` / `rating` / `review`).
- **Tests:** ≥ 8
  - valid quote (text only, text+page, text+note, text+page+note)
  - text empty / whitespace-only → error
  - text > 2000 → error
  - page = 0, page = -3, page = 42.5, page = "42" → error
  - page = 99999 → ok; page = 100000 → error
  - note whitespace-only → returns `undefined`
  - note > 1000 → error
  - non-string text → error
  - `validateQuotes`: empty array ok, single quote ok, 200 quotes ok,
    201 quotes error, non-array error, array with invalid quote
    error, non-quote items error.

## 5. Storage adapter changes

None. `LocalStorageAdapter` persists arbitrary `Book` shapes via
`JSON.stringify` / `JSON.parse`. The new optional `quotes` field is
transparent. Existing books in localStorage (without `quotes`) parse
back as `undefined`; both the runtime (treats `undefined` as empty) and
the validator (accepts `undefined`) handle them transparently.

## 6. Decisions & trade-offs

- **D-P1. `BookDetail` owns the dialog state, not `QuotesSection`.**
  Mirrors the existing `EditBookDialog` / `DeleteBookDialog` pattern
  (spec 003 / 004). The section stays dumb: it forwards clicks via
  callbacks. Avoids inventing a new pattern for "section with two
  dialogs" that no other section uses.
- **D-P2. `Quote` lives in its own file `src/types/quote.ts`.**
  Quotes are a meaningful sub-aggregate of `Book`. The file mirrors
  the convention used by other types (one file per domain concept,
  even when small). `Book` imports `Quote` to type its new field.
- **D-P3. Sort is applied at render time, not at storage time.**
  Storage keeps insertion order; `QuotesSection` sorts on every
  render. Trade-off: trivial CPU cost for O(N log N) on each
  re-render, but eliminates the "what if the user wants to reorder?"
  question (they can't — sorted is sorted). When N ≤ 200, the cost
  is invisible. Aligns with spec 009 D7.
- **D-P4. 200-quote cap is enforced at the book level, not the
  per-quote level.** `validateQuote` accepts any shape;
  `validateBookInput` checks `quotes.length ≤ 200`. This is a
  policy on the **container**, not on the **item**, and putting it
  in the right validator keeps each helper single-purpose.
- **D-P5. `+ Add quote` button style: outline in empty state, solid
  in filled state.** Visual convention from the existing detail page
  (the "Write review" button is outlined, the "Edit review" button
  is ghost / solid). Reinforces "this is the primary action when
  nothing exists; you already have some, so this is one more".
- **D-P6. Page is stored as a number on `Quote`, but the input
  field is `<Input type="number">` with a string state in
  `QuoteDialog`.** Mirrors how the user types — they type a string
  into a numeric input. The validator parses and rejects non-integers.
  The dialog never lets a non-integer reach the store.
- **D-P7. Delete confirmation always shows truncated text (120
  chars).** The "Confirm delete X?" pattern benefits from showing
  enough text to identify the right quote. 120 chars is the same
  threshold used in spec 004's `DeleteBookDialog` style.
- **D-P8. No new npm dependencies.** `Dialog`, `Button`, `Input`,
  `Textarea` are all in `src/components/ui/`. `sonner` is in
  `package.json` from specs 003 / 004 / 006 / 007.
- **D-P9. No migration.** Optional field, transparent to
  `JSON.parse`. Existing books in localStorage work without
  changes (treated as zero quotes per FR-11 / §9).
- **D-P10. Future-proofed for spec 008 (rich text).** If rich
  text is later added, `Quote.text` and `Quote.note` would be the
  two fields to upgrade — same posture as `Book.review`. The
  validator signature `validateQuote(raw, errors) => QuoteInput |
  undefined` stays the same; spec 008 adds the rich-text branch
  inside.

## 7. Risks

- **Dialog proliferation in `BookDetail`.** After this spec, the
  detail page renders 4 dialogs (Edit book, Delete book, Add/Edit
  quote, Delete quote). The orchestrator's state grows to 4
  pairs. Acceptable — they all share the same pattern. If we add
  a fifth (e.g. progress / reading session), the orchestrator
  becomes a refactor candidate. Mitigation: keep the handler
  shape uniform (`handleAdd*`, `handleSave*`, `handleConfirmDelete*`).
- **`crypto.randomUUID()` availability.** All modern browsers and
  Node 19+ have it. The project targets Next.js 15 (Node 20+ in
  dev / Edge in prod). Risk: low. If unavailable, we fall back
  to a small ID generator — defer until needed.
- **Long lists of quotes.** With 200 quotes × 2000 chars max, the
  Book JSON is up to ~400 KB. localStorage has a ~5 MB cap per
  origin — leaves headroom for ~12 such books. Adequate for MVP.
  Risk: medium if a user has 50+ books with 200 quotes each.
  Mitigation: the 200 cap is the safety net; the real-world
  median is well under.
- **Sort stability on equal timestamps.** `Array.prototype.sort` is
  stable in modern engines (ES2019+). When two quotes have the
  same `createdAt` (unlikely in practice — millisecond precision),
  the original storage order is preserved. Acceptable.
- **Two tabs editing the same book.** Last write wins. Same
  posture as the existing book edit / review / rating flows. No
  real-time merge. Spec 005 D-P* already accepted this risk.
- **`+ Add quote` button visual consistency.** The same button
  shows in two states (outline when empty, solid when not). Risk
  is that "solid" looks heavier than the rest of the page. The
  decision is recorded in D-P5; if it looks off, plan §8 QA
  flags it for a tweak.
- **Spec 008 (rich text) refactor risk for `Quote`.** When we
  upgrade `Quote.text` and `Quote.note` to a structured state,
  the validator's branching logic must support both forms. Same
  mitigation as spec 007 (D-P9 there): the validator signature
  stays the same; the new branch is added inside. Existing
  plain-text quotes continue to validate and render unchanged.
- **`BookDetail` re-render churn.** Today, every `updateBook`
  call (rating, review, quote) re-renders the detail page. With
  200 quotes, each render sorts the list. At 60 fps and
  occasional updates, this is invisible. Risk: low.

## 8. Rollout

- No feature flag, no migration (D-P9).
- Manual QA (per spec §10):
  1. Detail page, book with 3 quotes — see "Quotes" section with
     3 rows in newest-first order, `+ Add quote` button below.
  2. Click `+ Add quote` — dialog opens, textarea focused, three
     fields visible.
  3. Type a quote, leave page and note empty, click Save — dialog
     closes, quote appears at the top.
  4. Type a quote with all three fields populated, click Save —
     dialog closes, row shows text + muted note + `p. 42`.
  5. Click **Edit** on a row — dialog opens pre-filled. Change
     one word, click Save — row updates, position unchanged (the
     `createdAt` is preserved; sort key unchanged).
  6. Click **Delete** on a row — confirm dialog appears with
     truncated text. Click Cancel — row unchanged.
  7. Click **Delete** again, click Delete — row disappears.
  8. Reload the page — all changes persist.
  9. Delete all quotes — empty state copy appears.
  10. Book with no `quotes` field (legacy data) — empty state
      copy appears (no error).
  11. Force a storage failure (DevTools: `setItem` throws) on
      Add → toast "Couldn't save quote. Try again.", dialog
      stays open, input preserved.
  12. Same for Edit and Delete.
  13. Page validation: type `0`, `-3`, `42.5`, `99999` (ok),
      `100000` (error) — only `99999` accepts.
  14. Note validation: whitespace-only note + Save → row has
      no note line (normalised to undefined).
  15. 200 quotes → `+ Add quote` button is `disabled` (still
      visible).
  16. Regression: Add / Edit (without quotes) / Delete / Rating
      / Review from the detail page all still work.
  17. Regression: shelf list, add-book flow, edit-book flow
      all still work.
- Verification: `npm run lint && npm run test` pass; `tsc
  --noEmit` clean; `npm run build` succeeds; no new `any`; no
  new npm dependencies.
- Expected test count: ~245–250 total (~220 from spec 007
  baseline + ~25–30 new from spec 009: validators 8,
  QuoteDialog 5, QuotesSection 7, BookDetail 3).
