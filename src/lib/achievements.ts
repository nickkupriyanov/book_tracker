/**
 * Reader achievements — static catalog, pure rule engine, and
 * sort/display helpers (spec 024).
 *
 * Everything in this module is deterministic and side-effect
 * free. The engine takes a `Book[]` and returns the set of
 * achievement IDs the user currently qualifies for. Timestamps
 * are assigned by the persistence/store layer, never here.
 */

import type { JSONContent } from "@tiptap/core";
import type { Book, ReadingLog } from "@/types/book";
import type {
  AchievementDefinition,
  AchievementId,
  AchievementUnlock,
} from "@/types/achievement";

/**
 * The eight v1 achievements, in catalog order. Catalog order is
 * the sort order for visible-locked and secret-locked cards.
 */
export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    id: "first-finished-book",
    title: "First steps",
    description: "You finished your very first book.",
    condition: "Mark a book as read.",
    icon: "first-book",
    secret: false,
  },
  {
    id: "five-finished-books",
    title: "Steady reader",
    description: "You finished five books.",
    condition: "Mark five books as read.",
    icon: "five-books",
    secret: false,
  },
  {
    id: "long-read",
    title: "Long read",
    description: "You finished a book of five hundred pages or more.",
    condition: "Finish a book with at least 500 pages.",
    icon: "long-read",
    secret: true,
  },
  {
    id: "first-quote",
    title: "Worth remembering",
    description: "You saved your first quote.",
    condition: "Save a quote on any book.",
    icon: "first-quote",
    secret: false,
  },
  {
    id: "first-review",
    title: "In your own words",
    description: "You wrote your first review.",
    condition: "Write a review on any book.",
    icon: "first-review",
    secret: false,
  },
  {
    id: "five-rated-books",
    title: "Trusted critic",
    description: "You rated five books.",
    condition: "Rate five books.",
    icon: "five-rated",
    secret: false,
  },
  {
    id: "seven-day-streak",
    title: "A week of reading",
    description: "You read on seven consecutive days.",
    condition: "Log reading on seven days in a row.",
    icon: "streak",
    secret: true,
  },
  {
    id: "thousand-pages",
    title: "Thousand pages",
    description: "You logged a thousand pages of reading.",
    condition: "Log a total of 1,000 pages read.",
    icon: "thousand-pages",
    secret: false,
  },
] as const;

export interface EvaluationResult {
  /** The set of achievement IDs the user currently qualifies for. */
  eligible: ReadonlySet<AchievementId>;
}

const FIVE_FINISHED_THRESHOLD = 5;
const FIVE_RATED_THRESHOLD = 5;
const LONG_READ_PAGE_THRESHOLD = 500;
const STREAK_THRESHOLD = 7;
const PAGES_THRESHOLD = 1000;

const KNOWN_IDS: ReadonlySet<AchievementId> = new Set(
  ACHIEVEMENT_CATALOG.map((entry) => entry.id),
);

/**
 * Evaluates the user's library against every achievement rule and
 * returns the set of eligible IDs. Pure: no storage, no clock, no
 * mutation. Invalid log entries (bad dates, non-positive pages)
 * are ignored; rich-review emptiness is detected via the existing
 * helper.
 */
export function evaluateAchievements(books: readonly Book[]): EvaluationResult {
  const eligible = new Set<AchievementId>();

  if (hasFirstFinishedBook(books)) eligible.add("first-finished-book");
  if (countFinishedBooks(books) >= FIVE_FINISHED_THRESHOLD) {
    eligible.add("five-finished-books");
  }
  if (hasLongRead(books)) eligible.add("long-read");
  if (hasFirstQuote(books)) eligible.add("first-quote");
  if (hasFirstReview(books)) eligible.add("first-review");
  if (countRatedBooks(books) >= FIVE_RATED_THRESHOLD) {
    eligible.add("five-rated-books");
  }
  if (hasSevenDayStreak(books)) eligible.add("seven-day-streak");
  if (sumLoggedPages(books) >= PAGES_THRESHOLD) eligible.add("thousand-pages");

  return { eligible };
}

export function hasFirstFinishedBook(books: readonly Book[]): boolean {
  for (const book of books) {
    if (book.status === "read") return true;
  }
  return false;
}

export function countFinishedBooks(books: readonly Book[]): number {
  let count = 0;
  for (const book of books) {
    if (book.status === "read") count += 1;
  }
  return count;
}

export function hasLongRead(books: readonly Book[]): boolean {
  for (const book of books) {
    if (book.status !== "read") continue;
    if (typeof book.totalPages !== "number") continue;
    if (!Number.isInteger(book.totalPages)) continue;
    if (book.totalPages < LONG_READ_PAGE_THRESHOLD) continue;
    return true;
  }
  return false;
}

export function hasFirstQuote(books: readonly Book[]): boolean {
  for (const book of books) {
    const quotes = book.quotes;
    if (!Array.isArray(quotes)) continue;
    for (const quote of quotes) {
      if (!quote || typeof quote !== "object") continue;
      if (typeof quote.text !== "string") continue;
      if (quote.text.trim() === "") continue;
      return true;
    }
  }
  return false;
}

export function hasFirstReview(books: readonly Book[]): boolean {
  for (const book of books) {
    if (isNonEmptyReview(book.review)) return true;
  }
  return false;
}

