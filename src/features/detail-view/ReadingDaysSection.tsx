"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailSection } from "@/features/detail-view";
import { useBookLibrary } from "@/state/book-library";
import { validateBookInput } from "@/lib/validation/book";
import type { Book } from "@/types/book";

export interface ReadingDaysSectionProps {
  book: Book;
}

/**
 * Today's local date in `YYYY-MM-DD` form. Avoids `toISOString()`
 * (UTC) so the value matches what the user sees on the wall clock
 * (spec 013 D3, §5.1). Exported so tests can compute the same
 * value the component does without fighting fake timers.
 */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Smart reading-days section for the detail page (spec 013).
 * Renders <DetailSection title="Reading days"> with:
 *   - **Mark today** button (disabled when today is already logged).
 *   - A native date input + Add button (disabled when the input is
 *     empty or already logged).
 *   - A newest-first list of logged dates with Remove buttons.
 *
 * All edits go through `useBookLibrary.updateBook` with
 * `validateBookInput` as the boundary. On success the store
 * replaces the book and the section re-renders. On failure
 * (validation, storage) the section toasts and stays usable.
 *
 * "Newest first" ordering is the reverse of the chronological
 * sort the validator produces: validator keeps dates ascending
 * (lexicographic == chronological for YYYY-MM-DD), and the
 * section reverses for display only.
 */
export function ReadingDaysSection({ book }: ReadingDaysSectionProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const loggedDays = book.readingDays ?? [];
  const loggedSet = new Set(loggedDays);
  const today = todayLocalDate();
  const todayAlreadyLogged = loggedSet.has(today);
  const selectedAlreadyLogged =
    selectedDate.length > 0 && loggedSet.has(selectedDate);
  const canAddSelected =
    selectedDate.length > 0 && !selectedAlreadyLogged && !isSaving;
  const canMarkToday = !todayAlreadyLogged && !isSaving;

  async function commit(next: string[] | undefined): Promise<void> {
    setIsSaving(true);
    try {
      const result = validateBookInput({ ...book, readingDays: next });
      if (!result.ok) {
        toast.error("Couldn't save reading day. Try again.");
        return;
      }
      await updateBook(book.id, result.value);
    } catch {
      toast.error("Couldn't save reading day. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkToday(): Promise<void> {
    if (todayAlreadyLogged) return;
    const next = mergeDate(loggedDays, today);
    await commit(next);
  }

  async function handleAddSelected(): Promise<void> {
    if (!canAddSelected) return;
    const next = mergeDate(loggedDays, selectedDate);
    await commit(next);
    setSelectedDate("");
  }

  async function handleRemove(date: string): Promise<void> {
    const remaining = loggedDays.filter((d) => d !== date);
    await commit(remaining.length > 0 ? remaining : undefined);
  }

  const isEmpty = loggedDays.length === 0;
  // Newest first for display. The validator keeps dates ascending;
  // the render is the reverse.
  const sortedDesc = [...loggedDays].sort((a, b) => b.localeCompare(a));

  return (
    <DetailSection title="Reading days">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isEmpty ? "outline" : "ghost"}
            size="sm"
            onClick={handleMarkToday}
            disabled={!canMarkToday}
            data-testid="mark-today-button"
          >
            {todayAlreadyLogged ? "Today logged" : "Mark today"}
          </Button>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isSaving}
              aria-label="Pick a reading day"
              data-testid="reading-day-date-input"
              className="w-auto"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSelected}
              disabled={!canAddSelected}
              data-testid="add-reading-day-button"
            >
              Add
            </Button>
          </div>
        </div>

        {isEmpty ? (
          <p
            className="text-muted-foreground text-sm"
            data-testid="reading-days-empty"
          >
            No reading days logged yet.
          </p>
        ) : (
          <ul
            className="space-y-1.5"
            data-testid="reading-days-list"
            aria-label="Logged reading days"
          >
            {sortedDesc.map((date) => (
              <li
                key={date}
                className="flex items-center justify-between gap-2 text-sm"
                data-testid="reading-day-row"
              >
                <span className="text-foreground">{date}</span>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => handleRemove(date)}
                  disabled={isSaving}
                  data-testid="remove-reading-day-button"
                  aria-label={`Remove ${date}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailSection>
  );
}

/**
 * Returns the next reading-days array with `date` inserted, sorted
 * ascending and deduplicated. Pure — kept here so the section is
 * easy to test in isolation if we ever need to.
 */
function mergeDate(existing: string[], date: string): string[] {
  const merged = [...existing, date];
  merged.sort();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of merged) {
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}
