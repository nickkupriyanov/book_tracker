"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ReadingCalendarDay,
  type ReadingCalendarDayProps,
} from "./ReadingCalendarDay";
import { ReadingCalendarLegend } from "./ReadingCalendarLegend";
import {
  currentCalendarMonth,
  shiftCalendarMonth,
  buildReadingCalendarMonth,
  type CalendarMonth,
  type ReadingCalendarDayModel,
} from "@/lib/reading-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Book } from "@/types/book";

export interface ReadingCalendarProps {
  books: Book[];
}

/**
 * The home Reading Calendar (spec 013 D7 / §6.1, spec 020 §5.3).
 * Display-only: the panel renders the selected local month, lets
 * the user navigate previous/next months via icon buttons, and
 * shows day cells. When the visible month has no logged days,
 * the grid still renders and a small secondary empty message
 * appears below it (spec 020 FR-10 / FR-11).
 *
 * Visual direction is **Warm Shelf** — the panel uses the app's
 * theme tokens (`bg-card`, `text-card-foreground`, `border-border`,
 * `muted`, `primary`) instead of the previous isolated dark OKLCH
 * panel. Logged-day colors still come from each book's color, so
 * the day cells remain color-led; multi-book stripes still render
 * via the existing model.
 */
export function ReadingCalendar({ books }: ReadingCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    currentCalendarMonth()
  );

  const model = useMemo(
    () => buildReadingCalendarMonth(books, visibleMonth),
    [books, visibleMonth]
  );

  // Day-of-week for the first day of the month, used to position
  // the grid correctly. Sunday = 0, so add 1 for the CSS
  // `grid-column-start` value.
  const firstDayOfWeek = new Date(
    visibleMonth.year,
    visibleMonth.month,
    1
  ).getDay();

  return (
    <section
      aria-label="Reading Calendar"
      data-testid="reading-calendar"
      className="border-border bg-card text-card-foreground mb-6 rounded-lg border p-5"
    >
      <header className="mb-4 flex flex-col gap-3">
        <h2 className="text-foreground font-serif text-lg">Reading Calendar</h2>
        <div className="flex w-full items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibleMonth((m) => shiftCalendarMonth(m, -1))}
            aria-label="Previous month"
            data-testid="reading-calendar-prev"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span
            aria-live="polite"
            className="text-muted-foreground min-w-0 flex-1 text-center font-serif whitespace-nowrap"
            data-testid="reading-calendar-month-label"
          >
            {model.label}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibleMonth((m) => shiftCalendarMonth(m, 1))}
            aria-label="Next month"
            data-testid="reading-calendar-next"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <CalendarGrid days={model.days} firstDayOfWeek={firstDayOfWeek} />

      {!model.hasLoggedDays && (
        <p
          className="text-muted-foreground py-3 text-center text-xs"
          data-testid="reading-calendar-empty"
        >
          No reading days logged this month.
        </p>
      )}

      <ReadingCalendarLegend entries={model.legend} />
    </section>
  );
}

interface CalendarGridProps {
  days: ReadingCalendarDayModel[];
  firstDayOfWeek: number;
}

/**
 * Lays the days out in a 7-column grid, using
 * `grid-column-start` for the first day so weeks align
 * correctly. No leading/trailing placeholder cells in v1
 * (spec 013 plan §5 "reading-calendar.ts" rules) — empty
 * grid positions are simply left blank by CSS Grid auto-flow.
 *
 * The grid renders for every visible month (spec 020 FR-10),
 * even when the month has no logged days, so month shape and
 * navigation stay stable.
 */
function CalendarGrid({ days, firstDayOfWeek }: CalendarGridProps) {
  return (
    <div
      role="grid"
      aria-label="Days of the month"
      data-testid="reading-calendar-grid"
      className="grid grid-cols-7 gap-1"
    >
      {days.map((day, i) => (
        <div
          key={day.date}
          role="presentation"
          style={i === 0 ? { gridColumnStart: firstDayOfWeek + 1 } : undefined}
        >
          <ReadingCalendarDay day={day} />
        </div>
      ))}
    </div>
  );
}

// Re-export the day prop type so consumers / tests can build
// day models without importing the helper module directly.
export type { ReadingCalendarDayProps };
