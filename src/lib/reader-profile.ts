import type { Book, ReadingLog } from "@/types/book";

/**
 * Display-ready reader profile for the home rail card (spec 017).
 *
 * Pure presentation values derived from the already-loaded `Book[]`.
 * The card never persists anything; it just renders this model.
 */
export interface ReaderProfile {
  /** Fixed cozy nickname for the local MVP user. */
  nickname: string;
  /** Monogram for the avatar — uppercased initials of the nickname. */
  initials: string;
  /** Warm role-style copy, e.g. `Page wanderer`. */
  status: string;
  /** Books with `status === "read"`. */
  readCount: number;
  /** Current reading streak in unique local days. */
  streakDays: number;
  /** Sum of `readingLogs[].pagesRead` across every book. */
  totalPages: number;
}

export interface BuildReaderProfileOptions {
  /**
   * Local "now" date used to anchor the streak. Tests inject a
   * deterministic value; production callers should leave this
   * unset to use the current time.
   */
  now?: Date;
}

const NICKNAME = "Quiet Reader";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STREAK_FOR_STEADY = 7;
const READ_FOR_SEASONED = 10;

/**
 * Builds the display-ready reader profile from the current
 * library. Pure: no React, no storage, no DOM. Streak uses
 * local calendar dates and supports yesterday as the active
 * endpoint, so a reader who hasn't logged today still sees
 * their rhythm reflected (spec 017 FR-8).
 */
export function buildReaderProfile(
  books: Book[],
  options: BuildReaderProfileOptions = {}
): ReaderProfile {
  const now = options.now ?? new Date();

  const readCount = countReadBooks(books);
  const totalPages = sumLoggedPages(books);
  const streakDays = computeStreak(collectReadingDates(books), now);
  const status = pickStatus({ readCount, totalPages, streakDays });

  return {
    nickname: NICKNAME,
    initials: monogramFrom(NICKNAME),
    status,
    readCount,
    streakDays,
    totalPages,
  };
}

function countReadBooks(books: Book[]): number {
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

/**
 * Returns the unique set of local `YYYY-MM-DD` dates on which
 * the reader has any logged activity. After spec 022 only
 * `readingLogs` (spec 016) feed the streak — legacy
 * `readingDays` were removed from the domain.
 */
function collectReadingDates(books: Book[]): Set<string> {
  const dates = new Set<string>();

  for (const book of books) {
    if (!Array.isArray(book.readingLogs)) continue;
    for (const log of book.readingLogs) {
      if (!isReadingLog(log)) continue;
      if (!isLocalDateString(log.date)) continue;
      dates.add(log.date);
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

interface StatusInputs {
  readCount: number;
  totalPages: number;
  streakDays: number;
}

/**
 * Picks a warm role-style status from the reader's current
 * activity. Order matters: rhythm beats volume, volume beats
 * a quiet shelf, a quiet shelf beats a blank slate.
 */
function pickStatus({
  readCount,
  totalPages,
  streakDays,
}: StatusInputs): string {
  if (streakDays >= STREAK_FOR_STEADY) return "On a steady streak";
  if (readCount >= READ_FOR_SEASONED) return "Seasoned reader";
  if (totalPages > 0) return "Page wanderer";
  if (readCount >= 1) return "Shelf keeper";
  return "Quiet beginning";
}

function monogramFrom(nickname: string): string {
  const parts = nickname.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function isLocalDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!DATE_PATTERN.test(value)) return false;
  // Reject impossible calendar dates (e.g. `2026-02-31`).
  const [yStr, mStr, dStr] = value.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function isReadingLog(value: unknown): value is ReadingLog {
  if (typeof value !== "object" || value === null) return false;
  return "date" in value;
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
