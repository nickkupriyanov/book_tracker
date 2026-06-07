# Spec: Reading Log And Navigation Polish

> **Status:** Draft
> **Author:** Codex
> **Created:** 2026-06-07
> **Spec ID:** 016-reading-log-and-navigation-polish
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 013 (reading calendar), spec 015 (library page and page progress)
> **Successor:** -

---

## 1. Problem

Spec 015 split the home page from the full library and added current-page
tracking, but several daily-use details still feel unfinished.

The app title and navigation are page-local instead of shared, so moving
between Home, Library, and future Statistics is not yet a first-class
app-shell experience. The Reading Calendar is visible in more than one
place, which makes the full library feel less focused than intended.

The home reading cards are still not book-like enough: they should feel
like small cozy vertical books, with the cover as the visual anchor and
softer framing. The active `Where are you?` panel also needs to show the
selected book's cover and avoid layout jumps between books with and
without progress.

Most importantly, the current-page save flow does not yet provide enough
data for the calendar. The calendar should not only know that a book was
read on a day; it should know how many pages were read for each book that
day so it can choose the most relevant three book colors.

## 2. Goal

Polish the app shell and home reading UI, and convert page-progress saves
into per-book daily reading logs that power the Reading Calendar.

## 3. Non-goals

- No backend, sync, auth, accounts, or server persistence.
- No full statistics implementation; `/stats` is a placeholder only.
- No goals, streaks, charts, analytics dashboard, or yearly counters.
- No reading-session list UI in this spec. Logs are created by the home
  progress flow and used by the calendar.
- No user-entered pages-read delta. The user continues to enter current
  page.
- No removal of legacy `readingDays`.
- No new `StorageAdapter` method.
- No new npm dependency.

## 4. Users & scenarios

**Story.** Andy opens Book Tracker and sees a shared header with the app
name and links to Home, Library, and Statistics. He can tell which page
is active without reading the page content.

**Story.** Andy is on the library page. It is only the full shelf:
search, filters, sort, tags, add/edit/delete, and all books. The Reading
Calendar is not shown there.

**Story.** Andy is reading three books. On the home page each book is a
small vertical cozy card with the cover at the top, title, author,
progress, and a compact tag row. Clicking a card makes it active in
`Where are you?`; clicking the title opens the book detail page.

**Story.** Andy saves page 120 for *Piranesi* when the previous
`currentPage` was 90. The app saves `currentPage = 120`, creates or
updates today's reading log for *Piranesi* with `+30 pages`, and the
calendar can use that page count.

**Story.** Andy later corrects the current page down from 120 to 110.
The app saves `currentPage = 110` but does not add pages to today's
reading log.

## 5. UX

### 5.1 Shared header

The app has one shared header across routes. It shows:

- app title **Book Tracker**, linking to `/`;
- `Главная` link to `/`;
- `Библиотека` link to `/library`;
- `Статистика` link to `/stats`;
- a visible active state for the current route.

The header should feel quiet and bookish. It is navigation, not a hero.
Page-level headings and actions remain inside pages where needed. The
library page may still show an add-book action near its content.

### 5.2 Stats placeholder

`/stats` renders a placeholder page inside the shared page rhythm. It
has a heading and a calm empty-state sentence explaining that reading
statistics will live there later.

### 5.3 Calendar placement

The Reading Calendar renders only on the home page. The library page is
the full shelf and does not render a calendar rail.

### 5.4 Home cards

Home reading cards use the approved **Cover-led cozy cards** direction:

- approximately 160px wide on comfortable viewports;
- vertical orientation;
- cover or placeholder at the top, flush to top/left/right edges;
- title below the cover, linking to `/book/[id]`;
- author below the title;
- page progress below the author: `123 / 420 pages`, `Page 123`, or
  `No page yet`;
- tag row below progress: first two tags, then `+N` if more remain;
- soft shadow/background/ring instead of an aggressive border.

Clicking the card body selects the active book for `Where are you?`.
Clicking the title navigates to detail and should not change the active
book first.

### 5.5 Where are you?

The focus panel shows the active book's cover or placeholder alongside
title, author, current-page input, progress text/bar, and actions.

The panel reserves stable vertical space for progress/help text so it
does not jump when switching between books with and without progress.

### 5.6 Reading log behavior

The user still enters current page, not pages read. On successful save:

- if there was no previous `currentPage` and the new value is `N`, today's
  log receives `N` pages;
- if `newCurrentPage > oldCurrentPage`, today's log receives the positive
  delta;
- if `newCurrentPage <= oldCurrentPage`, no pages are added to logs;
- if current page is cleared, no log is created.

Multiple saves for the same book on the same day aggregate into one
daily log.

### 5.7 Calendar day colors

The calendar groups reading logs by date and book, sorts books for each
day by `pagesRead` descending, and renders at most three book colors for
the day. Accessible labels include page counts.

