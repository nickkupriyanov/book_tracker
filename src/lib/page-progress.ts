import type { Book, ReadingLog } from "@/types/book";

/**
 * Result of applying a target current-page save for a given
 * local date. Pure: no React, no storage, no DOM. The
 * orchestrating component turns this into a store update and
 * renders any error message.
 *
 * Spec 022 §3 / FR-4..FR-9.
 */
export type ApplyTargetPageResult =
  | {
      ok: true;
      /** Next readingLogs array (may be `undefined` when no log remains). */
      readingLogs: ReadingLog[] | undefined;
      /** Next currentPage value (carried as-is, used for derived progress). */
      currentPage: number | undefined;
    }
  | {
      ok: false;
      /** Stable machine-ish key: `"page" | "pageLimit" | "negativeDelta"`. */
      code: "page" | "pageLimit" | "negativeDelta";
      /** Human-readable message the UI can show inline. */
      message: string;
    };

/**
 * Local "now" date used to anchor target-page saves. Tests
 * inject a deterministic value; production callers should
 * leave this unset to use the current time.
 */
export interface ApplyTargetPageOptions {
  now?: Date;
  /** Stable id generator; defaults to `crypto.randomUUID`. */
  generateId?: () => string;
  /** ISO timestamp factory; defaults to `() => new Date().toISOString()`. */
  nowIso?: () => string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns the ordered chronological array of a book's page
 * logs (ascending by `date`). Logs with malformed dates are
 * dropped — they cannot contribute to derived current page
 * without breaking the "earlier date → smaller page" rule.
 *
 * Spec 022 §3 / FR-3.
 */
export function sortedReadingLogs(book: Book): ReadingLog[] {
  if (!Array.isArray(book.readingLogs)) return [];
  return book.readingLogs
    .filter((l): l is ReadingLog => isWellFormedLog(l))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Derives the current page from a book's ordered logs by
 * summing `pagesRead` across every log. Returns `null` when
 * the book has no logs. This is the authoritative source of
 * truth for the user's position — `Book.currentPage` is
 * kept in sync by writers, but downstream code should prefer
 * this helper.
 *
 * Spec 022 §3 / FR-3.
 */
export function deriveCurrentPageFromLogs(book: Book): number | null {
  const logs = sortedReadingLogs(book);
  if (logs.length === 0) return null;
  let total = 0;
  for (const log of logs) {
    total += log.pagesRead;
  }
  return total;
}

/**
 * Computes the pages already logged strictly before `targetDate`
 * for `book`. Used to figure out how many pages the user must
 * add on the target date so the total reaches the desired
 * current page.
 *
 * Logs whose `date` matches or follows `targetDate` are
 * excluded — they belong to the date being edited or a later
 * date, and counting them would make the delta on the target
 * date depend on edits the user has not yet made.
 */
export function pagesLoggedBefore(
  book: Book,
  targetDate: string,
): number {
  const logs = sortedReadingLogs(book);
  let total = 0;
  for (const log of logs) {
    if (log.date >= targetDate) continue;
    total += log.pagesRead;
  }
  return total;
}

/**
 * Applies a target current-page save for `targetDate` and
 * returns the next `readingLogs` and `currentPage`. Pure.
 *
 * Rules (spec 022 §3 / FR-6..FR-9):
 * - `targetCurrentPage === undefined` is a clear: removes the
 *   log for `targetDate` (if any) and returns `currentPage`
 *   as `undefined`.
 * - The new `pagesRead` for `targetDate` is
 *   `targetCurrentPage - pagesLoggedBefore(book, targetDate)`.
 * - When the delta is `<= 0`, returns `ok: false` with
 *   `code: "negativeDelta"` (spec 022 FR-8 / §9). The
 *   exception is `delta === 0`, which means "no pages read
 *   this date" and is treated as a clear.
 * - When the delta is `> 0` and exceeds `totalPages` (when
 *   known), returns `ok: false` with `code: "pageLimit"`
 *   (spec 022 FR-10).
 * - The resulting log carries the **synchronized**
 *   `currentPageAfter` (spec 022 §7) so old data stays
 *   self-describing.
 */
export function applyTargetCurrentPage(
  book: Book,
  targetDate: string,
  targetCurrentPage: number | undefined,
  options: ApplyTargetPageOptions = {},
): ApplyTargetPageResult {
  if (!isLocalDateString(targetDate)) {
    return {
      ok: false,
      code: "page",
      message: "Reading date must be a real YYYY-MM-DD date.",
    };
  }

  if (targetCurrentPage === undefined) {
    const next = book.readingLogs?.filter((l) => l.date !== targetDate) ?? [];
    return {
      ok: true,
      currentPage: undefined,
      readingLogs: next.length > 0 ? sortAndSyncLogs(next) : undefined,
    };
  }

  if (
    typeof targetCurrentPage !== "number" ||
    !Number.isInteger(targetCurrentPage) ||
    targetCurrentPage < 0
  ) {
    return {
      ok: false,
      code: "page",
      message: "Current page must be a whole number of 0 or more.",
    };
  }

  const pagesBefore = pagesLoggedBefore(book, targetDate);
  const delta = targetCurrentPage - pagesBefore;

  if (delta < 0) {
    return {
      ok: false,
      code: "negativeDelta",
      message:
        "That target is below pages already logged before this date. Edit earlier history in Page history to correct it.",
    };
  }

  if (delta === 0) {
    const next = book.readingLogs?.filter((l) => l.date !== targetDate) ?? [];
    return {
      ok: true,
      currentPage: targetCurrentPage,
      readingLogs: next.length > 0 ? sortAndSyncLogs(next) : undefined,
    };
  }

  if (
    book.totalPages !== undefined &&
    targetCurrentPage > book.totalPages
  ) {
    return {
      ok: false,
      code: "pageLimit",
      message: `Current page must be ${book.totalPages} or fewer.`,
    };
  }

  const generateId = options.generateId ?? defaultGenerateId;
  const nowIso = options.nowIso ?? defaultNowIso;
  const existing = book.readingLogs ?? [];
  const existingForDate = existing.find((l) => l.date === targetDate);
  const newLog: ReadingLog = {
    id: existingForDate?.id ?? generateId(),
    date: targetDate,
    pagesRead: delta,
    currentPageAfter: targetCurrentPage,
    createdAt: existingForDate?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  const without = existing.filter((l) => l.date !== targetDate);
  const next = sortAndSyncLogs([...without, newLog]);
  return {
    ok: true,
    currentPage: targetCurrentPage,
    readingLogs: next,
  };
}

/**
 * Replaces (or adds) a dated aggregate log entry by `pagesRead`
 * value rather than a target current page. Used by Page history
 * corrections: the user types "30 pages read" directly.
 *
 * Rules:
 * - `pagesRead === 0` removes the entry for `date` if present.
 * - `pagesRead` must be a positive whole number.
 * - Synchronizes `currentPageAfter` with the sum of pages logged
 *   on or before `date` so derived progress stays accurate.
 */
export type ApplyPagesReadResult =
  | { ok: true; readingLogs: ReadingLog[] | undefined }
  | {
      ok: false;
      code: "pagesRead" | "negativeProgress";
      message: string;
    };

export function applyPagesRead(
  book: Book,
  date: string,
  pagesRead: number,
  options: ApplyTargetPageOptions = {},
): ApplyPagesReadResult {
  if (!isLocalDateString(date)) {
    return {
      ok: false,
      code: "pagesRead",
      message: "Reading date must be a real YYYY-MM-DD date.",
    };
  }
  if (
    typeof pagesRead !== "number" ||
    !Number.isInteger(pagesRead) ||
    pagesRead < 0
  ) {
    return {
      ok: false,
      code: "pagesRead",
      message: "Pages read must be a whole number of 0 or more.",
    };
  }

  if (pagesRead === 0) {
    const next = (book.readingLogs ?? []).filter((l) => l.date !== date);
    return {
      ok: true,
      readingLogs: next.length > 0 ? sortAndSyncLogs(next) : undefined,
    };
  }

  // Compute current page as the sum of all logs ON OR BEFORE
  // the edited date, then write the new log for that date.
  const existing = book.readingLogs ?? [];
  const pagesBefore = existing
    .filter((l) => l.date < date)
    .reduce((sum, l) => sum + l.pagesRead, 0);
  const currentPageAfter = pagesBefore + pagesRead;
  const existingForDate = existing.find((l) => l.date === date);
  const generateId = options.generateId ?? defaultGenerateId;
  const nowIso = options.nowIso ?? defaultNowIso;
  const newLog: ReadingLog = {
    id: existingForDate?.id ?? generateId(),
    date,
    pagesRead,
    currentPageAfter,
    createdAt: existingForDate?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  const without = existing.filter((l) => l.date !== date);
  const next = sortAndSyncLogs([...without, newLog]);
  return { ok: true, readingLogs: next };
}

/**
 * Removes a single dated log entry. Returns the next
 * `readingLogs` (or `undefined` when no log remains).
 */
export function removeReadingLogForDate(
  book: Book,
  date: string,
): ReadingLog[] | undefined {
  const next = (book.readingLogs ?? []).filter((l) => l.date !== date);
  return next.length > 0 ? sortAndSyncLogs(next) : undefined;
}

/**
 * Sorts logs chronologically and rebuilds each entry's
 * `currentPageAfter` from the running sum so the stored
 * value always matches derived progress. Pure.
 */
function sortAndSyncLogs(logs: ReadingLog[]): ReadingLog[] {
  const sorted = logs
    .filter(isWellFormedLog)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  return sorted.map((log) => {
    running += log.pagesRead;
    return { ...log, currentPageAfter: running };
  });
}

function isWellFormedLog(value: unknown): value is ReadingLog {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ReadingLog>;
  return (
    typeof v.id === "string" &&
    typeof v.date === "string" &&
    typeof v.pagesRead === "number" &&
    Number.isInteger(v.pagesRead) &&
    v.pagesRead > 0
  );
}

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

function defaultGenerateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: timestamp+random — not RFC 4122 compliant but
  // unique enough for localStorage keying.
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultNowIso(): string {
  return new Date().toISOString();
}
