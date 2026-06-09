import type { Book, ReadingLog } from "@/types/book";

/**
 * Display model for the whole-library Reader Portrait (spec 021).
 *
 * Pure presentation values derived from the already-loaded `Book[]`.
 * The stats page never persists anything; it just renders this
 * model. Every value has a clear, named contract so the UI can
 * decide what to render in each section — including sparse and
 * empty states.
 */
export interface ReaderStats {
  /** Hero metrics shown at the top of the stats page. */
  hero: ReaderStatsHero;
  /** Tags ranked by usage across the whole library. */
  favoriteTags: FavoriteTag[];
  /** Up to five highest-rated books with stable tie-breakers. */
  topRated: TopRatedBook[];
  /** Reading rhythm facts: streak, logged pages, best day. */
  rhythm: ReaderStatsRhythm;
  /** Quiet counts of want/reading/read books. */
  shelf: ReaderStatsShelf;
  /**
   * Convenience flag the UI can use to switch to a quiet
   * empty portrait: `true` when the library has zero books.
   */
  isEmpty: boolean;
}

export interface ReaderStatsHero {
  /** Books with `status === "read"`. */
  readCount: number;
  /** Sum of `readingLogs[].pagesRead` across every book. */
  loggedPages: number;
  /**
   * Mean of every `rating` on a rated book, rounded to one
   * decimal. `null` when no books are rated (FR-4).
   */
  averageRating: number | null;
  /** Current reading streak in unique local days. */
  streakDays: number;
  /**
   * Top tag label across the whole library. `null` when no
   * book carries any tag (FR-5, FR-3).
   */
  topTag: string | null;
  /**
   * `true` when the library has at least one book, no
   * ratings, and no tag — the page can hint at what would
   * enrich the portrait.
   */
  hasSparseData: boolean;
}

export interface FavoriteTag {
  label: string;
  count: number;
}

export interface TopRatedBook {
  id: string;
  title: string;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Local `YYYY-MM-DD` finished date, or `null` if absent. */
  finishedAt: string | null;
}

export interface ReaderStatsRhythm {
  /** Current reading streak in unique local days. */
  streakDays: number;
  /** Distinct local dates the reader has logged activity on. */
  activeDays: number;
  /** Sum of `readingLogs[].pagesRead` across every book. */
  loggedPages: number;
  /**
   * The single day with the largest sum of `pagesRead`. `null`
   * when no `readingLogs` exist (FR-8).
   */
  bestDay: BestDay | null;
  /**
   * `true` when the reader has logged legacy `readingDays` but
   * no `readingLogs.pagesRead` values. The page replaces
   * page-based facts with gentle empty copy in that case (FR-9).
   */
  hasLegacyDaysOnly: boolean;
}

export interface BestDay {
  /** Local `YYYY-MM-DD` date. */
  date: string;
  /** Sum of `pagesRead` for that day across all books. */
  pagesRead: number;
}

export interface ReaderStatsShelf {
  want: number;
  reading: number;
  read: number;
  /** `want + reading + read`. */
  total: number;
}

