# Spec: Reader Profile Card

> **Status:** In Review
> **Author:** Codex
> **Created:** 2026-06-08
> **Spec ID:** 017-reader-profile-card
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

The home page has a focused daily reading surface with the active reading
flow and Reading Calendar, but the calendar rail feels purely functional.
The user wants a small cozy profile-like card above the calendar that makes
the app feel more personal without introducing accounts, auth, backend
storage, or dashboard-style analytics.

## 2. Goal

Add a warm auto-generated reader profile card above the home Reading
Calendar, showing a nickname, a soft reader status, and three core reading
stats.

## 3. Non-goals

- Do not add authentication, user accounts, sync, or backend storage.
- Do not add editable profile settings, avatar uploads, or profile forms.
- Do not change `Book`, `BookInput`, `StorageAdapter`, or localStorage schema.
- Do not introduce dashboard analytics, charts, comparisons, goals, badges,
  or social features.
- Do not change Reading Calendar behavior or reading-log persistence.

## 4. Users & scenarios

This is for the single local MVP user who opens the home page to continue
reading and review their recent reading rhythm.

- As a returning reader, the user sees a cozy personal card above the
  calendar and understands their current reading identity at a glance.
- As a new reader with few books or no logs, the user still sees a friendly
  non-empty profile summary without being punished by empty metrics.
- On mobile, the user sees the profile card before the Reading Calendar in
  the same vertical rail flow.

## 5. UX

The card should feel like a warm bookmark or library slip, not a dashboard
widget. It uses calm paper tones, soft borders, generous spacing, a monogram
avatar, and a subtle low-contrast book/bookmark contour in the background.

The card contains:

- Top row: generated avatar monogram, nickname `Quiet Reader`, and muted
  reader status.
- Bottom row: three equal stat columns: `Read`, `Streak`, `Pages`.

Copy is in English to match the current app UI. The selected visual direction
is **Bookmark warmth**.

The card appears above the Reading Calendar wherever the calendar rail
appears. On desktop it sits in the right rail. On mobile it appears above the
calendar before the main reading flow.

## 6. Functional requirements

- FR-1. In the ready non-empty home state, the app renders a reader profile
  card above the Reading Calendar.
- FR-2. The profile card uses only existing `Book[]` data from the library
  store.
- FR-3. The card displays the nickname `Quiet Reader`.
- FR-4. The card displays a computed muted reader status using warm
  role-style copy.
- FR-5. The card displays the number of books with `status === "read"` as
  `Read`.
- FR-6. The card displays total pages read by summing `readingLogs[].pagesRead`
  across all books as `Pages`.
- FR-7. The card displays the current reading streak using local calendar
  dates from `readingLogs.date` and legacy `readingDays`.
- FR-8. The streak may continue from yesterday when no reading has been logged
  today.
- FR-9. Empty metric values display as calm zero states, not errors.
- FR-10. The card does not render during loading, error, or empty-library home
  states.
- FR-11. The card does not alter add, edit, delete, progress update, reading
  log, or calendar behavior.
- FR-12. The card remains readable and non-overlapping on mobile and desktop
  widths.

## 7. Data

No domain entities are changed.

The feature reads existing `Book` values from `src/types/book.ts`, especially:

- `status`
- `readingDays`
- `readingLogs`
- `readingLogs.date`
- `readingLogs.pagesRead`

No migrations are needed.

## 8. Storage interface

No changes to `StorageAdapter`.

The feature does not add, remove, or alter storage methods. It derives all
displayed values from the existing in-memory `Book[]` already loaded by the
store.

## 9. Edge cases & errors

- Empty library: keep the existing empty shelf state and do not render the
  profile card.
- Loading library: keep the existing loading message and do not render the
  profile card.
- Store error: keep the existing error message and do not render the profile
  card.
- No read books: show `0` for `Read`.
- No reading logs or reading days: show `0` for `Streak` and `Pages`.
- Duplicate reading dates across books count as one reading day for streak
  purposes.
- Legacy `readingDays` still contribute to streak so older records remain
  meaningful.
- Malformed optional legacy values are ignored by the helper instead of
  breaking render.

## 10. Acceptance criteria

- [ ] Ready non-empty home page renders the profile card above the Reading
  Calendar.
- [ ] Mobile layout shows the profile card above the Reading Calendar in the
  vertical flow.
- [ ] The card displays `Quiet Reader`, a muted status, and the three labels
  `Read`, `Streak`, `Pages`.
- [ ] `Read` equals the count of books whose status is `read`.
- [ ] `Pages` equals the total of all `readingLogs[].pagesRead`.
- [ ] `Streak` is computed from unique local reading dates and supports
  yesterday as the active streak endpoint.
- [ ] Loading, error, and empty-library states do not render the card.
- [ ] Existing Reading Calendar behavior is unchanged.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 11. Out of scope (for this spec)

- Editable nickname or avatar.
- Uploaded images.
- User profile persistence.
- Achievement badges or gamified levels.
- Reading goals.
- Calendar redesign.
- Library page profile card.

## 12. Open questions

None. The approved direction is an auto-generated cozy profile card in the
Bookmark warmth style, with English UI copy and stats for read books, reading
streak, and pages read.
