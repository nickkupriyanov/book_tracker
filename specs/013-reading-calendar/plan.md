# Plan: Reading Calendar

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** -
> **Created:** 2026-06-06

---

## 1. Architecture summary

This feature extends the existing `Book` aggregate with two optional
fields: `readingDays?: string[]` and `coverColor?: string`. Like quotes
and reading dates, the data stays embedded in the book and persists
through the existing `StorageAdapter` methods; there is no new storage
contract and no migration.

The implementation has four small layers:

- **Domain / validation:** add the two optional fields to
  `src/types/book.ts` and normalize them at the existing
  `validateBookInput` boundary.
- **Pure calendar logic:** add helpers that turn `Book[] + visibleMonth`
  into day cells, legend entries, labels, and stripe colors.
- **Book detail input:** add a focused `ReadingDaysSection` on the
  detail page that edits one book's `readingDays` through
  `useBookLibrary.updateBook`.
- **Home visual:** add a display-only `ReadingCalendar` above the shelf
  in `ShelfClient`, using the approved Ink Shelf visual direction.

Auto cover-color extraction is planned as a best-effort enhancement
inside the form layer. Manual `coverColor` is the source of truth and
the only required path.

## 2. Module / file layout

```
src/types/
└── book.ts
    MODIFIED: add optional readingDays?, coverColor? comments.

src/lib/validation/
└── book.ts
    MODIFIED: add validateReadingDays, validateCoverColor, integrate into
    validateBookInput.

src/lib/
├── reading-calendar.ts
│   NEW: pure month/day/legend derivation helpers.
└── cover-color.ts
    NEW: normalize hex colors, fallback color, best-effort image
    extraction helper.

src/components/
└── BookForm.tsx
    MODIFIED: coverColor state, color input, optional auto-color action,
    include coverColor in submitted BookInput.

src/features/add-book/
└── AddBookDialog.tsx
    UNCHANGED: coverColor is optional, so the existing initialValues
    object may omit it.

src/features/edit-book/
└── EditBookDialog.tsx
    MODIFIED: initialValues carries book.coverColor through like coverUrl.

src/features/detail-view/
├── BookDetail.tsx
│   MODIFIED: render ReadingDaysSection and wire save handlers.
├── ReadingDaysSection.tsx
│   NEW: Mark today, date input, logged date list, remove actions.
└── index.ts
    MODIFIED: export ReadingDaysSection for local feature imports/tests.

src/features/reading-calendar/
├── ReadingCalendar.tsx
│   NEW: home-page calendar shell, month navigation, empty state.
├── ReadingCalendarDay.tsx
│   NEW: accessible day cell with solid or striped color rendering.
├── ReadingCalendarLegend.tsx
│   NEW: visible-month book legend.
└── index.ts
    NEW: public feature export.

src/app/
└── ShelfClient.tsx
    MODIFIED: render <ReadingCalendar books={books} /> above ShelfList
    when status is ready and books.length > 0.

tests/
├── lib/
│   ├── reading-calendar.test.ts
│   │   NEW: month days, mapping, legend, multi-book labels.
│   └── cover-color.test.ts
│       NEW: color normalization and fallback helpers.
├── validation/
│   └── book.test.ts
│       MODIFIED: readingDays and coverColor validation cases.
├── components/
│   └── BookForm.test.tsx
│       MODIFIED: color field, invalid color, submitted coverColor.
└── features/
    ├── detail-view/
    │   ├── ReadingDaysSection.test.tsx
    │   │   NEW: mark today, add date, remove date, duplicate no-op.
    │   └── BookDetail.test.tsx
    │       MODIFIED: renders ReadingDaysSection and persists changes.
    └── reading-calendar/
        ├── ReadingCalendar.test.tsx
        │   NEW: current month, navigation, empty/filled state.
        ├── ReadingCalendarDay.test.tsx
        │   NEW: accessible labels, stripes, >3-title label.
        └── ReadingCalendarLegend.test.tsx
            NEW: visible-month legend only.
```

## 3. Data flow

### 3.1 Saving cover color from the book form

