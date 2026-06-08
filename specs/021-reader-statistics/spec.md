# Spec: Reader Statistics Page

> **Status:** Approved
> **Author:** Codex
> **Created:** 2026-06-08
> **Spec ID:** 021-reader-statistics
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

The Statistics page exists in navigation but currently shows only placeholder
copy. Readers need a warm way to understand what their local shelf says about
their habits and taste without turning the app into a cold analytics dashboard.

## 2. Goal

Create a cozy whole-library reader portrait that summarizes volume, rhythm,
favorite tags, highly rated books, and shelf balance.

## 3. Non-goals

- No backend, auth, sync, telemetry, or third-party analytics.
- No period switcher in v1.
- No author analytics in v1.
- No large dashboard-style charts.
- No changes to `Book`, `StorageAdapter`, or persisted data shape.

## 4. Users & scenarios

The MVP user is a single local reader with books saved in browser storage.

Smallest scenario: a reader opens `/stats` and sees a warm overview of their
entire library: how many books they have read, how many pages they have logged,
which tags appear most often, which rated books they loved most, how steady
their reading rhythm is, and how their shelf is split across want/reading/read.

## 5. UX

The page uses the existing warm Book Tracker style: serif headings, paper-like
cards, soft borders, calm spacing, and shadcn/ui primitives where useful. It
must feel like a reader portrait, not a dashboard.

States:

- Loading: show a quiet loading message inside the shared page container.
- Error: show a friendly error message if the library store cannot load.
- Empty: show a warm empty state explaining that statistics appear after adding
  books.
- Ready with sparse data: keep sections visible and show gentle prompts for
  missing tags, ratings, or page logs.
- Ready with full data: show the full portrait sections.

## 6. Functional requirements

- FR-1. `/stats` reads books from `useBookLibrary` and reacts to `loading`,
  `error`, and `ready` states.
- FR-2. Statistics are scoped to the entire local library.
- FR-3. The hero portrait shows read count, logged pages, average rating,
  current streak, and top tag.
- FR-4. Average rating uses only books with a `rating`.
- FR-5. Top tags are counted across all books and sorted deterministically by
  count descending, then label ascending.
- FR-6. Highest-rated books include only rated books, show up to five books,
  and sort by rating descending, valid `finishedAt` descending, `createdAt`
  descending, then title ascending.
- FR-7. Reading rhythm uses both `readingLogs` and legacy `readingDays` for
  reading dates and streak.
- FR-8. Logged pages and best reading day use only `readingLogs.pagesRead`.
- FR-9. If legacy `readingDays` exist but no page logs exist, the rhythm block
  still shows reading days/streak and replaces page-based facts with gentle
  empty copy.
- FR-10. Shelf balance shows quiet counts for `want`, `reading`, and `read`.
- FR-11. Empty data sections remain visible with helpful copy instead of
  disappearing.
- FR-12. All visible Statistics page copy is in English.

## 7. Data

The feature derives display-only values from `Book[]` in `src/types/book.ts`.
It reads existing fields only: `status`, `tags`, `createdAt`, `rating`,
`startedAt`, `finishedAt`, `readingDays`, `currentPage`, `totalPages`, and
`readingLogs`.

No migrations are needed.

## 8. Storage interface

No changes to `StorageAdapter`. The page consumes the existing Zustand library
state that is already initialized by `RootClient`.

## 9. Edge cases & errors

- Empty library: show an empty portrait state.
- No ratings: show average rating and highest-rated books as empty prompts.
- No tags: show top tag and favorite tags as empty prompts.
- No reading logs: show page-based rhythm prompts instead of false zero-heavy
  facts.
- Invalid or malformed legacy dates are ignored by the pure stats helper.
- Ties in tags, best day, and top books must be deterministic.

## 10. Acceptance criteria

- [ ] `/stats` no longer renders placeholder copy.
- [ ] `/stats` handles loading, error, empty, sparse, and populated ready states.
- [ ] A pure stats helper returns the complete display model and is unit-tested.
- [ ] The UI renders the five approved zones: hero portrait, favorite tags,
  highest-rated books, reading rhythm, and shelf balance.
- [ ] `npm run lint` and `npm run test` pass.

## 11. Out of scope (for this spec)

- Period filters or comparisons.
- Author insights.
- Full charts, calendars, heatmaps, or trend timelines.
- Editing books, ratings, tags, goals, or reading logs from the stats page.

## 12. Open questions

None. v1 decisions are locked by this spec.