export function countRatedBooks(books: readonly Book[]): number {
  let count = 0;
  for (const book of books) {
    if (isRating(book.rating)) count += 1;
  }
  return count;
}

export function hasSevenDayStreak(books: readonly Book[]): boolean {
  return computeStreak(collectReadingDates(books)) >= STREAK_THRESHOLD;
}

export function sumLoggedPages(books: readonly Book[]): number {
  let total = 0;
  for (const book of books) {
    const logs = book.readingLogs;
    if (!Array.isArray(logs)) continue;
    for (const log of logs) {
      if (!isReadingLog(log)) continue;
      if (typeof log.pagesRead !== "number") continue;
      if (!Number.isFinite(log.pagesRead)) continue;
      if (log.pagesRead <= 0) continue;
      total += log.pagesRead;
    }
  }
  return total;
}

function collectReadingDates(books: readonly Book[]): Set<string> {
  const dates = new Set<string>();
  for (const book of books) {
    const logs = book.readingLogs;
    if (!Array.isArray(logs)) continue;
    for (const log of logs) {
      if (!isReadingLog(log)) continue;
      if (!isLocalDateString(log.date)) continue;
      dates.add(log.date);
    }
  }
  return dates;
}

function computeStreak(dates: ReadonlySet<string>): number {
  if (dates.size === 0) return 0;
  const sorted = Array.from(dates).sort((a, b) => a.localeCompare(b));
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1] as string;
    const curr = sorted[i] as string;
    if (isNextLocalDate(prev, curr)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

function isNextLocalDate(prev: string, next: string): boolean {
  const a = parseLocalDate(prev);
  const b = parseLocalDate(next);
  if (a === null || b === null) return false;
  const aTime = a.getTime();
  const bTime = b.getTime();
  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return false;
  const oneDayMs = 86_400_000;
  return bTime - aTime === oneDayMs;
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const [, y, m, d] = match as unknown as [string, string, string, string];
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function isLocalDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return parseLocalDate(value) !== null;
}

function isReadingLog(value: unknown): value is ReadingLog {
  if (typeof value !== "object" || value === null) return false;
  return "date" in value && "pagesRead" in value;
}

function isRating(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/**
 * Detects a non-empty review. Accepts plain string reviews (legacy)
 * and structured `Review` objects whose plain body or rich-text
 * content carries textual content. Uses a small walker over the
 * Tiptap JSON tree so we never rely on raw stringification.
 */
export function isNonEmptyReview(review: unknown): boolean {
  if (review === null || review === undefined) return false;
  if (typeof review === "string") return review.trim() !== "";
  if (typeof review !== "object") return false;
  const candidate = review as { format?: unknown; body?: unknown };
  if (candidate.format === "plain" && typeof candidate.body === "string") {
    return candidate.body.trim() !== "";
  }
  if (candidate.format === "rich" && candidate.body !== undefined) {
    return richContentHasText(candidate.body as JSONContent);
  }
  return false;
}

function richContentHasText(node: JSONContent | undefined): boolean {
  if (node === undefined || node === null) return false;
  if (typeof node.text === "string" && node.text.trim() !== "") return true;
  if (!Array.isArray(node.content)) return false;
  for (const child of node.content) {
    if (richContentHasText(child)) return true;
  }
  return false;
}

/**
 * Sorts unlocked achievements by `unlockedAt` descending (newest
 * first). Used by the home preview (3 latest) and the full
 * collection page (1st sort group).
 */
export function sortUnlocksByRecency(
  unlocks: readonly AchievementUnlock[],
): AchievementUnlock[] {
  return [...unlocks].sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
}

/**
 * Partitions the catalog into unlocked, visible-locked, and
 * secret-locked groups. Unlocked group is sorted by `unlockedAt`
 * desc; the other two groups keep catalog order.
 */
export interface AchievementGroups {
  unlocked: AchievementUnlock[];
  visibleLocked: AchievementDefinition[];
  secretLocked: AchievementDefinition[];
}

export function groupAchievements(
  unlocks: readonly AchievementUnlock[],
): AchievementGroups {
  const unlockedById = new Map<AchievementId, AchievementUnlock>();
  for (const unlock of unlocks) {
    if (!KNOWN_IDS.has(unlock.achievementId)) continue;
    const existing = unlockedById.get(unlock.achievementId);
    if (existing === undefined) {
      unlockedById.set(unlock.achievementId, unlock);
      continue;
    }
    if (unlock.unlockedAt.localeCompare(existing.unlockedAt) < 0) {
      unlockedById.set(unlock.achievementId, unlock);
    }
  }
  const unlockedSorted = sortUnlocksByRecency(Array.from(unlockedById.values()));
  const unlockedIds = new Set(unlockedSorted.map((u) => u.achievementId));
  const visibleLocked: AchievementDefinition[] = [];
  const secretLocked: AchievementDefinition[] = [];
  for (const def of ACHIEVEMENT_CATALOG) {
    if (unlockedIds.has(def.id)) continue;
    if (def.secret) secretLocked.push(def);
    else visibleLocked.push(def);
  }
  return { unlocked: unlockedSorted, visibleLocked, secretLocked };
}
