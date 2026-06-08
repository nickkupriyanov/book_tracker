"use client";

import type { ReaderStatsShelf } from "@/lib/reader-stats";

export interface ShelfBalanceSectionProps {
  shelf: ReaderStatsShelf;
}

interface ShelfSlice {
  key: keyof ReaderStatsShelf;
  label: string;
  description: string;
}

const SLICES: ShelfSlice[] = [
  {
    key: "want",
    label: "Want to read",
    description: "On the to-read pile",
  },
  {
    key: "reading",
    label: "Reading",
    description: "Currently in progress",
  },
  {
    key: "read",
    label: "Read",
    description: "Finished and shelved",
  },
];

/**
 * The shelf-balance section. Quiet counters for `want`,
 * `reading`, and `read`, plus a small stacked bar that hints
 * at the ratio without becoming a chart (FR-10, plan §6
 * "compact counters and shelf strips over charts").
 */
export function ShelfBalanceSection({ shelf }: ShelfBalanceSectionProps) {
  return (
    <section
      aria-label="Shelf balance"
      data-testid="stats-shelf"
      className="rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg text-foreground">Shelf balance</h2>
        <span
          data-testid="stats-shelf-total"
          className="text-muted-foreground text-xs tabular-nums"
        >
          {shelf.total} {shelf.total === 1 ? "book" : "books"}
        </span>
      </header>

      <ShelfBar shelf={shelf} />

      <ul className="mt-4 space-y-2">
        {SLICES.map((slice) => {
          const count = shelf[slice.key];
          return (
            <li
              key={slice.key}
              data-testid="stats-shelf-row"
              data-shelf-key={slice.key}
              data-shelf-count={count}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {slice.label}
                </p>
                <p className="text-muted-foreground text-xs">
                  {slice.description}
                </p>
              </div>
              <span
                data-testid="stats-shelf-count"
                className="text-foreground font-serif text-base tabular-nums"
              >
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ShelfBar({ shelf }: { shelf: ReaderStatsShelf }) {
  if (shelf.total === 0) {
    return (
      <div
        data-testid="stats-shelf-bar-empty"
        className="bg-muted text-muted-foreground rounded-md border border-dashed border-border px-3 py-4 text-center text-xs italic"
      >
        Once you add a book, the shelf starts taking shape.
      </div>
    );
  }

  return (
    <div
      data-testid="stats-shelf-bar"
      role="img"
      aria-label={`${shelf.want} want, ${shelf.reading} reading, ${shelf.read} read`}
      className="bg-muted flex h-3 w-full overflow-hidden rounded-full border border-border"
    >
      {SLICES.map((slice) => {
        const count = shelf[slice.key];
        if (count === 0) return null;
        const pct = (count / shelf.total) * 100;
        return (
          <div
            key={slice.key}
            data-shelf-segment={slice.key}
            className={SHELF_BAR_CLASS[slice.key]}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

const SHELF_BAR_CLASS: Record<keyof ReaderStatsShelf, string> = {
  want: "bg-amber-300/70",
  reading: "bg-sky-300/70",
  read: "bg-emerald-300/70",
  total: "",
};
