# Spec: Reading Progress Widget

> **Status:** Draft
> **Author:** Codex
> **Created:** 2026-06-08
> **Spec ID:** 019-reading-progress-widget
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 015 (library page and page progress), spec 016 (reading log and navigation polish)

---

## 1. Problem

The home page `Where are you?` panel already lets the user save a current
page, but the interaction still feels like a plain form. A reader can enter
page `123`, yet the panel does not make the book's movement feel immediate:
how far the reader has come, how much remains, and what quick action to take
next are not the visual center.

For a daily-use reading tracker, the panel should feel like a small reading
progress widget rather than a data-entry form. It should keep the existing
safe validation and local-first persistence while making progress visible,
bookish, and fast to update.

## 2. Goal

Turn `Where are you?` into a cozy progress-first reading widget with visible
book progress, instant quick actions, and a secondary path to open the book
detail page.

## 3. Non-goals

- No backend, sync, auth, accounts, or server persistence.
- No new domain type, storage method, migration, or npm dependency.
- No reading speed model and no time-remaining estimate.
- No full statistics, streaks, charts, analytics dashboard, or session UI.
- No change to the user-facing language strategy; this spec keeps the
  existing English interface.
- No redesign of the reading lane cards, calendar, library page, or book
  detail page.

## 4. Users & scenarios

**Story.** Andy opens the home page while reading *Piranesi*. The active
panel shows the cover, title, author, `Currently reading · 23%`, `123 / 540
pages`, a warm bookmark-like progress line, and `417 pages left`. The progress
is understandable before Andy touches the input.

**Story.** Andy reads a short chapter and wants to update quickly. He clicks
`+10 pages`; the app immediately saves the new current page through the
existing update flow, adds the positive delta to today's reading log, and the
panel re-renders with the new percentage.

**Story.** Andy knows the exact page number. He edits the current-page input
and clicks `Update progress`. Validation and storage errors behave exactly as
they do today.

**Story.** Andy wants to review notes for the active book. He uses the
secondary `Open book` button in the right side of the book summary area to
navigate to `/book/:id`.

## 5. UX

The approved direction is **Tracker First + Bookmark Line**:

- the progress summary is the hero of the panel;
- the page input is still present but visually secondary;
- the progress bar becomes a thin bookmark-like line, using the existing warm
  primary color for the completed portion and a muted book-paper tone for the
  remaining portion;
- quick actions are real one-click actions, not draft fillers;
- the panel stays calm and book-inspired, not dashboard-like.

### 5.1 Book summary

The top area shows the active book cover or placeholder, title, author, and
progress status. When `totalPages` is known, the status is
`Currently reading · N%`. When `totalPages` is unknown, it remains
`Currently reading` without a fake percentage.

The `Open book` control is a secondary button/link in the right side of this
summary area on comfortable viewports. On narrow viewports it may wrap below
the title/author so text remains readable.

### 5.2 Progress summary

When both `currentPage` and `totalPages` are known, the panel shows:

- `Reading progress`;
- `currentPage / totalPages pages`;
- `N% completed`;
- bookmark-like progress line;
- `M pages left`.

When only `currentPage` is known, the panel shows `Page N` and keeps the
existing prompt to add total page count through the book edit flow.

When `currentPage` is empty, the panel still renders the book summary and
current-page controls without inventing progress.

### 5.3 Controls

The typed-save control uses the label `Current page` and the submit button
label `Update progress`.

Quick actions render near the typed-save control:

- `+10 pages`;
- `+25 pages`;
- `Finished`.

`+10 pages` and `+25 pages` immediately save the updated current page. If
`totalPages` is known, the result is capped at `totalPages`. If the current
page is empty, the action treats the starting page as `0`.

`Finished` immediately marks the book as read. If `totalPages` is known, it
also saves `currentPage = totalPages`. If `totalPages` is unknown, it preserves
the existing page fields and only changes `status` to `"read"`.

### 5.4 Motivation line

The widget may show one compact motivation line derived from existing data:

- `You read N pages today` when today's reading log exists for the active book;
- no time estimate;
- no invented pace, days remaining, or reading-speed calculation.

## 6. Functional requirements

- **FR-1.** `Where are you?` renders the active book cover or placeholder,
  title, author, and reading status.
- **FR-2.** The active book detail link remains available as a secondary
  `Open book` button/link to `/book/:id`.
