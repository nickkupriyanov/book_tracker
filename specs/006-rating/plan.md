# Plan: Book Rating

> **Status:** Approved
> **Spec:** `../spec.md` (`Approved`)
> **Author:** nickkupriyanov
> **Created:** 2026-06-04

---

## 1. Architecture summary

Book Rating is a "per-book content" feature that follows the
section-based layout introduced in spec 005 D7. The biggest
design call is **D6** (RatingSection is a smart component,
mirrors `EditBookDialog` / `DeleteBookDialog` from specs 003
and 004) — it imports `useBookLibrary` directly and owns the
`updateBook` call. The user reports a rating in three places:
the Add dialog, the Edit dialog (both via the shared
`BookForm`), and the detail page (via the new `RatingSection`).

The domain type gets one new optional field; the validator
gets one new helper; the storage layer is untouched. The
section-based architecture from spec 005 pays off here: adding
`RatingSection` is one line in `BookDetail`, no other
orchestrator changes.

## 2. Module / file layout

```
src/types/book.ts                          # MODIFIED: add rating?: 1|2|3|4|5
src/lib/validation/book.ts                 # MODIFIED: add validateRating
src/components/BookForm.tsx                # MODIFIED: rating Select after Status
src/features/rating/                       # NEW feature folder
├── RatingStars.tsx                        # NEW: dumb star row
├── RatingSection.tsx                      # NEW: smart, wraps DetailSection
└── index.ts                               # NEW: barrel
src/features/detail-view/BookDetail.tsx    # MODIFIED: render <RatingSection>
tests/
├── features/rating/                       # NEW folder
│   ├── RatingStars.test.tsx                # NEW
│   └── RatingSection.test.tsx              # NEW
├── components/BookForm.test.tsx           # MODIFIED: rating field
└── lib/validation/book.test.ts            # MODIFIED: rating validation
```

No deletions. No new domain types beyond the `Book` change.
No new storage or state changes. No new npm dependencies
(`Star` icon is in the existing `lucide-react@^1.17.0`;
`sonner` is already used for toasts in specs 003 / 004).

## 3. Data flow

```
[Detail page] (/book/<id>)
  user clicks star N
  -> <RatingStars> calls props.onChange(N)
  -> <RatingSection> handleRate(N)
       setIsUpdating(true)
       try {
         await useBookLibrary.updateBook(book.id, { ...book, rating: N })
         // store updates -> BookDetail re-renders with new book.rating
         // -> RatingSection receives new book prop -> stars re-render
       } catch {
         toast.error("Couldn't save rating. Try again.")
       } finally {
         setIsUpdating(false)
       }

[Add / Edit dialog] (via shared <BookForm>)
  user picks "4 stars" from Select
  -> form state rating = "4"
  -> on submit:
       input: BookInput = {
         title, author, status, ...,
         ...(rating ? { rating: Number(rating) as 1|2|3|4|5 } : {}),
         tags,
       }
       -> validateBookInput -> validateRating
       -> if valid: adapter.addBook(input) or adapter.updateBook(id, input)
       -> store updates -> dialog closes (BookForm.onSuccess)
       -> shelf / detail re-renders with new book.rating
```

When the user picks "Not rated" in the form, `rating === ""`,
the spread evaluates to `{}` (no `rating` key), the
validator sees `undefined` and is happy.

## 4. Component breakdown

### `RatingStars` (NEW, in `src/features/rating/`)

- **Props:**
  `{ value?: 1|2|3|4|5; onChange: (rating: 1|2|3|4|5) => void; disabled?: boolean }`.
- **State:** none (purely presentational).
- **Renders:** a flex row of 5 icon buttons (`lucide-react`
  `Star`). Stars 1..`value` use the `fill` modifier (e.g.
  `fill-current`); stars `value+1`..5 are unfilled.
  `aria-label` per button: e.g. "Rate 4 stars".
  `data-testid="rating-star-<N>"` for tests.
- **Disabled:** when `disabled` is true, all buttons get
  `disabled` and `aria-disabled`. CSS handles the
  greyed-out appearance (the existing `Button` styles
  already cover this).