```
BookForm
  user enters or accepts coverColor "#b85b45"
  submit builds BookInput with coverColor when non-empty
  validateBookInput trims + normalizes the hex color
  AddBookDialog/EditBookDialog calls addBook/updateBook
  LocalStorageAdapter stores the field as part of the Book
```

Auto extraction runs only when the user clicks a "Use cover color"
button next to the cover color field. It must not overwrite an existing
manual color without that explicit click.

### 3.2 Marking a reading day

```
BookDetail finds book by id
  ReadingDaysSection receives book.readingDays ?? []
  user clicks Mark today or adds selected date
  handler builds sorted unique nextReadingDays
  validateBookInput({ ...book, readingDays: nextReadingDays })
  updateBook(book.id, result.value)
  store replaces the book
  detail section and home calendar re-render from store state
```

If the added date already exists, the relevant add button is disabled
and the handler still guards with a no-op. No duplicate is persisted.

### 3.3 Rendering the home calendar

```
ShelfClient status === "ready" && books.length > 0
  render ReadingCalendar({ books })
  ReadingCalendar owns visibleMonth state
  buildReadingCalendarMonth(books, visibleMonth)
    -> days[]
    -> legend[]
  render:
    header + previous/next buttons
    grid of ReadingCalendarDay
    empty state or ReadingCalendarLegend
```

The visible month is local component state only. Refreshing the page
returns to the current local month.

## 4. Component breakdown

### `ReadingDaysSection`

- **Props**
  ```ts
  interface ReadingDaysSectionProps {
    book: Book;
    onSaveReadingDays: (readingDays: string[] | undefined) => Promise<void>;
  }
  ```
- **State:** local `selectedDate`, `errors`, `isSaving`.
- **Behavior:** shows Mark today, selected-date add, newest-first date
  list, and remove buttons. It normalizes dates before calling
  `onSaveReadingDays`.
- **Tests:** duplicate add does not duplicate, today is added, selected
  date is added, remove persists remaining dates, save failure keeps UI
  usable.

### `ReadingCalendar`

- **Props**
  ```ts
  interface ReadingCalendarProps {
    books: Book[];
  }
  ```
- **State:** local `visibleMonth` as `{ year: number; month: number }`
  where `month` is zero-based to match `Date`.
- **Behavior:** derives calendar view from books, renders Ink Shelf
  panel, month navigation, grid, empty state, and legend.
- **Tests:** starts on current month, previous/next changes label, empty
  month shows empty state, logged month shows day cells and legend.

### `ReadingCalendarDay`

- **Props**
  ```ts
  interface ReadingCalendarDayProps {
    day: ReadingCalendarDayModel;
  }
  ```
- **State:** none.
- **Behavior:** renders muted empty cell, solid color for one book, and
  CSS stripe background for multiple books. Uses `aria-label` and
  `title` from the day model.
- **Tests:** empty label, one-color style, striped style, full label for
  more than three books.

### `ReadingCalendarLegend`

- **Props**
  ```ts
  interface ReadingCalendarLegendProps {
    entries: ReadingCalendarLegendEntry[];
  }
  ```
- **State:** none.
- **Behavior:** renders only visible-month books with small book-like
  swatches and titles.
- **Tests:** renders unique entries, omits absent month books.

## 5. Pure helpers

### `src/lib/reading-calendar.ts`

Planned exports:

```ts
export interface CalendarMonth {
  year: number;
  month: number; // 0-based
}

export interface ReadingCalendarBookRef {
  id: string;
  title: string;
  color: string;
}

export interface ReadingCalendarDayModel {
  date: string;
  dayOfMonth: number;
  books: ReadingCalendarBookRef[];
  visibleColors: string[];
  ariaLabel: string;
  title: string;
}

export interface ReadingCalendarLegendEntry {
  bookId: string;
  title: string;
  color: string;
}

export interface ReadingCalendarMonthModel {
  label: string;
  days: ReadingCalendarDayModel[];
  legend: ReadingCalendarLegendEntry[];
  hasLoggedDays: boolean;
}

export function currentCalendarMonth(now?: Date): CalendarMonth;
export function shiftCalendarMonth(month: CalendarMonth, delta: number): CalendarMonth;
export function buildReadingCalendarMonth(
  books: Book[],
  month: CalendarMonth
): ReadingCalendarMonthModel;
```

