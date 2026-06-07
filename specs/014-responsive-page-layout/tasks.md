# Tasks: Responsive Page Layout

> **Status:** Done
> **Spec:** `./spec.md` (Implemented)
> **Plan:** `./plan.md` (Implemented)

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Add home layout regression tests

- **Files:** `tests/app/ShelfClient.test.tsx`
- **Acceptance:** Tests verify the ready non-empty home page still renders Reading Calendar only when expected, keeps calendar before shelf in DOM order, and exposes a stable responsive layout container. — Done
- **Notes:** Keep assertions behavioral; do not hard-code exact Tailwind class strings except for a stable test id if needed.

## T2. Add detail page spacing tests

- **Files:** `tests/features/detail-view/BookDetail.test.tsx` or route-level detail tests
- **Acceptance:** Tests verify found, loading, and not-found detail states render inside the shared page spacing container without changing their existing user-visible content. — Done
- **Notes:** Prefer extending existing detail tests if route-level tests add unnecessary setup.

## T3. Implement shared page rhythm

- **Files:** `src/app/ShelfClient.tsx`, `src/app/book/[id]/page.tsx`, `src/features/detail-view/BookDetail.tsx`, optional `src/components/PageContainer.tsx`
- **Acceptance:** Home and book detail pages share the same outer horizontal padding, vertical padding, and constrained max-width rhythm. — Done
- **Notes:** Add a small shared wrapper only if it keeps code clearer than duplicating classes.

## T4. Implement responsive home shelf layout

- **Files:** `src/app/ShelfClient.tsx`
- **Acceptance:** Ready non-empty home state is mobile vertical with calendar before shelf and desktop shelf-left/calendar-right with a sticky calendar rail. — Done
- **Notes:** Keep `ShelfList` controls inside the shelf area. Do not add dashboard widgets or change calendar content.

## T5. Verify unchanged behavior

- **Files:** `src/features/shelf-list/*`, `src/features/reading-calendar/*`, `src/features/detail-view/*`
- **Acceptance:** Existing add/edit/delete/filter/sort/rating/review/quote/reading-day behavior remains unchanged by the layout work. — Done
- **Notes:** This task is mostly review plus focused manual interaction where the layout touched clickable controls.

## T6. Polish and gates

- **Files:** affected implementation and test files
- **Acceptance:** Mobile and desktop manual checks pass, `npm run lint` passes, and `npm run test` passes. — Done
- **Notes:** Re-read `spec.md` acceptance criteria before marking this done.
