import type { Book } from "@/types/book";
import { deriveReadingDates } from "@/lib/reading-dates";

/**
 * The seven sort modes the shelf supports. Discriminated string
 * union so a `<Select>` value is type-checked end-to-end
 * (spec 012 D5). Default in `ShelfList` is `"recently-added"`,
 * which is equivalent to the store-level `sortByCreatedAtDesc`
 * invariant (spec D12).
 */
export type SortValue =
  | "recently-added"
  | "recently-started"
  | "recently-finished"
  | "title-az"
  | "author-az"
  | "highest-rated"
  | "longest-read";

/** User-facing labels, in the canonical order shown in `<ShelfSort>`. */
export const SORT_LABELS: Record<SortValue, string> = {
  "recently-added": "Recently added",
  "recently-started": "Recently started",
  "recently-finished": "Recently finished",
  "title-az": "Title (A→Z)",
  "author-az": "Author (A→Z)",
  "highest-rated": "Highest rated",
  "longest-read": "Longest read",
};

const MS_PER_DAY = 86_400_000;
const NO_VALUE = -1; // sentinel for nulls-last sorts
const UNRATED = -1; // sentinel for missing rating

function toUtcMidnightMs(yyyyMmDd: string): number {
  const year = Number(yyyyMmDd.slice(0, 4));
  const month = Number(yyyyMmDd.slice(5, 7)) - 1;
  const day = Number(yyyyMmDd.slice(8, 10));
  return Date.UTC(year, month, day);
}

function readDurationDays(book: Book): number {
  const { startedAt, finishedAt } = deriveReadingDates(book);
  if (startedAt === null || finishedAt === null) {
    return NO_VALUE;
  }
  const startMs = toUtcMidnightMs(startedAt);
  const endMs = toUtcMidnightMs(finishedAt);
  return Math.round((endMs - startMs) / MS_PER_DAY);
}

/**
 * Pure, non-mutating, stable. Comparator table per
 * spec 012 FR-5 / D5 / D6 / D8 / D9. Nulls-last for every
 * sort that involves an optional field. Returns a new
 * array (the input is never touched).
 */
export function sortBooks(books: Book[], sort: SortValue): Book[] {
  const sorted = [...books];
  sorted.sort((a, b) => {
    switch (sort) {
      case "recently-added":
        // createdAt is always present, so no nulls-last.
        return b.createdAt.localeCompare(a.createdAt);

      case "recently-started": {
        const av = deriveReadingDates(a).startedAt;
        const bv = deriveReadingDates(b).startedAt;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv.localeCompare(av);
      }

      case "recently-finished": {
        const av = deriveReadingDates(a).finishedAt;
        const bv = deriveReadingDates(b).finishedAt;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv.localeCompare(av);
      }

      case "title-az":
        return a.title.localeCompare(b.title);

      case "author-az":
        return a.author.localeCompare(b.author);

      case "highest-rated": {
        const av = a.rating ?? UNRATED;
        const bv = b.rating ?? UNRATED;
        return bv - av;
      }

      case "longest-read":
        return readDurationDays(b) - readDurationDays(a);
    }
  });
  return sorted;
}