- **Tests:** ≥ 3 (filled/empty pattern, click invokes
  `onChange` with the right value, disabled state).

### `RatingSection` (NEW, in `src/features/rating/`)

- **Props:** `{ book: Book }`.
- **State:** `isUpdating: boolean`.
- **Reads:** `useBookLibrary((s) => s.updateBook)`.
- **Renders:**
  `<DetailSection title="Rating">` containing
  `<RatingStars value={book.rating} onChange={handleRate} disabled={isUpdating} />`.
- **`handleRate(rating)`:**
  `setIsUpdating(true); try { await updateBook(book.id, { ...book, rating }); } catch { toast.error("Couldn't save rating. Try again."); } finally { setIsUpdating(false); }`.
- **Re-renders:** the parent (`BookDetail`) is subscribed
  to the store; on `updateBook` success, the page
  re-renders with the new `book`, the section's `book`
  prop updates, the stars re-render with the new value.
- **Tests:** ≥ 3 (renders DetailSection + stars, click
  calls `updateBook`, toast on storage failure, disabled
  in flight).

### `BookForm` (MODIFIED)

- **New state:** `const [rating, setRating] = useState<string>(initialValues.rating?.toString() ?? "")`.
- **New UI:** a shadcn `Select` field labelled "Rating"
  placed after the Status Select and before the Cover URL
  Input. Options: "Not rated" (value `""`), "1 star",
  "2 stars", "3 stars", "4 stars", "5 stars" (values
  `"1"` .. `"5"`). `data-testid="book-form-rating-trigger"`
  on the trigger for tests.
- **Submit:** in `handleSubmit`, the input builder
  becomes:
  ```ts
  const input: BookInput = {
    title,
    author,
    status,
    ...(coverUrl ? { coverUrl } : {}),
    ...(rating ? { rating: Number(rating) as 1|2|3|4|5 } : {}),
    tags: [tags],
  };
  ```
  The conditional spread mirrors the existing `coverUrl`
  pattern.
- **Tests:** ≥ 2 (renders the field with the right
  initial value, submit includes / omits rating based
  on the selection).

### `BookDetail` (MODIFIED)

- **One change:** in the page main, after
  `<DetailMeta book={book} />`, render
  `<RatingSection book={book} />`. The `space-y-6` parent
  handles vertical spacing.
- **No new state, no new dialogs, no new router logic.**
- **Tests:** ≥ 1 (the section is visible on the page for
  a rated book and for an unrated book).

### `src/types/book.ts` (MODIFIED)

- **One new field:**
  ```ts
  export interface Book {
    // ... existing fields ...
    /** Optional 1-5 rating. Absent means "not rated". */
    rating?: 1 | 2 | 3 | 4 | 5;
  }
  ```
- `BookInput = Omit<Book, "id" | "createdAt">` inherits
  the new optional field automatically.

### `src/lib/validation/book.ts` (MODIFIED)

- **New helper:** `validateRating(raw, errors)` per spec
  §7. Returns `1|2|3|4|5 | undefined`.
- **`validateBookInput` integration:** call
  `validateRating(input["rating"], errors)`. In the
  `BookInput` value builder, spread `rating: validatedRating`
  when defined, else omit (mirroring the `coverUrl` pattern
  in the same function).
- **Tests:** ≥ 3 (valid 1, valid 5, missing OK,
  out-of-range rejected, non-integer rejected, non-number
  rejected).

## 5. Storage adapter changes

None. `LocalStorageAdapter` persists arbitrary `Book` shapes
via `JSON.stringify` / `JSON.parse`. The new optional field
is transparent. Existing books in localStorage (without
`rating`) parse back as `undefined` for the field; the type
allows that.

## 6. Decisions & trade-offs

- **D-P1. `RatingSection` is smart, mirrors
  `EditBookDialog` / `DeleteBookDialog`.** Imports
  `useBookLibrary` directly, owns the `updateBook` call.
  No callback wiring from `BookDetail` — drop-in section
  per spec 005 D7.
- **D-P2. Reuse `DetailSection` from spec 005 T1.** No
  new section wrapper. `<RatingSection>` is the smart
  component; `<DetailSection>` is the presentational
  wrapper. Layered.