export interface BuildReaderStatsOptions {
  /**
   * Local "now" date used to anchor the streak. Tests inject a
   * deterministic value; production callers should leave this
   * unset to use the current time.
   */
  now?: Date;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Builds the whole-library Reader Portrait display model. Pure:
 * no React, no storage, no DOM. Uses both `readingLogs` and
 * legacy `readingDays` for the streak and active-day set
 * (FR-7, FR-9). Tag and rating tie-breakers are deterministic
 * (FR-5, FR-6).
 */
export function buildReaderStats(
  books: Book[],
  options: BuildReaderStatsOptions = {}
): ReaderStats {
  const now = options.now ?? new Date();

  const hero = buildHero(books, now);
  const favoriteTags = buildFavoriteTags(books);
  const topRated = buildTopRated(books);
  const rhythm = buildRhythm(books, now);
  const shelf = buildShelf(books);

  return {
    hero,
    favoriteTags,
    topRated,
    rhythm,
    shelf,
    isEmpty: books.length === 0,
  };
}

function buildHero(books: Book[], now: Date): ReaderStatsHero {
  const readCount = countRead(books);
  const loggedPages = sumLoggedPages(books);
  const averageRating = computeAverageRating(books);
  const dates = collectReadingDates(books);
  const streakDays = computeStreak(dates, now);
  const tagCounts = countTags(books);
  const topTag = pickTopTag(tagCounts);

  const hasSparseData =
    books.length > 0 && averageRating === null && topTag === null;

  return {
    readCount,
    loggedPages,
    averageRating,
    streakDays,
    topTag,
    hasSparseData,
  };
}

function buildFavoriteTags(books: Book[]): FavoriteTag[] {
  const counts = countTags(books);
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
}

function buildTopRated(books: Book[]): TopRatedBook[] {
  const rated: TopRatedBook[] = [];
  for (const book of books) {
    const rating = book.rating;
    if (!isRating(rating)) continue;
    rated.push({
      id: book.id,
      title: book.title,
      author: book.author,
      rating,
      finishedAt: isLocalDateString(book.finishedAt) ? book.finishedAt : null,
    });
  }

  rated.sort((a, b) => {
    if (a.rating !== b.rating) return b.rating - a.rating;
    const fa = a.finishedAt ?? "";
    const fb = b.finishedAt ?? "";
    if (fa !== fb) return fb.localeCompare(fa);
    const ca = lookupCreatedAt(books, a.id);
    const cb = lookupCreatedAt(books, b.id);
    if (ca !== cb) return cb.localeCompare(ca);
    return a.title.localeCompare(b.title);
  });

  return rated.slice(0, 5);
}

function buildRhythm(books: Book[], now: Date): ReaderStatsRhythm {
  const dates = collectReadingDates(books);
  const loggedPages = sumLoggedPages(books);
  const bestDay = pickBestDay(books);
  const streakDays = computeStreak(dates, now);
  const hasLegacyDaysOnly = hasLegacyDays(books) && !hasAnyPageLog(books);

  return {
    streakDays,
    activeDays: dates.size,
    loggedPages,
    bestDay,
    hasLegacyDaysOnly,
  };
}

function buildShelf(books: Book[]): ReaderStatsShelf {
  let want = 0;
  let reading = 0;
  let read = 0;
  for (const book of books) {
    if (book.status === "want") want += 1;
    else if (book.status === "reading") reading += 1;
    else if (book.status === "read") read += 1;
  }
  return { want, reading, read, total: want + reading + read };
}

function countRead(books: Book[]): number {
  let count = 0;
  for (const book of books) {
    if (book.status === "read") count += 1;
  }
  return count;
}

function sumLoggedPages(books: Book[]): number {
  let total = 0;
  for (const book of books) {
    if (!Array.isArray(book.readingLogs)) continue;
    for (const log of book.readingLogs) {
      if (!isReadingLog(log)) continue;
      if (typeof log.pagesRead !== "number") continue;
      if (!Number.isFinite(log.pagesRead)) continue;
      if (log.pagesRead <= 0) continue;
      total += log.pagesRead;
    }
  }
  return total;
}

function computeAverageRating(books: Book[]): number | null {
  let sum = 0;
  let count = 0;
  for (const book of books) {
    if (!isRating(book.rating)) continue;
    sum += book.rating;
    count += 1;
  }
  if (count === 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

function countTags(books: Book[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const book of books) {
    if (!Array.isArray(book.tags)) continue;
    for (const tag of book.tags) {
      if (typeof tag !== "string") continue;
      const trimmed = tag.trim();
      if (trimmed === "") continue;
      counts[trimmed] = (counts[trimmed] ?? 0) + 1;
    }
  }
  return counts;
}

function pickTopTag(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  return entries[0]?.[0] ?? null;
}

function pickBestDay(books: Book[]): BestDay | null {
  const totals = new Map<string, number>();
  for (const book of books) {
    if (!Array.isArray(book.readingLogs)) continue;
    for (const log of book.readingLogs) {
      if (!isReadingLog(log)) continue;
      if (!isLocalDateString(log.date)) continue;
      if (typeof log.pagesRead !== "number") continue;
      if (!Number.isFinite(log.pagesRead)) continue;
      if (log.pagesRead <= 0) continue;
      totals.set(log.date, (totals.get(log.date) ?? 0) + log.pagesRead);
    }
  }
  if (totals.size === 0) return null;

  let bestDate: string | null = null;
  let bestPages = -1;
  for (const [date, pages] of totals) {
    if (pages > bestPages) {
      bestPages = pages;
      bestDate = date;
      continue;
    }
    if (pages === bestPages && bestDate !== null && date < bestDate) {
      bestDate = date;
    }
  }
  if (bestDate === null || bestPages < 0) return null;
  return { date: bestDate, pagesRead: bestPages };
}

function hasLegacyDays(books: Book[]): boolean {
  for (const book of books) {
    if (!Array.isArray(book.readingDays)) continue;
    for (const raw of book.readingDays) {
      if (isLocalDateString(raw)) return true;
    }
  }
  return false;
}

function hasAnyPageLog(books: Book[]): boolean {
  for (const book of books) {
    if (!Array.isArray(book.readingLogs)) continue;
    for (const log of book.readingLogs) {
      if (!isReadingLog(log)) continue;
      if (typeof log.pagesRead !== "number") continue;
      if (!Number.isFinite(log.pagesRead)) continue;
      if (log.pagesRead > 0) return true;
    }
  }
  return false;
}

function collectReadingDates(books: Book[]): Set<string> {
  const dates = new Set<string>();
  for (const book of books) {
    if (Array.isArray(book.readingLogs)) {
      for (const log of book.readingLogs) {
        if (!isReadingLog(log)) continue;
        if (!isLocalDateString(log.date)) continue;
        dates.add(log.date);
      }
    }
    if (Array.isArray(book.readingDays)) {
      for (const raw of book.readingDays) {
        if (!isLocalDateString(raw)) continue;
        dates.add(raw);
      }
    }
  }
  return dates;
}

/**
 * Walks back day-by-day from today (or yesterday, if today is
 * empty) and counts how many consecutive local dates appear in
 * `dates`. Returns 0 when the most recent activity is older
 * than yesterday.
 */
function computeStreak(dates: Set<string>, now: Date): number {
  if (dates.size === 0) return 0;

  const today = formatLocalDate(now);
  const yesterday = formatLocalDate(shiftDays(now, -1));

  let anchor: Date;
  if (dates.has(today)) {
    anchor = startOfLocalDay(now);
  } else if (dates.has(yesterday)) {
    anchor = startOfLocalDay(shiftDays(now, -1));
  } else {
    return 0;
  }

  let streak = 0;
  let cursor = anchor;
  while (dates.has(formatLocalDate(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

function lookupCreatedAt(books: Book[], id: string): string {
  for (const book of books) {
    if (book.id === id) return book.createdAt;
  }
  return "";
}

function isRating(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isReadingLog(value: unknown): value is ReadingLog {
  if (typeof value !== "object" || value === null) return false;
  return "date" in value;
}

/**
 * Defensive `YYYY-MM-DD` validator. Rejects non-strings, wrong
 * shapes, and impossible calendar dates (e.g. `2026-02-31`).
 * Mirrors the rule used by `reader-profile.ts` and
 * `yearly-reading-challenge.ts`.
 */
function isLocalDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!DATE_PATTERN.test(value)) return false;
  const [yStr, mStr, dStr] = value.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function shiftDays(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

function formatLocalDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
