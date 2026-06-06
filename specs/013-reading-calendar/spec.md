# Spec: Reading Calendar

> **Status:** Draft
> **Author:** -
> **Created:** 2026-06-06
> **Spec ID:** 013-reading-calendar
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 005 (detail view), spec 012 (reading dates), spec 011 (shelf filters polish)
> **Successor:** -

---

## 1. Problem

Book Tracker can store books, status, ratings, reviews, quotes,
and coarse reading dates, but it still cannot show the user's
actual reading life day by day.

The user wants a cozy visual object that accumulates over time:
a month grid where each day is colored by the cover color of the
book read that day. After a few months, this should feel less like
a dashboard and more like a small piece of personal reading art.

Today there is nowhere to log "I read this book today" or "I read
this book last Tuesday." The shelf can say what books exist; it
cannot show the texture of reading across days.

## 2. Goal

Let users manually log reading days per book and show a
dark-theme-friendly monthly Reading Calendar above the shelf.

## 3. Non-goals

- No backend, sync, auth, accounts, sharing, or multi-user behavior.
- No reading streaks, goals, achievement counters, or analytics
  dashboard. The calendar is a visual memory surface, not a metrics
  wall.
- No reading sessions with pages, minutes, percentage progress, or
  notes. This spec tracks only "this book was read on this date."
- No editing from the home calendar in v1. Reading days are edited
  from the book detail page.
- No separate calendar page in v1. The calendar lives on the home
  page above the shelf.
- No date-time granularity. Reading days are local calendar dates
  in `YYYY-MM-DD`, not timestamps.
- No required automatic color extraction. Auto color is best-effort;
  manual color is the dependable path.
- No new `StorageAdapter` method and no localStorage migration.

## 4. Users & scenarios

**Story.** Andy reads *Piranesi* tonight. He opens the book detail
page and clicks **Mark today** in a new Reading days section. The
date appears in the book's logged days. Back on the shelf, today's
cell in the Reading Calendar is filled with *Piranesi*'s cover color.

**Story.** Andy forgot to log yesterday's reading. He opens the same
book detail page, picks yesterday in a small date field, and saves it.
The home calendar updates the previous day's cell.

**Story.** On one day Andy reads two books. The day cell is split into
two colored stripes, preserving both books without turning the calendar
into a text-heavy UI.

**Story.** Andy's cover URL cannot provide an automatic color. He picks
a cover color manually in the book form. The book still saves, and the
calendar uses that manual color.

## 5. Decisions

### 5.1 New decisions for 013

- **013-D1. Book-first model.** Reading days live on the `Book`
  record as `readingDays?: string[]`. This mirrors the existing
  quotes pattern: the detail page edits nested book data and persists
  through `useBookLibrary.updateBook`.

- **013-D2. Home calendar is display-only in v1.** The home page shows
  the art object. It does not own editing flows, book pickers, or
  day-click dialogs. Editing happens on the book detail page.

- **013-D3. Dates are local `YYYY-MM-DD` strings.** They are not ISO
  datetimes. `<input type="date">` produces this shape, lexicographic
  sorting matches chronological sorting, and the feature avoids
  timezone surprise.

- **013-D4. Reading days are unique per book.** A book can be logged
  at most once per date. Adding the same date twice is a no-op in the
  UI and is normalized by validation.

- **013-D5. Cover color is stored on the book.** `coverColor?: string`
  is an optional hex color. The calendar reads this field directly
  instead of trying to derive colors during calendar rendering.

- **013-D6. Auto color extraction is best-effort.** When `coverUrl` is
  present, the UI may attempt to extract a dominant color and fill or
  suggest `coverColor`. This must never block saving. CORS, image
  loading, or canvas failures fall back to manual color entry. Auto
  extraction must not overwrite an existing manual `coverColor` without
  an explicit user action.

- **013-D7. Approved visual direction: Ink Shelf.** The calendar uses
  a warm dark panel, quiet month labels, compact square day cells, and
  cover colors as the main visual material. It must feel cozy and
  bookish, not analytical.

- **013-D8. Multiple books in one day render as stripes.** A day with
  one book uses one color. A day with two or three books renders two
  or three stripes. A day with more than three books shows the first
  three stable colors visually and exposes the full list in accessible
  label/title text.

- **013-D9. Month navigation is local UI state.** The calendar opens
  on the current local month. Previous / next buttons change the
  visible month in component state only. The selected month is not
  persisted and not encoded in the URL.