- **FR-3.** When `currentPage` and `totalPages` are known, the panel shows
  `currentPage / totalPages pages`.
- **FR-4.** When `currentPage` and `totalPages` are known, the panel shows a
  rounded percentage from `0` to `100`.
- **FR-5.** When `currentPage` and `totalPages` are known, the panel shows
  pages remaining as `totalPages - currentPage`, never below `0`.
- **FR-6.** When `currentPage` and `totalPages` are known, the panel renders an
  accessible progress indicator with `aria-valuemin="0"`,
  `aria-valuemax="100"`, and `aria-valuenow` equal to the rounded percentage.
- **FR-7.** When `totalPages` is missing, the panel does not render a fake
  percentage or pages-left value and keeps the existing add-total-pages prompt.
- **FR-8.** The typed submit button label is `Update progress`.
- **FR-9.** Submitting the typed current page preserves existing validation,
  storage, reading-log delta, error, and draft-retention behavior.
- **FR-10.** Clicking `+10 pages` immediately persists `currentPage + 10`,
  treating an empty current page as `0`.
- **FR-11.** Clicking `+25 pages` immediately persists `currentPage + 25`,
  treating an empty current page as `0`.
- **FR-12.** Quick page actions cap the next current page at `totalPages` when
  `totalPages` is known.
- **FR-13.** Successful quick page actions use the same positive-delta reading
  log rules as typed saves.
- **FR-14.** Quick page actions surface validation or storage failures inline
  and keep the panel usable.
- **FR-15.** Clicking `Finished` immediately marks the book as read.
- **FR-16.** Clicking `Finished` sets `currentPage = totalPages` when
  `totalPages` is known.
- **FR-17.** Clicking `Finished` preserves current page fields when
  `totalPages` is unknown.
- **FR-18.** When today's reading log exists for the active book, the panel
  shows `You read N pages today`.
- **FR-19.** No time-remaining estimate appears in this spec.
- **FR-20.** The refreshed panel remains responsive without overlapping text or
  controls on mobile and desktop widths.

## 7. Data

This spec uses the existing `Book` and `ReadingLog` domain types in
`src/types/book.ts`.

Touched fields:

- `Book.currentPage`;
- `Book.totalPages`;
- `Book.status`;
- `Book.readingLogs`.

No type changes and no data migration are required.

## 8. Storage interface

No changes to `StorageAdapter`.

The widget continues to persist through `useBookLibrary.updateBook`, which
updates the whole book record through the existing adapter implementation.

## 9. Edge cases & errors

- If the typed current page is not a whole number, show the existing inline
  validation error and do not save.
- If the typed or quick current page exceeds `totalPages`, typed saves keep the
  existing validation behavior; quick actions cap at `totalPages`.
- If localStorage is full or disabled, show the existing inline storage error.
- If `currentPage` is empty and the user clicks `+10 pages` or `+25 pages`,
  treat the starting page as `0`.
- If `totalPages` is unknown, do not calculate percentage, pages left, or time
  estimates.
- If a quick action reaches the final page, saving the page and marking the
  book as read remain separate behaviors unless the user clicks `Finished`.

## 10. Acceptance criteria

- [ ] The top of `Where are you?` reads as a progress-first book widget, not a
  plain form.
- [ ] `Open book` is visible as a secondary button/link in the right side of
  the book summary area on desktop.
- [ ] The typed CTA reads `Update progress`.
- [ ] Known total-page progress shows page fraction, percentage, bookmark-like
  progress line, and pages left.
- [ ] Missing total pages do not produce fake percentage or pages-left values.
- [ ] `+10 pages` and `+25 pages` save instantly and update reading logs with
  positive deltas.
- [ ] Quick page actions cap at `totalPages` when present.
- [ ] `Finished` marks the active book as read and sets `currentPage` to
  `totalPages` when possible.
- [ ] Today's reading-log line appears only when the active book has pages read
  today.
- [ ] Existing typed-save validation and storage-error behavior still works.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 11. Out of scope (for this spec)

- Estimating hours or days remaining.
- Capturing reading speed or reading sessions.
- Changing app language to Russian.
- Adding new stats pages, charts, or yearly-goal behavior.
- Changing storage shape or adding backend support.

## 12. Open questions

None. The design direction, quick-action behavior, and estimate scope are
resolved for this spec.
