"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_LABELS, type SortValue } from "@/lib/shelf-sort";

export interface ShelfSortProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
}

/**
 * The shelf sort menu. A thin shadcn `<Select>` wrapper that
 * drives `sortBooks` (spec 012 T2) from the seven `SortValue`
 * discriminators. Dumb / presentational — the parent
 * (`ShelfList`) owns the state. The trigger shows the
 * current label as its own text; no placeholder, no icon.
 *
 * Placed between `<ShelfFilters>` and `<ShelfTagFilter>` in
 * the shelf layout (spec 012 D10), right-aligned. Always
 * visible — unlike `<ClearFilters>`, which is conditional.
 */
export function ShelfSort({ value, onChange }: ShelfSortProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SortValue)}
    >
      <SelectTrigger
        size="sm"
        className="w-auto"
        data-testid="shelf-sort"
        aria-label="Sort books"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SORT_LABELS) as SortValue[]).map((key) => (
          <SelectItem key={key} value={key}>
            {SORT_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