- **013-D10. No new dependency.** Month generation, date validation,
  color validation, and color extraction use browser / platform APIs
  and small local helpers. A dependency is not justified for this
  feature.

### 5.2 Carried over from earlier specs

- **005.** The book detail page is the home for book-specific sections.
  Reading days should follow the established detail-section pattern.
- **011.** Shelf controls and view state are local. The calendar's
  visible month follows the same local-only posture.
- **012.** Reading-related dates are independent of `status` and use
  calendar-date semantics. `readingDays` is also independent: marking a
  day does not auto-change `status`, `startedAt`, or `finishedAt`.

## 6. UX

### 6.1 Home page calendar

The Reading Calendar appears above the shelf content when the library
is ready and has at least one book. It sits below the page header and
above the search / filter / shelf list stack.

The calendar shows:

- a compact title, **Reading Calendar**;
- the visible month label;
- previous and next month icon buttons;
- a month grid with one cell per day;
- muted placeholder cells for leading/trailing empty grid positions,
  if needed by the chosen grid implementation;
- a legend of books that appear in the visible month;
- a soft empty state when the visible month has no logged reading days.

The visual direction is **Ink Shelf**: warm dark panel, calm spacing,
no glassmorphism, no cold analytics styling, and no oversized hero
treatment. The calendar should feel like an object placed above the
shelf, not a dashboard module.

### 6.2 Day cells

Each real day cell has an accessible label that includes:

- the date;
- "No reading logged" when empty; or
- the titles of books logged that day.

Empty logged state uses a warm muted fill. A logged day uses the book's
`coverColor` or the fallback color. Multi-book days use stripes.

### 6.3 Legend

The legend lists only books that appear in the visible month. Each
legend item shows a small book-like color swatch and the book title.
If the visible month has no logged reading days, the legend is omitted.

### 6.4 Book detail Reading days section

The book detail page gains a new **Reading days** section, placed after
the existing book-specific memory sections. It includes:

- **Mark today** button for the fast daily habit;
- a native date input for adding a past or specific date;
- an add button for the selected date;
- a list of logged dates, newest first;
- a small remove action for each logged date.

If the book has no logged days, the section shows a quiet empty state:
for example, "No reading days logged yet."

### 6.5 Book form cover color

The shared add/edit book form gains an optional cover color input. It
should be compact and understandable:

- a color picker or text field that stores a hex color;
- if `coverUrl` is present, optional best-effort auto-fill behavior;
- inline validation error for invalid color strings.

Manual color stays available even when auto extraction fails.

### 6.6 Errors and feedback

- Save failures use existing toast / inline error patterns and keep the
  user's input intact.
- Adding a duplicate reading day does not create another entry.
- Color extraction failure is not an error state for the user; it simply
  leaves the manual color path available.

## 7. Functional requirements

- **FR-1.** A `Book` may have optional `readingDays?: string[]`, where
  each value is a valid local calendar date in `YYYY-MM-DD` form.
- **FR-2.** `readingDays` are unique per book. Duplicate submitted
  dates are normalized to one entry.
- **FR-3.** A `Book` may have optional `coverColor?: string`, where the
  value is a valid hex color (`#RGB` or `#RRGGBB`).
- **FR-4.** Existing books without `readingDays` or `coverColor` remain
  valid and render without migration.
- **FR-5.** The user can mark today's date for a book from the book
  detail page.
- **FR-6.** Marking today when today is already logged does not create
  a duplicate date.
- **FR-7.** The user can add a specific past or present date for a book
  from the book detail page.
- **FR-8.** The user can remove a logged reading day from a book.
- **FR-9.** Reading day changes persist through
  `useBookLibrary.updateBook`.
- **FR-10.** The home page renders a Reading Calendar above the shelf
  when the store is ready and the library is non-empty.
- **FR-11.** The Reading Calendar opens on the current local month.
- **FR-12.** The user can navigate to previous and next months without
  changing route or persisted state.
- **FR-13.** A day with one logged book renders one color.
- **FR-14.** A day with two or more logged books renders color stripes,
  using up to three visible colors.
- **FR-15.** A day with more than three logged books exposes the full
  book list through accessible label/title text.
- **FR-16.** If a logged book has no `coverColor`, the calendar uses a
  warm fallback color.
- **FR-17.** The visible-month legend lists only books with reading days
  in that month.