Legacy `readingDays` remain compatible. A legacy reading day without a
log still renders as a reading day, but logs with real page counts take
priority for the top-three ordering.

## 6. Functional requirements

- **FR-1.** The app renders a shared header with app title and links to
  `/`, `/library`, and `/stats`.
- **FR-2.** The shared header marks the active route.
- **FR-3.** `/stats` renders a placeholder page.
- **FR-4.** The Reading Calendar renders on `/` when the library is ready
  and non-empty.
- **FR-5.** The Reading Calendar does not render on `/library`.
- **FR-6.** Home reading cards are vertical, compact, and approximately
  160px wide on comfortable viewports.
- **FR-7.** Home reading card covers or placeholders are flush to the
  card's top, left, and right edges.
- **FR-8.** Home reading card titles link to the book detail page.
- **FR-9.** Clicking a home reading card body selects that book as active
  in `Where are you?`.
- **FR-10.** Home reading cards show author, page progress or `No page
  yet`, and first two tags plus `+N`.
- **FR-11.** `Where are you?` shows the active book cover or placeholder.
- **FR-12.** `Where are you?` keeps stable layout height when switching
  between books with and without progress.
- **FR-13.** `Book` supports optional `readingLogs?: ReadingLog[]`.
- **FR-14.** Saving a current page with a positive delta creates or
  updates today's aggregate reading log for that book.
- **FR-15.** Saving the same or a lower current page updates
  `currentPage` but does not add pages to reading logs.
- **FR-16.** Clearing current page does not create a reading log.
- **FR-17.** Multiple saves for the same book/date aggregate into one
  reading log.
- **FR-18.** Calendar day colors are ordered by per-book pages read for
  that day and limited to three visible books.
- **FR-19.** Calendar accessible labels include page counts when logs
  have page data.
- **FR-20.** Existing `readingDays` continue to render without migration.

## 7. Data

Add a `ReadingLog` domain type:

```ts
export interface ReadingLog {
  id: string;
  date: string; // YYYY-MM-DD
  pagesRead: number;
  currentPageAfter: number;
  createdAt: string;
  updatedAt: string;
}
```

Extend `Book`:

```ts
readingLogs?: ReadingLog[];
```

Validation rules:

- `date` is a valid local calendar date in `YYYY-MM-DD` form.
- `pagesRead` is a positive whole number.
- `currentPageAfter` is a positive whole number.
- `id`, `createdAt`, and `updatedAt` are strings.
- Multiple logs with the same `date` for a single book should normalize
  to one aggregate log.

No migration is required. Existing books without `readingLogs` remain
valid.

## 8. Storage interface

No changes to `StorageAdapter`.

`readingLogs` are embedded in the `Book` record and persisted through
the existing `addBook` and `updateBook` methods.

## 9. Edge cases & errors

- If storage save fails, the current-page draft stays visible and no log
  should be assumed saved.
- If `currentPage` is cleared, the app clears only `currentPage`; existing
  logs are historical and remain.
- If old `currentPage` is missing and new page is 50, pages read is 50.
- If old `currentPage` is 80 and new page is 80, no log pages are added.
- If old `currentPage` is 80 and new page is 70, no log pages are added.
- If today's log already exists for the book, positive deltas add to
  `pagesRead` and update `currentPageAfter` / `updatedAt`.
- If more than three books have logs for a day, the calendar shows the
  three with the highest `pagesRead`; ties use stable book order.
- Legacy `readingDays` without logs do not override logged page ordering.
- Two-tab edits follow current MVP behavior: last successful write wins.

## 10. Acceptance criteria

- [ ] Shared header appears on home, library, detail, and stats pages.
- [ ] Header active route is visible for `/`, `/library`, and `/stats`.
- [ ] `/stats` placeholder exists.
- [ ] Calendar appears on home only, not library.
- [ ] Home cards match the vertical cover-led structure.
- [ ] Home card body selects the active book.
- [ ] Home card title links to detail.
- [ ] `Where are you?` shows active book cover/placeholder.
- [ ] `Where are you?` does not visibly jump between books with and
      without progress.
- [ ] Positive page deltas create/update today's aggregate reading log.
- [ ] Non-positive page deltas do not add log pages.
- [ ] Clearing current page does not create a log.
- [ ] Calendar orders day colors by pages read and shows at most three.
- [ ] Calendar accessible labels include page counts.
- [ ] Legacy `readingDays` still render.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 11. Out of scope (for this spec)

- Real statistics content for `/stats`.
- Editing or deleting reading logs in a dedicated UI.
- Reading sessions with start/end times.
- Charts, streaks, goals, achievements, or analytics.
- Sync/backend/auth.
- Removing or migrating away from `readingDays`.

## 12. Open questions

None. Confirmed decisions:

- Home card visual direction is **Cover-led cozy cards**.
- User enters current page, not pages-read delta.
- Positive deltas aggregate into one book/date log.
- Calendar sorts day colors by pages read and shows at most three books.
- `/stats` is a placeholder.