- **D-P3. `BookForm` state is a string (`""` or
  `"1"`.."5"`).** shadcn `Select` values are strings; the
  string state matches the control's API. Conversion to
  `number | undefined` happens at submit time, mirroring
  the `coverUrl` pattern.
- **D-P4. Star fill = `fill-current` + `text-foreground`;
  unfilled = `text-muted-foreground`.** Two-tone via
  Tailwind utilities, no SVG swap. Same icon (`Star` from
  lucide), different classes. Keeps the bundle small and
  the visual language consistent with the rest of the
  app's calm palette.
- **D-P5. Storage failure UX: `toast.error` via
  sonner.** "Couldn't save rating. Try again." The
  detail page is meant to be glanceable; an inline
  error message would compete with the section's
  content. The toast is non-intrusive and self-dismisses
  (per sonner's defaults).
- **D-P6. No new npm dependencies.** `lucide-react`'s
  `Star` icon is the only new asset; it's already a
  dependency. `sonner` is already a dependency from
  specs 003 / 004.
- **D-P7. No migration.** Optional field, transparent
  to `JSON.parse`. Existing books in localStorage work
  without changes.
- **D-P8. `key={book.id}` on `<RatingSection>` in
  `BookDetail` is unnecessary.** The section takes the
  full `book` object as a prop; when the store updates,
  the prop updates, the section re-renders. The
  `BookDetail` orchestrator already remounts on URL
  change (Next.js routing).

## 7. Risks

- **`Star` icon visual in two states.** Filled vs
  unfilled. Mitigation: use the same `<Star />` SVG
  with `fill-current` for filled and `fill-none` for
  unfilled, paired with a text colour. Tested in
  `RatingStars` tests (assert `fill="..."` or class).
- **Lucide-react v1.17 has the `Star` icon
  (verified).** No API surprises; the icon is a
  pass-through of an SVG.
- **`selectItem` value type.** shadcn's `Select` values
  are strings. The form coerces to number at submit.
  If the runtime type guard (`Number(v) as 1|2|3|4|5`)
  is wrong, the validator catches it — defense in depth.
- **Stale `book.id` on rating click.** Same as a stale
  Edit save: `updateBook` throws "not found", the toast
  fires, the page stays in the "found" state until the
  next store update. Acceptable.
- **JSON.stringify includes the new field.** Existing
  books in localStorage without `rating` parse back as
  objects without the key. No corruption, no data loss.
  (This is the same property that made the original
  addBook / updateBook safe.)
- **Section ordering on the page.** `RatingSection`
  after `DetailMeta` is the natural visual order:
  cover + meta, then per-book content. Future
  sections (review, quotes, reading time) will drop
  in below in the same `space-y-6` stack.

## 8. Rollout

- No feature flag, no migration.
- Manual QA (per spec §10):
  1. Detail page, unrated book — see 5 empty stars under
     "Rating".
  2. Click star 4 — page re-renders with 4 filled stars
     (no toast on success).
  3. Reload — rating is persisted.
  4. Edit dialog, Rating Select defaults to "Not rated"
     or the current value.
  5. Edit dialog, change rating, save — toast "Updated",
     detail page reflects the new rating.
  6. Edit dialog, pick "Not rated", save — detail page
     shows 5 empty stars.
  7. Add a new book with rating "3 stars" from the Add
     dialog — appears on the shelf (no card change),
     detail page shows 3 filled stars.
  8. Storage failure path (DevTools:
     `localStorage.setItem = () => { throw new DOMException('QuotaExceededError'); }`)
     → click a star → toast "Couldn't save rating. Try
     again." appears, stars re-enable, store unchanged.
  9. Regression: Add / Edit (without rating) / Delete
     still work; `BookCard` is unchanged; `ShelfList` is
     unchanged; `EditBookDialog` rating field works for
     the Edit flow.
- Verification: `npm run lint && npm run test` pass;
  `tsc --noEmit` clean; `npm run build` succeeds; no new
  `any`; no new npm dependencies.
- Expected test count: ~199–201 total (184 from spec 005
  + ~15–17 new from spec 006).
