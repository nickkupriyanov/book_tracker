/**
 * Format a "Read over …" string for a pair of YYYY-MM-DD dates
 * shown on the detail page. Pure: no React, no DOM. Caller
 * guarantees `startedAt <= finishedAt` (the form / validator
 * boundary enforces this — spec 012 FR-2).
 *
 * Format rules (spec 012 D9 / FR-8):
 *   - same day or 1 day  → `"a day"`
 *   - 2-7 days           → `"N days"`
 *   - 8-30 days          → `"N weeks"` (rounded down)
 *   - 31+ days           → `"N months"` (rounded to nearest whole
 *                          month using a 30.4375-day average)
 *
 * Examples:
 *   formatReadingDuration("2026-04-01", "2026-04-01") === "a day"
 *   formatReadingDuration("2026-04-01", "2026-04-09") === "1 week"
 *   formatReadingDuration("2026-01-01", "2026-02-01") === "1 month"
 *
 * `Date.UTC` is used for the day diff so the math is timezone-
 * independent. The strings are sliced (not `Date(string)`-parsed)
 * to avoid the local-midnight rollover that `new Date("YYYY-MM-DD")`
 * exhibits in some environments.
 */
const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH_AVG = 365.25 / 12; // 30.4375

function toUtcMidnightMs(yyyyMmDd: string): number {
  const year = Number(yyyyMmDd.slice(0, 4));
  const month = Number(yyyyMmDd.slice(5, 7)) - 1; // 0-indexed
  const day = Number(yyyyMmDd.slice(8, 10));
  return Date.UTC(year, month, day);
}

export function formatReadingDuration(
  startedAt: string,
  finishedAt: string
): string {
  const startMs = toUtcMidnightMs(startedAt);
  const endMs = toUtcMidnightMs(finishedAt);
  const days = Math.round((endMs - startMs) / MS_PER_DAY);

  if (days <= 1) return "a day";
  if (days <= 7) return `${days} days`;
  const weeks = Math.floor(days / DAYS_PER_WEEK);
  if (days <= 30) return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  const months = Math.round(days / DAYS_PER_MONTH_AVG);
  return `${months} ${months === 1 ? "month" : "months"}`;
}
