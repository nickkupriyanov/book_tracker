"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RatingStarsProps {
  /** Current rating (1-5). Absent means "not rated" → all 5 empty. */
  value?: 1 | 2 | 3 | 4 | 5;
  /** Called with the clicked star number. */
  onChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
  /** When true, all star buttons are non-interactive. */
  disabled?: boolean;
}

/**
 * A presentational row of 5 star buttons for book rating.
 * Stars 1..`value` are filled (solid icon, foreground
 * colour); the rest are empty (no fill, muted colour).
 * Click on star N calls `onChange(N)`. When `disabled`,
 * all buttons are non-interactive.
 *
 * Purely presentational — no store, no router. The parent
 * (RatingSection) owns the data and the `updateBook` call.
 */
export function RatingStars({
  value,
  onChange,
  disabled,
}: RatingStarsProps) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const filled = value !== undefined && n <= value;
        return (
          <Button
            key={n}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(n)}
            disabled={disabled}
            aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}
            data-testid={`rating-star-${n}`}
            className={
              filled
                ? "text-foreground"
                : "text-muted-foreground"
            }
          >
            <Star
              className={`size-5 ${
                filled ? "fill-current" : "fill-none"
              }`}
            />
          </Button>
        );
      })}
    </div>
  );
}
