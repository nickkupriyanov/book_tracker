import type { Book } from "@/types/book";

export interface DerivedReadingDates {
  startedAt: string | null;
  finishedAt: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Derives reading dates from page logs. Legacy stored date fields
 * are intentionally ignored; page logs are the source of truth.
 */
export function deriveReadingDates(book: Book): DerivedReadingDates {
  const dates = (book.readingLogs ?? [])
    .map((log) => log.date)
    .filter(isLocalDateString)
    .sort((a, b) => a.localeCompare(b));

  if (dates.length === 0) {
    return { startedAt: null, finishedAt: null };
  }

  return {
    startedAt: dates[0] ?? null,
    finishedAt: book.status === "read" ? dates[dates.length - 1] ?? null : null,
  };
}

export function isLocalDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}
