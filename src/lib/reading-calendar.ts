import type { Book } from "@/types/book";
import { colorForBook } from "./cover-color";

/**
 * A visible calendar month. `month` is 0-based to match `Date`.
 * Local-calendar dates only — never UTC (spec 013 D3).
 */
export interface CalendarMonth {
  year: number;
  month: number;
}

/**
 * A lightweight book reference for a single day cell or legend
 * entry. Carries just enough to render the cell color and the
 * accessible label.
 */
export interface ReadingCalendarBookRef {
  id: string;
  title: string;
  color: string;
}

/**
 * The display model for a single day in the visible month. Real
 * days only — the v1 calendar does not render leading / trailing
 * placeholders for the first/last week of the month.
 */
export interface ReadingCalendarDayModel {
  /** `YYYY-MM-DD` local date. */
  date: string;
  /** 1-based day of the visible month. */
  dayOfMonth: number;
  /** Books logged for this day, sorted by (title, id). */
  books: ReadingCalendarBookRef[];
  /**
   * Up to three colors to render in this cell. Days with one
   * or two books expose every book; days with four or more
   * expose the first three. The full title list is always
   * available via {@link ariaLabel} / {@link title}.
   */
  visibleColors: string[];
  /** Accessible label, e.g. `June 10, 2026 — Piranesi, Dune`. */
  ariaLabel: string;
  /** Same string as ariaLabel; used as the browser tooltip. */
  title: string;
}

/**
 * A visible-month legend entry. One per book with at least one
 * reading day in the visible month.
 */
export interface ReadingCalendarLegendEntry {
  bookId: string;
  title: string;
  color: string;
}

/**
 * The full display model for the home Reading Calendar.
 * Pure data — the React component decides how to render it.
 */
export interface ReadingCalendarMonthModel {
  /** Localized month label, e.g. `June 2026`. */
  label: string;
  /** One entry per real day in the visible month, ascending. */
  days: ReadingCalendarDayModel[];
  /**
   * Books with at least one reading day in the visible month,
   * sorted by (first date in month, title, id). Empty when the
   * month has no logged days.
   */
  legend: ReadingCalendarLegendEntry[];
  /** Convenience: at least one day has at least one book. */
  hasLoggedDays: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MAX_VISIBLE_COLORS = 3;

/**
 * Returns the current local calendar month. Accepts an optional
 * `now` for tests; defaults to `new Date()`.
 */
export function currentCalendarMonth(now?: Date): CalendarMonth {
  const d = now ?? new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Shifts a calendar month by `delta` months, wrapping across
 * year boundaries. Pure.
 */
export function shiftCalendarMonth(
  month: CalendarMonth,
  delta: number
): CalendarMonth {
  // Normalise to a 0-based month-of-era index, shift, then split
  // back. Avoids manual year/month branching for negative deltas.
  const total = month.year * 12 + month.month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Returns the number of days in the given local calendar month. */
function daysInMonth(year: number, month: number): number {
  // Day 0 of month N+1 is the last day of month N — a clean way to
  // ask "how many days in this month?" without manual month tables
  // or leap-year arithmetic.
  return new Date(year, month + 1, 0).getDate();
}

/** Formats a (year, month, day) as a `YYYY-MM-DD` string. */
function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Localized "Month YYYY" label for the calendar header. */
function formatLabel(year: number, month: number): string {
  const name = MONTH_NAMES[month] ?? "";
  return `${name} ${year}`;
}

/**
 * Builds the display model for the visible month. Pure: no DOM,
 * no React. Defensive against missing/invalid `readingDays` on
 * individual books (spec 013 §10).
 */
export function buildReadingCalendarMonth(
  books: Book[],
  month: CalendarMonth
): ReadingCalendarMonthModel {
  // First pass: collect every (date → book) pair, ignore dates
  // outside the visible month, and ignore books without valid
  // reading days. We work with string dates so the
  // lexicographic-chronological equivalence is preserved.
  const byDate = new Map<string, ReadingCalendarBookRef[]>();
  for (const book of books) {
    if (!Array.isArray(book.readingDays)) continue;
    for (const raw of book.readingDays) {
      if (typeof raw !== "string") continue;
      if (!raw.startsWith(`${month.year}-${String(month.month + 1).padStart(2, "0")}`)) {
        continue;
      }
      const list = byDate.get(raw) ?? [];
      list.push({ id: book.id, title: book.title, color: colorForBook(book) });
      byDate.set(raw, list);
    }
  }

  // Second pass: build the real days of the month in order.
  const total = daysInMonth(month.year, month.month);
  const days: ReadingCalendarDayModel[] = [];
  let hasLoggedDays = false;

  for (let day = 1; day <= total; day++) {
    const date = formatDate(month.year, month.month, day);
    const booksForDay = (byDate.get(date) ?? []).slice();
    // Stable sort by (title, id) for predictable stripes and
    // accessible labels across renders.
    booksForDay.sort((a, b) => {
      if (a.title !== b.title) return a.title.localeCompare(b.title);
      return a.id.localeCompare(b.id);
    });

    const visibleColors = booksForDay
      .slice(0, MAX_VISIBLE_COLORS)
      .map((b) => b.color);

    if (booksForDay.length > 0) hasLoggedDays = true;

    const ariaLabel = buildDayLabel(date, booksForDay);
    days.push({
      date,
      dayOfMonth: day,
      books: booksForDay,
      visibleColors,
      ariaLabel,
      title: ariaLabel,
    });
  }

  // Legend: unique books in the visible month, sorted by first
  // visible date, then title, then id.
  const seen = new Set<string>();
  const legendEntries: {
    bookId: string;
    firstDate: string;
    title: string;
    color: string;
  }[] = [];
  for (const day of days) {
    for (const book of day.books) {
      if (seen.has(book.id)) continue;
      seen.add(book.id);
      legendEntries.push({
        bookId: book.id,
        firstDate: day.date,
        title: book.title,
        color: book.color,
      });
    }
  }
  legendEntries.sort((a, b) => {
    if (a.firstDate !== b.firstDate) return a.firstDate.localeCompare(b.firstDate);
    if (a.title !== b.title) return a.title.localeCompare(b.title);
    return a.bookId.localeCompare(b.bookId);
  });
  const legend: ReadingCalendarLegendEntry[] = legendEntries.map((e) => ({
    bookId: e.bookId,
    title: e.title,
    color: e.color,
  }));

  return {
    label: formatLabel(month.year, month.month),
    days,
    legend,
    hasLoggedDays,
  };
}

/**
 * Composes the accessible label for a single day cell. Always
 * includes the full book title list — even when {@link ReadingCalendarDayModel.visibleColors}
 * is truncated to three.
 */
function buildDayLabel(
  date: string,
  books: ReadingCalendarBookRef[]
): string {
  if (books.length === 0) {
    return `${date} — No reading logged`;
  }
  const titles = books.map((b) => b.title).join(", ");
  return `${date} — ${titles}`;
}
