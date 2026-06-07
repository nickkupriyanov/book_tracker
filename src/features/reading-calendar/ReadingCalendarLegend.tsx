"use client";

import { cn } from "@/lib/utils";
import type { ReadingCalendarLegendEntry } from "@/lib/reading-calendar";

export interface ReadingCalendarLegendProps {
  entries: ReadingCalendarLegendEntry[];
}

/**
 * The visible-month book legend (spec 013 §6.3). One row per
 * book: a small color swatch and the book title. The parent
 * decides whether to render the legend at all (omit when the
 * visible month has no logged days).
 *
 * Swatches are square, book-like (slightly taller than wide)
 * rather than circular pills, to keep the visual language in
 * the family of "small book covers". The `role="list"` is
 * paired with `role="listitem"` on each row so screen readers
 * announce the structure even though the markup is `<ul>` /
 * `<li>` already — the explicit roles guard against future
 * markup refactors that swap the tag.
 */
export function ReadingCalendarLegend({ entries }: ReadingCalendarLegendProps) {
  if (entries.length === 0) return null;
  return (
    <ul
      role="list"
      aria-label="Books in this month"
      data-testid="reading-calendar-legend"
      className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
    >
      {entries.map((entry) => (
        <li
          key={entry.bookId}
          role="listitem"
          data-testid="reading-calendar-legend-item"
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            data-testid="reading-calendar-legend-swatch"
            className={cn("inline-block h-3.5 w-2.5 rounded-sm border")}
            style={{
              backgroundColor: entry.color,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          />
          <span style={{ color: "oklch(0.92 0.01 60)" }}>{entry.title}</span>
        </li>
      ))}
    </ul>
  );
}
