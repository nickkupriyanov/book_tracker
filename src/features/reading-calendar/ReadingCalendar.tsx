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
 * The home Reading Calendar (spec 013 D7 / §6.1). Display-only
 * in v1: the panel renders the current local month, lets the
 * user navigate previous/next months via icon buttons, and
 * shows day cells + a legend or a cozy empty state.
 *
 * Visual direction is **Ink Shelf** — a warm dark panel with
 * compact square day cells, no dashboard metrics, no glass,
 * no oversized hero. Editing happens on the book detail page
 * (see `ReadingDaysSection`); this component owns nothing but
 * the visible month.
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
      className="mb-6 rounded-lg p-5"
      style={{
        backgroundColor: "oklch(0.25 0.02 50)",
        color: "oklch(0.95 0.01 60)",
      }}
    >
      <header className="mb-4 flex flex-col gap-3">
        <h2 className="font-serif text-lg" style={{ color: "oklch(0.95 0.01 60)" }}>
          Reading Calendar
        </h2>
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
            className="min-w-0 flex-1 text-center font-serif whitespace-nowrap"
            data-testid="reading-calendar-month-label"
            style={{ color: "oklch(0.85 0.01 60)" }}
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

      {model.hasLoggedDays ? (
        <CalendarGrid
          days={model.days}
          firstDayOfWeek={firstDayOfWeek}
        />
      ) : (
        <p
          className="py-6 text-center text-sm"
          data-testid="reading-calendar-empty"
          style={{ color: "oklch(0.7 0.02 50)" }}
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
