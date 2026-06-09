import type { Book } from "@/types/book";
import type { AnnualReadingChallenge } from "@/types/challenge";
import { deriveReadingDates, isLocalDateString } from "@/lib/reading-dates";

/**
 * The display model for the yearly reading challenge card
 * (spec 018). Pure presentation values derived from the
 * already-loaded `Book[]` and the saved challenge setting.
 *
 * The card never persists anything; it just renders this
 * model. The `state` field is the UI's routing key — it tells
 * the card which of the four documented UX states to render
 * (setup / empty / in-progress / complete), keeping the
 * component dumb and the helper easy to test in isolation.
 */
export interface YearlyChallengeModel {
  /** Local calendar year the model applies to (e.g. `2026`). */
  year: number;
  /** `null` when no target has been saved for this year. */
  target: number | null;
  /** Books finished in the current year with `status === "read"`. */
  completed: number;
  /** `completed / target * 100`, rounded, capped at 100 (FR-9). */
  progressPercent: number;
  /** `target - completed` when below target, else `null` (FR-10). */
  remaining: number | null;
  /** `completed >= target`. */
  isComplete: boolean;
  /** `completed > target`. */
  isExceeded: boolean;
  /** Soft pace classification; `null` for setup / empty / complete. */
  pace: "ahead" | "on" | "behind" | null;
  /** Read books missing a valid `finishedAt` (explains low progress). */
  undatedReadCount: number;
  /** The UI state to render — see plan §4 "Component breakdown". */
  state: "setup" | "empty" | "in-progress" | "complete";
}

export interface BuildYearlyChallengeOptions {
  /**
   * Local "now" date used to anchor the year and the pace math.
   * Tests inject a deterministic value; production callers
   * should leave this unset to use the current time.
   */
  now?: Date;
}

/**
 * Builds the display-ready yearly reading challenge model
 * (spec 018). Pure: no React, no storage, no DOM. Counts
 * only `read` books with a derived valid `YYYY-MM-DD` finish date
 * in the current local year (FR-5/6/7).
 */
export function buildYearlyChallenge(
  books: Book[],
  challenge: AnnualReadingChallenge | null,
  options: BuildYearlyChallengeOptions = {}
): YearlyChallengeModel {
  const now = options.now ?? new Date();
  const year = now.getFullYear();

  const completed = countCompletedInYear(books, year);
  const undatedReadCount = countUndatedRead(books);
  const target = challenge?.targetBooks ?? null;

  const isComplete = target !== null && completed >= target;
  const isExceeded = target !== null && completed > target;
  const progressPercent = computeProgressPercent(completed, target);
  const remaining =
    target !== null && !isComplete ? target - completed : null;

  const state = pickState(target, completed);
  const pace =
    state === "in-progress" && target !== null
      ? classifyPace(completed, target, now)
      : null;

  return {
    year,
    target,
    completed,
    progressPercent,
    remaining,
    isComplete,
    isExceeded,
    pace,
    undatedReadCount,
    state,
  };
}

function countCompletedInYear(books: Book[], year: number): number {
  let count = 0;
  for (const book of books) {
    if (book.status !== "read") continue;
    const { finishedAt } = deriveReadingDates(book);
    if (!isLocalDateString(finishedAt)) continue;
    const [yStr] = finishedAt.split("-");
    if (Number(yStr) !== year) continue;
    count += 1;
  }
  return count;
}

function countUndatedRead(books: Book[]): number {
  let count = 0;
  for (const book of books) {
    if (book.status !== "read") continue;
    if (isLocalDateString(deriveReadingDates(book).finishedAt)) continue;
    count += 1;
  }
  return count;
}

function pickState(
  target: number | null,
  completed: number
): YearlyChallengeModel["state"] {
  if (target === null) return "setup";
  if (completed >= target) return "complete";
  if (completed === 0) return "empty";
  return "in-progress";
}

function computeProgressPercent(
  completed: number,
  target: number | null
): number {
  if (target === null || target <= 0) return 0;
  const raw = (completed / target) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Soft pace classification. The expected progress is
 * `target * (elapsedDays / totalDays)`, rounded to the
 * nearest whole book. We compare the actual `completed`
 * count against the rounded expectation:
 *
 * - `+1` above → "ahead" of pace
 * - within 0 → "on" pace
 * - below → "behind" (still soft, no exact deltas)
 *
 * Day 1 of any year yields an expected value of 0, so any
 * single finished book is "ahead" — and zero progress is
 * "on" (which is why the `empty` state suppresses pace).
 */
function classifyPace(
  completed: number,
  target: number,
  now: Date
): "ahead" | "on" | "behind" {
  if (target <= 0) return "on";
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);
  const msElapsed = now.getTime() - startOfYear.getTime();
  const msTotal = nextYear.getTime() - startOfYear.getTime();
  if (msTotal <= 0) return "on";
  const expected = Math.round(target * (msElapsed / msTotal));
  if (completed >= expected + 1) return "ahead";
  if (completed >= expected) return "on";
  return "behind";
}