- **FR-18.** A visible month with no logged days shows a soft empty
  state instead of an empty chart or metrics panel.
- **FR-19.** Auto cover-color extraction, if implemented, is best-effort
  and never blocks adding or editing a book.

## 8. Data

### 8.1 Change to `src/types/book.ts`

```ts
export interface Book {
  // existing fields unchanged

  /**
   * Local calendar dates (`YYYY-MM-DD`) when this book was read.
   * Optional for legacy records and books with no logged reading days.
   */
  readingDays?: string[];

  /**
   * Optional hex color used by the Reading Calendar. Usually selected
   * manually or suggested from the cover image.
   */
  coverColor?: string;
}
```

`BookInput = Omit<Book, "id" | "createdAt">` automatically includes both
fields.

### 8.2 Validation

`validateBookInput` adds validators for:

- `readingDays`: optional array of valid `YYYY-MM-DD` strings,
  normalized to sorted unique dates;
- `coverColor`: optional string, trimmed, must match `#RGB` or
  `#RRGGBB`.

Missing or empty `readingDays` normalizes to `undefined`. Rendering and
calendar helpers treat `undefined` the same as an empty list. Empty
`coverColor` normalizes to `undefined`.

### 8.3 Calendar derivation

The calendar derives its display model from the current `books` array.
No derived calendar state is stored. A pure helper should build:

- the days in the visible month;
- the books logged for each day;
- the visible-month legend entries;
- accessibility labels for day cells.

## 9. Storage interface

No change to `StorageAdapter`.

The feature uses existing methods:

- `listBooks()` loads persisted books, including optional new fields.
- `addBook(input)` persists `coverColor` if present.
- `updateBook(id, input)` persists `coverColor` and `readingDays`
  changes.
- `deleteBook(id)` needs no change; deleting a book naturally removes
  its contribution from the derived calendar.

## 10. Edge cases & errors

- **Legacy books:** books without `readingDays` are treated as having no
  logged days.
- **Invalid persisted shape:** the validator is the form boundary; the
  existing localStorage adapter still trusts persisted records. Runtime
  calendar helpers should handle missing/undefined fields defensively.
- **Duplicate date add:** no duplicate entry is shown or persisted.
- **Invalid manual date:** the date input and validator reject malformed
  dates; the user sees an inline error.
- **Future date:** allowed. A user may backfill planned or remembered
  data; this spec does not forbid it.
- **Multiple books on one day:** render stripes and use accessible labels
  for the full list.
- **No color:** use fallback, no error.
- **Bad color:** reject at validation with an inline form error.
- **Auto color fails:** do not show a scary error; keep manual entry
  available.
- **localStorage full or disabled:** existing update/add failure handling
  applies; the UI keeps user input and shows an error/toast.

## 11. Acceptance criteria

- [ ] `Book` and `BookInput` support optional `readingDays` and
  `coverColor`.
- [ ] `validateBookInput` accepts valid reading days and cover colors.
- [ ] `validateBookInput` rejects malformed reading dates and cover
  colors.
- [ ] Duplicate reading dates are normalized to a single date.
- [ ] Existing books without the new fields still render.
- [ ] A book detail page lets the user mark today.
- [ ] Marking today twice creates only one logged date.
- [ ] A book detail page lets the user add a selected date.
- [ ] A book detail page lets the user remove a logged date.
- [ ] Reading day edits persist through `updateBook`.
- [ ] The home page shows the Reading Calendar above the shelf.
- [ ] The calendar defaults to the current local month.
- [ ] Previous / next month navigation works locally.
- [ ] A day with one logged book renders one cover color.
- [ ] A day with multiple logged books renders stripes.
- [ ] A day with more than three logged books exposes the full title list
  accessibly.
- [ ] A month with no logged days shows a cozy empty state.
- [ ] The visible-month legend includes only books present in that month.
- [ ] Auto color extraction failure does not block saving a book.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 12. Out of scope (for this spec)

- Calendar editing from the home page.
- A full-year calendar or archive page.
- Reading streaks, goals, stats, charts, or progress analytics.
- Reading sessions with pages, time spent, notes, or progress.
- Syncing reading logs between devices.
- Importing reading days from external services.
- Sharing or exporting the calendar art.
- Changing `StorageAdapter`.

## 13. Open questions

None. The current draft is ready for review and then implementation
planning.
