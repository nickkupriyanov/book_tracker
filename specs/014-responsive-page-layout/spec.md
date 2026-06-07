# Spec: Responsive Page Layout

> **Status:** Implemented
> **Author:** Codex
> **Created:** 2026-06-07
> **Spec ID:** 014-responsive-page-layout
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

The home page currently uses a narrow single-column layout even when the user has a wide desktop screen. The book detail page has the opposite problem: its content starts too close to the viewport edge and does not share the same comfortable outer spacing as the home page. Moving between the shelf and a book detail should feel like staying in the same calm reading app, not switching between two unrelated layouts.

## 2. Goal

Give the home page and book detail page a shared responsive page rhythm: mobile remains vertical and comfortable, while desktop uses width for a shelf-first layout with the Reading Calendar as a companion rail.

## 3. Non-goals

- Do not add dashboard metrics, overview widgets, analytics, charts, or activity summaries.
- Do not change book data, validation, persistence, sorting, filtering, rating, review, quote, or reading-day behavior.
- Do not introduce backend, auth, sync, server-side storage, or new dependencies.
- Do not redesign internal book cards, forms, dialogs, review editor, quote UI, or calendar day logic.

## 4. Users & scenarios

This is for a single local user managing their personal reading shelf on both mobile and desktop.

- Mobile shelf: the user opens the home page on a phone and sees a calm vertical flow: title/action header, Reading Calendar, shelf controls, and book cards.
- Desktop shelf: the user opens the home page on a laptop or desktop and sees the shelf as the primary area, with the Reading Calendar beside it instead of consuming the full page width above it.
- Book detail: the user opens a book from the shelf and the detail page has the same comfortable outer padding as the home page across found, loading, and not-found states.

## 5. UX

The layout should feel like a warm personal library, not an admin dashboard. The shelf remains the main task area. The Reading Calendar acts as a quiet companion panel on desktop and keeps its current first-class placement on mobile.

- Default ready home state: header is aligned with the content container, calendar appears before shelf in mobile reading order, and desktop visually places shelf left / calendar right.
- Empty home state: existing empty shelf behavior remains centered and comfortable inside the shared page spacing.
- Loading and error home states: existing copy and state behavior remain, now inside the shared page spacing.
- Book detail found state: detail content receives the same outer padding and max-width rhythm as the home page.
- Book detail loading/not-found states: centered state content remains centered, with the same page-level outer spacing.

## 6. Functional requirements

- FR-1. The home page content is no longer constrained to the current narrow shelf-only width on desktop; it uses a wider page container while remaining constrained enough to stay readable.
- FR-2. When the home page is ready and has books, the Reading Calendar appears before the shelf in DOM order so mobile and assistive technology encounter it before shelf controls.
- FR-3. On desktop-width screens, the ready non-empty home page visually presents the shelf as the main left area and the Reading Calendar as a right companion rail.
- FR-4. The desktop Reading Calendar rail remains visible during ordinary shelf scrolling without overlapping the header or shelf content.
- FR-5. Search, status filters, sort, tag filters, and clear-filters controls remain part of the shelf area and continue to appear above the book grid.
- FR-6. On mobile-width screens, the home page remains a single vertical flow: header, Reading Calendar, shelf controls, then book cards.
- FR-7. The `/book/[id]` page uses the same outer horizontal and vertical page spacing as the home page for found, loading, and not-found states.
- FR-8. The change does not alter any existing user-facing behavior for adding, editing, deleting, filtering, sorting, rating, reviewing, quoting, or logging reading days.

## 7. Data

No data entities are changed. The feature only reads existing `Book` values from `src/types/book.ts` through existing components.

No migrations are needed.

## 8. Storage interface

No changes to `StorageAdapter`.

The feature does not add, remove, or alter storage methods. Existing initialization and localStorage-backed book reads remain unchanged.

## 9. Edge cases & errors

- Empty library: keep the existing empty shelf state and avoid showing the Reading Calendar when there are no books.
- Loading library: keep the existing loading message and avoid showing the Reading Calendar while the store is loading.
- Store error: keep the existing error message inside the shared page spacing.
- Missing book id: keep the existing not-found detail state, now with consistent page spacing.
- Long shelf: desktop calendar rail must not cover book cards or controls while the page scrolls.
- Small screens: layout must not create horizontal scrolling or cramped side-by-side columns.

## 10. Acceptance criteria

- [x] On a phone-width viewport, the home page shows header, Reading Calendar, shelf controls, and book grid in a single vertical flow.
- [x] On a desktop-width viewport with books, the home page shows shelf content as the main left area and Reading Calendar as a right companion rail.
- [x] On desktop, the calendar rail remains visible while scrolling a long shelf and does not overlap other content.
- [x] Shelf search, status filters, sort, tag filters, and clear-filters behavior are unchanged.
- [x] Empty, loading, and error home states still render with comfortable page spacing.
- [x] `/book/[id]` found state has the same outer page padding rhythm as the home page.
- [x] `/book/[id]` loading and not-found states still render correctly with the same outer page padding rhythm.
- [x] `npm run lint` passes.
- [x] `npm run test` passes.

## 11. Out of scope (for this spec)

- New stats, dashboards, summaries, or currently-reading widgets.
- Persisting layout preferences.
- Changing calendar content, month navigation behavior, or reading-day editing.
- Changing detail page section order or adding a desktop detail sidebar.
- Visual redesign of cards, forms, dialogs, or rich-text content.

## 12. Open questions

None. The approved design direction is: shelf with companion rail, Reading Calendar only in the rail, calendar first on mobile, sticky rail on desktop, and shared page spacing for home and book detail.
