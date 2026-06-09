# Spec: Page-Based Reading Tracking

> **Status:** Draft
> **Author:** Codex
> **Created:** 2026-06-09
> **Spec ID:** 022-page-based-reading-tracking
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 013 (reading calendar), spec 015 (library page and page progress), spec 016 (reading log and navigation polish), spec 019 (reading progress widget), spec 021 (reader statistics)

---

## 1. Problem

Book Tracker currently has two ways to express reading activity:

- `readingDays`, where the user marks dates manually;
- page progress / `readingLogs`, where the app records page movement.

This creates a confusing split. The product now tracks reading by pages, so
manual Reading days should no longer be a separate concept. The page tracking
flow also needs more care around corrections: if a reader logs page 30, corrects
back to page 10, then returns to page 30, the app must not count 50 pages.

## 2. Goal

Make page logs the only source of reading activity, while keeping the daily
progress update fast and giving the reader a compact way to correct history.

## 3. Non-goals

- No backend, sync, accounts, auth, or server persistence.
- No multi-session journal within the same day.
- No notes on reading sessions.
- No analytics dashboard or heavy reporting UI.
- No migration guarantee for legacy `readingDays` or old independent
  `currentPage` values. MVP can drop obsolete compatibility behavior.
- No new `StorageAdapter` method.
- No new npm dependency.

## 4. Users & scenarios

**Story.** A reader opens Home, selects the book they are reading, types the
current page, and saves. The app updates today's page log and immediately shows
progress, pages left, and pages read today.

**Story.** A reader accidentally types page 30, then corrects to page 10, then
later reaches page 30 again. The app shows 30 logged pages total for the book,
not 50.

**Story.** A reader finishes a book by reaching its total page count. The app
acknowledges the milestone and offers the next steps: rate the book, write a
review, and mark it as read.

**Story.** A reader notices yesterday's page count was wrong. On the book detail
page, they open Page history, edit the dated page log, and the book progress,
calendar, and statistics all recalculate from the corrected logs.

## 5. UX

### 5.1 Home progress

Home remains the fastest place to update reading progress. The focused progress
panel asks for the user's **current page**, not "pages read." Quick actions such
as `+10 pages` and `+25 pages` may remain, but they should resolve to a target
current page before saving.

The panel shows:

- active book cover, title, and author;
- derived progress: current page / total pages when total pages are known;
- pages left when total pages are known;
- pages read today when today's log exists;
- validation and storage errors inline;
- a completion prompt when current page reaches total pages.

The completion prompt should stay warm and action-oriented. It offers to rate,
write a review, and mark the book as read. It should not feel like a dashboard
or a modal interruption.

### 5.2 Page history

The book detail page replaces Reading days with **Page history**.

Page history shows compact dated page logs and lets the user:

- add one dated aggregate entry;
- edit `pagesRead` for an existing date;
- delete an entry.

The history exists for correction, not for deep analysis. It should stay small,
readable, and calm.

### 5.3 Calendar and statistics

The Reading Calendar and Statistics page use only page logs. Legacy Reading days
do not create activity, streaks, colored calendar days, or rhythm facts.

## 6. Functional requirements

- **FR-1.** The app no longer renders a Reading days section or manual
  Reading days controls.
- **FR-2.** `readingDays` is not used by calendar, statistics, progress, or
  reading rhythm calculations.
- **FR-3.** Page logs are the only source of reading activity.
- **FR-4.** The Home progress panel accepts a target current page.
- **FR-5.** Each book has at most one aggregate page log per local date.
- **FR-6.** Saving target current page `N` for date `D` sets the page log for
  `D` so the derived current page becomes `N`.
- **FR-7.** If the calculated page count for `D` is `0`, the app removes that
  day's log instead of storing a zero-page log.
- **FR-8.** If the calculated page count for `D` would be negative, the app
  blocks the save with a friendly correction error.
- **FR-9.** The sequence page 30 -> page 10 -> page 30 on the same day results
  in 30 total logged pages, not 50.
- **FR-10.** Saving a page greater than `totalPages` fails validation when
  `totalPages` is known.
- **FR-11.** When derived current page equals `totalPages`, the Home progress
  panel offers rating, review, and mark-as-read next steps.
- **FR-12.** Page history allows adding, editing, and deleting dated aggregate
  page logs.
- **FR-13.** Editing or deleting a page log recalculates derived current page,
  progress, pages left, calendar activity, and statistics.
- **FR-14.** Storage remains local-first through the existing book update path.
- **FR-15.** Loading, error, empty, and sparse-data states remain first-class.

## 7. Data

`ReadingLog` remains embedded in `Book`, but becomes the source of truth for page
progress:

```ts
export interface ReadingLog {
  id: string;
  date: string; // YYYY-MM-DD local calendar date
  pagesRead: number; // positive whole number
  currentPageAfter: number; // synchronized derived page after this date
  createdAt: string;
  updatedAt: string;
}
```

Implementation may remove `currentPageAfter` if the plan updates all consumers
to derive it from ordered logs. If it remains, it must be synchronized from the
same log calculation and must not become independent truth.

`Book.currentPage` should either be removed or treated as synchronized derived
state during the refactor. New product behavior must not trust it over
`readingLogs`.

`Book.readingDays` should be removed from domain types and validation as part of
this feature. MVP does not require preserving legacy Reading days.

## 8. Storage interface

No changes to `StorageAdapter`.

The feature continues to persist whole-book updates through the existing
`updateBook(id, input)` path. localStorage remains the MVP persistence layer.

## 9. Edge cases & errors

- Empty current-page input clears today's contribution only if that is supported
  by the final UI; otherwise it should be a validation error.
- Target current page must be a whole number.
- Target current page must be at least `0`; page `0` means no logged progress.
- Target current page must be less than or equal to `totalPages` when total
  pages are known.
- A target current page lower than pages already logged before the selected date
  cannot be represented as a non-negative daily log; show a friendly error and
  direct the user to Page history.
- Duplicate logs for the same book/date normalize to one aggregate entry.
- localStorage failure keeps the user's draft visible and shows an inline error.
- Books without `totalPages` still support page logs, but do not show percent
  complete or pages left.

## 10. Acceptance criteria

- [ ] The detail page no longer shows Reading days.
- [ ] The detail page shows Page history for page logs.
- [ ] Calendar activity is built only from page logs.
- [ ] Statistics rhythm and logged-page facts are built only from page logs.
- [ ] Home accepts current-page input and saves one aggregate log for today.
- [ ] The correction sequence 30 -> 10 -> 30 totals 30 logged pages.
- [ ] Reaching total pages shows rating, review, and mark-as-read actions.
- [ ] Editing Page history recalculates progress and downstream displays.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 11. Out of scope (for this spec)

- Full reading journal with multiple sessions per day.
- Reading session notes.
- Data migration UI for obsolete Reading days.
- Cross-device sync or conflict resolution.
- New charts or dashboard-style analytics.

## 12. Open questions

None. The draft assumes MVP may discard legacy Reading days compatibility and
that one aggregate page log per book/day is the correct product model.
