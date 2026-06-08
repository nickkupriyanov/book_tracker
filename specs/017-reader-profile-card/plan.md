# Plan: Reader Profile Card

> **Status:** In Review
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-08

---

## 1. Architecture summary

This feature adds a display-only reader profile card to the existing home
rail. The card derives a small profile view model from the already-loaded
`Book[]`, then renders that model above `ReadingCalendar` in
`ShelfClient`. Calculations stay in a pure helper so streak, pages, read
count, and status copy can be tested without React. No store, storage,
domain type, or adapter changes are needed.

## 2. Module / file layout

- `src/lib/reader-profile.ts` - pure profile model builder from `Book[]`.
- `src/features/reader-profile/ReaderProfileCard.tsx` - cozy card UI.
- `src/features/reader-profile/index.ts` - feature export.
- `src/app/ShelfClient.tsx` - render the profile card above the calendar.
- `tests/lib/reader-profile.test.ts` - profile calculations and edge cases.
- `tests/features/reader-profile/ReaderProfileCard.test.tsx` - card render
  smoke coverage.
- `tests/app/ShelfClient.test.tsx` - home placement and state coverage.

## 3. Data flow

1. `RootClient` initializes `useBookLibrary` with the storage adapter.
2. `ShelfClient` reads `status` and `books` from the store.
3. In the ready non-empty state, `ShelfClient` renders the rail block with
   `ReaderProfileCard` first and `ReadingCalendar` second.
4. `ReaderProfileCard` receives `books` and calls the pure profile helper.
5. The helper returns nickname, avatar initials, status label, read count,
   streak days, and total pages.
6. The component renders the resulting model without mutating state or
   storage.

## 4. Component breakdown

- **ReaderProfileCard**
  - **Props:** `books: Book[]`.
  - **State:** none; all values are derived.
  - **Behavior:** renders the auto-generated profile with monogram avatar,
    nickname, muted status, and three stats.
  - **Tests:** nickname/status/stat labels render; zero values are calm and
    readable.

- **Profile model helper**
  - **Input:** `Book[]` and optional `now` date for deterministic tests.
  - **Output:** display-ready strings/numbers for the card.
  - **Behavior:** counts read books, totals logged pages, deduplicates reading
    dates, calculates the active streak, and picks a warm role status.
  - **Tests:** empty activity, read counts, page sums, duplicate dates, legacy
    `readingDays`, today/yesterday streak endpoints, malformed optional values.

## 5. Storage adapter changes

No changes to `StorageAdapter`.

The feature reads existing in-memory `Book[]` and derives presentation-only
values. It does not persist profile state, user settings, or aggregates.

## 6. Decisions & trade-offs

- Chose auto-generated profile over editable settings because the MVP has no
  auth or user entity.
- Chose a pure helper over Zustand selectors because only one card consumes
  the model today and tests should stay simple.
- Chose English copy because the current app UI is English.
- Chose `Read`, `Streak`, and `Pages` because they balance library progress,
  habit, and reading volume without becoming a dashboard.
- Chose a warm bookmark/library-slip card so the right rail feels personal
  while staying calm above the darker calendar.
- Chose legacy `readingDays` support for streaks so older records still count.

## 7. Risks

- `Pages` can be `0` for users who tracked reading days before page logs
  existed; the UI should make that feel normal.
- Streak logic can be sensitive to local dates; the helper should use local
  calendar formatting and deterministic tests with an injected `now`.
- Decorative background elements can become noisy in the narrow rail; keep
  them low-contrast and non-interactive.
- The card adds vertical height above the calendar on mobile; spacing should
  stay compact enough that the reading flow is not buried.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No.
- Manual QA steps:
  - Visit `/` with a non-empty library and verify the card appears above the
    Reading Calendar.
  - Check loading, error, and empty-library home states do not show the card.
  - Check mobile width: profile card appears above the calendar and does not
    overlap content.
  - Check desktop width: profile card sits in the right rail above the sticky
    calendar.
  - Verify `Read`, `Streak`, and `Pages` match seeded book data.
  - Run `npm run lint`.
  - Run `npm run test`.