Rules:

- Build exactly the real days for the visible month. The v1 UI does not
  render leading/trailing placeholder cells.
- Sort books within a day by `title`, then `id`, for stable stripes.
- Sort legend entries by first date in month, then title, then id.
- Use the fallback color when `book.coverColor` is missing.
- Keep all date math local-calendar based; output dates as
  `YYYY-MM-DD`.

### `src/lib/cover-color.ts`

Planned exports:

```ts
export const READING_CALENDAR_FALLBACK_COLOR = "#8a6f4d";

export function normalizeCoverColor(raw: unknown): string | undefined;
export function isCoverColor(value: string): boolean;
export function colorForBook(book: Book): string;
export async function extractDominantCoverColor(url: string): Promise<string | null>;
```

`extractDominantCoverColor` is allowed to return `null` for any image,
CORS, canvas, or decoding failure. It must not throw to form callers.

## 6. Storage adapter changes

No changes to `StorageAdapter`.

Existing methods carry the new optional fields:

- `listBooks()` returns records with or without the fields.
- `addBook(input)` stores `coverColor` if present.
- `updateBook(id, input)` stores `coverColor` and `readingDays`.
- `deleteBook(id)` naturally removes that book from the derived
  calendar.

`LocalStorageAdapter` remains unchanged except for any TypeScript compile
effects from the widened `BookInput` shape.

## 7. Decisions & trade-offs

- **Embedded `readingDays` over separate log entity.** Chosen because v1
  edits one book at a time and the existing app already embeds quotes.
  A separate log would help future analytics but would expand storage and
  state before the need exists.
- **Detail-page editing over calendar editing.** Chosen to keep the home
  calendar calm and display-only. Calendar editing can be a later spec.
- **Manual color as source of truth.** Chosen because remote cover images
  can fail CORS/canvas access. Auto extraction is helpful but not reliable
  enough to be the persistence model.
- **Stripes over blended color.** Chosen because stripes preserve the fact
  that multiple books were read. A blended color would be prettier in some
  cases but less explainable.
- **Current month over yearly heatmap.** Chosen because it gives the user
  an immediate, legible object with less empty space in early use.
- **No dependency.** Date and color helpers are small; adding date-fns or a
  color library would violate the constitution's dependency restraint.

## 8. Risks

- **Auto color extraction may be fragile.** Many cover URLs will not be
  canvas-readable. The implementation must treat extraction as optional
  and avoid scary errors.
- **BookForm may become too large.** It already owns many fields. If the
  color UI adds too much code, extract a small `CoverColorField` component
  under `src/components/` or a book-form feature folder.
- **Calendar styling can drift dashboard-like.** Keep the panel warm and
  quiet, avoid counters as primary content, and do not add streak/goal
  copy.
- **Testing "today" can be flaky.** Pure helpers accept `now?: Date`, and
  component tests should control timers or assert through injected dates
  where possible.
- **Date parsing can accidentally become UTC-based.** Helpers should
  construct local dates from `year/month/day` numbers and format
  `YYYY-MM-DD` manually, avoiding timezone conversions.

## 9. Rollout

- **Feature flag:** no.
- **Migration:** no. Existing books have no `readingDays` or `coverColor`;
  both are optional.
- **Implementation order:**
  1. Domain and validator updates, with tests.
  2. Pure calendar/color helpers, with tests.
  3. Book form cover color, with tests.
  4. Detail-page `ReadingDaysSection`, with tests.
  5. Home `ReadingCalendar`, with tests and visual QA.
- **Manual QA:**
  - Add a book with cover color and mark today.
  - Add a past reading date.
  - Mark the same date twice and confirm one entry.
  - Add two books on the same date and confirm stripes.
  - Navigate previous/next months.
  - Confirm a month with no logged days shows the cozy empty state.
  - Confirm invalid color shows an inline error.
  - Run `npm run lint` and `npm run test`.
