# Plan: Responsive Page Layout

> **Status:** In Review
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-07

---

## 1. Architecture summary

This is a layout-only change across the two existing route surfaces: `src/app/ShelfClient.tsx` for the home shelf and `src/app/book/[id]/page.tsx` / `src/features/detail-view/BookDetail.tsx` for book detail. The implementation should establish one shared page-container rhythm and reuse it on both pages. The home ready/non-empty state becomes a responsive two-area layout: Reading Calendar remains first in DOM order, while desktop CSS places it in a sticky right rail beside the shelf. Detail page behavior and section structure remain unchanged except for consistent outer spacing.

## 2. Module / file layout

- `src/app/ShelfClient.tsx` — widen the page container and arrange ready/non-empty content into mobile vertical flow and desktop shelf/calendar grid.
- `src/app/book/[id]/page.tsx` or `src/features/detail-view/BookDetail.tsx` — apply the same outer page spacing to found, loading, and not-found detail states.
- Optional `src/components/PageContainer.tsx` — shared wrapper only if it reduces duplication without making the layout harder to read.
- `tests/app/ShelfClient.test.tsx` — preserve calendar rendering rules and cover the responsive layout container.
- `tests/features/detail-view/BookDetail.test.tsx` or route-level detail tests — cover detail states inside shared page spacing.

## 3. Data flow

No data flow changes.

Home page flow remains: `RootClient` initializes the store, `ShelfClient` reads `status` and `books`, then renders loading/error/empty/ready states. In the ready non-empty state, the same `books` array is passed to `ReadingCalendar` and `ShelfList`; only their layout relationship changes.

Book detail flow remains: the route reads `id`, `BookDetail` reads store status/books, then renders loading/not-found/found states. The layout wrapper changes spacing only and does not change any book lookup, dialog, update, delete, rating, review, quote, or reading-day behavior.

## 4. Component breakdown

- **Page container pattern**
  - **Props:** children; optional className only if implemented as a component.
  - **State:** none.
  - **Behavior:** provides shared page-level max width, horizontal padding, and vertical padding for home and detail pages.
  - **Tests:** assert a stable test id or accessible container appears in home and detail states.

- **Home responsive layout**
  - **Props:** no new public props.
  - **State:** existing add-book dialog state only.
  - **Behavior:** renders calendar before shelf in DOM; desktop layout places shelf left and calendar in sticky right rail.
  - **Tests:** existing calendar presence rules still pass; DOM order remains calendar before shelf.

- **Book detail page spacing**
  - **Props:** no new public props.
  - **State:** existing detail/dialog state only.
  - **Behavior:** wraps found, loading, and not-found content in the same outer page spacing.
  - **Tests:** detail states still render and include the shared page container.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

## 6. Decisions & trade-offs

- Chose a shelf with companion rail over a wider single column because it uses desktop width while keeping the shelf as the primary workspace.
- Chose Reading Calendar only in the rail because extra controls or widgets would push the page toward a dashboard feel.
- Chose mobile calendar first because it preserves the current home-page reading order and keeps the calendar first-class.
- Chose sticky desktop rail because it keeps month context visible while browsing a long shelf.
- Chose shared page rhythm for detail instead of a detail-specific redesign because the current issue is missing outer spacing, not detail content structure.

## 7. Risks

- Sticky positioning can overlap content if the top offset or rail width is too aggressive; manual desktop QA must include scrolling a long shelf.
- A too-wide container can make book cards feel sparse; use a constrained max width rather than full viewport width.
- Moving layout wrappers can accidentally alter loading/error/empty state spacing; tests and manual checks must include all states.
- Visual regression tests are not present, so responsive layout quality depends on manual viewport checks.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA steps:
  - Start the app with books in the library.
  - Check mobile-width home: header, calendar, shelf controls, grid.
  - Check desktop-width home: shelf left, sticky calendar right, no overlap while scrolling.
  - Check empty home, loading/error if practical.
  - Check book detail found, loading, and not-found states for matching outer spacing.
  - Run `npm run lint`.
  - Run `npm run test`.
