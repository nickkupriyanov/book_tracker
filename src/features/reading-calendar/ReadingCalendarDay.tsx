"use client";

import { cn } from "@/lib/utils";
import type { ReadingCalendarDayModel } from "@/lib/reading-calendar";

export interface ReadingCalendarDayProps {
  day: ReadingCalendarDayModel;
}

/**
 * A single day cell on the Reading Calendar (spec 013 D7 /
 * §6.2, spec 020 §5.3).
 *
 * - No books: muted warm fill using the app's `muted` and
 *   `border` tokens — sits in the warm theme instead of an
 *   isolated dark panel.
 * - One book: solid `book.color` background.
 * - Two or three books: CSS linear-gradient stripes (vertical
 *   slices) — preserves "multiple books on one day" without
 *   mixing colors.
 * - More than three books: same three-stripe rendering; the
 *   full list is exposed via `ariaLabel` / `title` (which
 *   the parent builds from the day model).
 *
 * Pure: no state, no store. The parent (ReadingCalendar) owns
 * the day model.
 */
export function ReadingCalendarDay({ day }: ReadingCalendarDayProps) {
  const style = stripeStyle(day.visibleColors);
  const hasBooks = day.books.length > 0;

  return (
    <div
      role="gridcell"
      aria-label={day.ariaLabel}
      title={day.title}
      data-testid="reading-calendar-day"
      data-date={day.date}
      data-logged={hasBooks ? "true" : "false"}
      className={cn(
        "relative aspect-square rounded-sm border text-xs",
        "flex items-end justify-end p-1",
        // Muted warm fill for empty days — uses the app theme
        // tokens instead of an inline dark color (spec 020 §5.3).
        !hasBooks && "border-border bg-muted",
      )}
      style={style}
    >
      <span
        className={cn(
          "leading-none",
          hasBooks ? "text-white" : "text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {day.dayOfMonth}
      </span>
    </div>
  );
}

/**
 * Builds the inline `style` for a day cell. Empty days get
 * `undefined` so the CSS class controls the background; logged
 * days get a multi-stop linear-gradient for stripes. The cell's
 * own border also comes from the CSS class, so we no longer
 * override it inline.
 */
function stripeStyle(colors: string[]): React.CSSProperties | undefined {
  if (colors.length === 0) return undefined;
  if (colors.length === 1) {
    return { backgroundColor: colors[0] };
  }
  // Equal-width vertical stripes. `to right` makes the first
  // color the leftmost slice, which matches the day model's
  // (title, id) order.
  const stops = colors
    .map((c, i) => {
      const start = (i / colors.length) * 100;
      const end = ((i + 1) / colors.length) * 100;
      return `${c} ${start.toFixed(2)}%, ${c} ${end.toFixed(2)}%`;
    })
    .join(", ");
  return { backgroundImage: `linear-gradient(to right, ${stops})` };
}
