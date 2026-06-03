"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReadingStatus } from "@/types/book";

/** "all" or a specific reading status. */
export type FilterValue = "all" | ReadingStatus;

export interface ShelfFiltersProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

const TRIGGER_LABELS: Record<FilterValue, string> = {
  all: "All",
  want: "Want to read",
  reading: "Reading",
  read: "Read",
};

/**
 * Filter tabs above the shelf grid. Built on shadcn Tabs (controlled).
 * Counts in each label update reactively as books are added.
 */
export function ShelfFilters({ value, onChange, counts }: ShelfFiltersProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as FilterValue)}
    >
      <TabsList>
        {(Object.keys(TRIGGER_LABELS) as FilterValue[]).map((key) => (
          <TabsTrigger key={key} value={key}>
            {TRIGGER_LABELS[key]} ({counts[key]})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
