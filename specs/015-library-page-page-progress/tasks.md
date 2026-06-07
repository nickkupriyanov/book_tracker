# Tasks: Library Page And Page Progress

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Add page-progress validation tests

- **Files:** `tests/lib/validation/book.test.ts`
- **Acceptance:** Tests cover optional `currentPage` / `totalPages`, valid positive whole numbers, invalid non-positive/decimal/non-number values, and rejection of `currentPage > totalPages`.
- **Notes:** Keep tests pure and focused on `validateBookInput`.

## T2. Add library route behavior tests

- **Files:** `tests/app/LibraryClient.test.tsx`
- **Acceptance:** Tests verify `/library` ready state renders the full shelf controls and can display books from all statuses.
- **Notes:** Prefer a client component test if Next route testing adds unnecessary setup.

## T3. Add focused home behavior tests

- **Files:** `tests/app/ShelfClient.test.tsx`
- **Acceptance:** Tests verify home renders only reading books, hides shelf search/filter/tag/sort controls, shows **Open library**, and renders the no-reading empty state when the library has books but none are reading.
- **Notes:** Update existing ShelfClient expectations from "full shelf home" to "focused reading home".

## T4. Extend book domain and validation

- **Files:** `src/types/book.ts`, `src/lib/validation/book.ts`
- **Acceptance:** `Book` / `BookInput` support optional page fields; validation normalizes absent fields, accepts valid values, rejects invalid values, and preserves all existing validation behavior.
- **Notes:** Do not use `any`. Do not add a storage migration.

## T5. Implement the `/library` full shelf route

- **Files:** `src/app/library/page.tsx`, `src/app/library/LibraryClient.tsx`, `src/app/ShelfClient.tsx`
- **Acceptance:** `/library` renders loading/error/empty/ready states with the existing full `ShelfList` experience and add-book entry point.
- **Notes:** Keep existing `ShelfList` controls on `/library`, not on the home page.

## T6. Implement focused home and quick update

- **Files:** `src/app/ShelfClient.tsx`, `src/features/page-progress/PageProgressQuickUpdate.tsx`, `src/features/page-progress/ReadingBooksList.tsx`
- **Acceptance:** `/` renders a reading-only home page with **Open library**, a shadcn `Select` quick update block, current-page save behavior, no-reading empty state, and no full shelf controls.
- **Notes:** Persist through `useBookLibrary.updateBook` and `validateBookInput`. If `currentPage === totalPages`, show **Mark as read** without changing status automatically.

## T7. Add total pages input and progress display

- **Files:** `src/components/BookForm.tsx`, `src/features/shelf-list/BookCard.tsx`, detail/home display components as needed
- **Acceptance:** Add/edit book flows can save optional `totalPages`; cards or focused reading surfaces show lightweight page progress when available.
- **Notes:** Keep the UI compact so it stays warm and book-centered rather than metric-heavy.

## T8. Polish, QA, and gates

- **Files:** affected implementation and test files
- **Acceptance:** Manual QA covers empty library, no reading books, reading books with/without `totalPages`, invalid progress, final-page prompt, `/library` controls, and both `npm run lint` and `npm run test` pass.
- **Notes:** Re-read `spec.md` acceptance criteria before marking this done.
