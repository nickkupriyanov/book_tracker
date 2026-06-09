"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DetailSection } from "@/features/detail-view";
import { useBookLibrary } from "@/state/book-library";
import { validateBookInput } from "@/lib/validation/book";
import {
  applyPagesRead,
  deriveCurrentPageFromLogs,
  deriveCurrentPageFromReadingLogs,
  removeReadingLogForDate,
  sortedReadingLogs,
} from "@/lib/page-progress";
import type { Book, ReadingLog } from "@/types/book";

export interface PageHistorySectionProps {
  book: Book;
}

/**
 * Local "now" date used as the default value for the Add
 * entry date input. Exported so the closest date used by the
 * UI matches the one tests compute without fighting fake
 * timers (spec 013 D3, §5.1 — same rule for the legacy
 * Reading days input).
 */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The Page history section of the book detail page (spec 022 §5.2).
 *
 * Lists the book's aggregate page logs newest first and lets
 * the reader:
 * - add a dated entry (date + pages read);
 * - edit the `pagesRead` of an existing date;
 * - delete an entry.
 *
 * Every change goes through the shared
 * {@link applyPagesRead} / {@link removeReadingLogForDate}
 * helpers so derived current page, calendar activity, and
 * statistics all recalculate from the same source of truth
 * (spec 022 §3 / FR-12, FR-13).
 *
 * Editing older logs is allowed: `applyPagesRead` recomputes
 * every later entry's `currentPageAfter` so the running
 * sum stays accurate (spec 022 §7). Negative corrections
 * surface as a friendly inline error pointing the user
 * back to this same view (spec 022 §9).
 */
export function PageHistorySection({ book }: PageHistorySectionProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);
  const liveBook =
    useBookLibrary((s) => s.books.find((b) => b.id === book.id)) ?? book;

  const [draft, setDraft] = useState<{
    date: string;
    pagesRead: string;
  }>({ date: "", pagesRead: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset transient UI state when the focused book changes.
    setError(null);
    setEditingId(null);
    setEditValue("");
  }, [liveBook.id]);

  const logs = sortedReadingLogs(liveBook);
  // Newest first for display (the helpers store ascending).
  const displayLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const totalPagesRead = deriveCurrentPageFromLogs(liveBook) ?? 0;

  async function commit(
    next: ReadingLog[] | undefined
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const candidate = {
      ...liveBook,
      currentPage: deriveCurrentPageFromReadingLogs(next),
      readingLogs: next,
    };
    const result = validateBookInput(candidate);
    if (!result.ok) {
      const first =
        result.errors._form ??
        result.errors.readingLogs ??
        "Couldn't save page history.";
      return { ok: false, message: first };
    }
    setIsSaving(true);
    try {
      await updateBook(liveBook.id, result.value);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: "Couldn't save. Your browser storage is full or disabled.",
      };
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddEntry(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    const trimmedPages = draft.pagesRead.trim();
    if (draft.date.length === 0) {
      setError("Pick a date for the new entry.");
      return;
    }
    const pagesRead = Number(trimmedPages);
    if (
      trimmedPages.length === 0 ||
      !Number.isInteger(pagesRead) ||
      pagesRead < 0
    ) {
      setError("Pages read must be a whole number of 0 or more.");
      return;
    }
    const applied = applyPagesRead(liveBook, draft.date, pagesRead);
    if (!applied.ok) {
      setError(applied.message);
      return;
    }
    void commit(applied.readingLogs).then((result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDraft({ date: "", pagesRead: "" });
    });
  }

  async function handleStartEdit(log: ReadingLog): Promise<void> {
    setError(null);
    setEditingId(log.id);
    setEditValue(log.pagesRead.toString());
  }

  async function handleSaveEdit(log: ReadingLog): Promise<void> {
    setError(null);
    const trimmed = editValue.trim();
    const pagesRead = Number(trimmed);
    if (trimmed.length === 0 || !Number.isInteger(pagesRead) || pagesRead < 0) {
      setError("Pages read must be a whole number of 0 or more.");
      return;
    }
    const applied = applyPagesRead(liveBook, log.date, pagesRead);
    if (!applied.ok) {
      setError(applied.message);
      return;
    }
    const result = await commit(applied.readingLogs);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditingId(null);
    setEditValue("");
  }

  function handleCancelEdit(): void {
    setEditingId(null);
    setEditValue("");
    setError(null);
  }

  async function handleDelete(log: ReadingLog): Promise<void> {
    setError(null);
    const next = removeReadingLogForDate(liveBook, log.date);
    const result = await commit(next);
    if (!result.ok) {
      setError(result.message);
      return;
    }
  }

  return (
    <DetailSection title="Page history">
      <div className="space-y-4">
        <form
          onSubmit={handleAddEntry}
          className="bg-muted/30 border-border/60 space-y-2 rounded-md border px-3 py-2"
          aria-label="Add a page history entry"
        >
          <p className="text-foreground text-sm font-medium">
            Log pages for a past date
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="page-history-date" className="text-xs">
                Date
              </Label>
              <Input
                id="page-history-date"
                data-testid="page-history-date-input"
                type="date"
                value={draft.date}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, date: e.target.value }));
                  setError(null);
                }}
                disabled={isSaving}
                className="w-auto"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="page-history-pages" className="text-xs">
                Pages read
              </Label>
              <Input
                id="page-history-pages"
                data-testid="page-history-pages-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.pagesRead}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, pagesRead: e.target.value }));
                  setError(null);
                }}
                placeholder="e.g. 25"
                disabled={isSaving}
                className="w-24"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              data-testid="page-history-add-button"
              disabled={
                isSaving || draft.date.length === 0 || draft.pagesRead.trim() === ""
              }
            >
              <Plus className="size-3.5" />
              Add entry
            </Button>
          </div>
        </form>

        {error !== null && (
          <p
            role="alert"
            data-testid="page-history-error"
            className="text-destructive text-sm"
          >
            {error}
          </p>
        )}

        {displayLogs.length === 0 ? (
          <p
            data-testid="page-history-empty"
            className="text-muted-foreground text-sm"
          >
            No page logs yet. Update your current page on the home page or add
            a past date here.
          </p>
        ) : (
          <>
            <p
              data-testid="page-history-total"
              className="text-muted-foreground text-sm"
            >
              {totalPagesRead} {totalPagesRead === 1 ? "page" : "pages"} logged
              across {displayLogs.length}{" "}
              {displayLogs.length === 1 ? "day" : "days"}.
            </p>
            <ul
              className="space-y-1.5"
              data-testid="page-history-list"
              aria-label="Logged page entries"
            >
              {displayLogs.map((log) => {
                const isEditing = editingId === log.id;
                return (
                  <li
                    key={log.id}
                    data-testid="page-history-row"
                    data-date={log.date}
                    className="bg-background border-border/60 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-foreground font-medium">
                      {log.date}
                    </span>
                    {isEditing ? (
                      <>
                        <Input
                          data-testid="page-history-edit-input"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setError(null);
                          }}
                          disabled={isSaving}
                          className="w-24"
                          aria-label={`Pages read on ${log.date}`}
                        />
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => void handleSaveEdit(log)}
                          disabled={isSaving}
                          data-testid="page-history-save-edit"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          data-testid="page-history-cancel-edit"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          data-testid="page-history-pages-display"
                          className="text-muted-foreground"
                        >
                          {log.pagesRead}{" "}
                          {log.pagesRead === 1 ? "page" : "pages"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          · reached p. {log.currentPageAfter}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => void handleStartEdit(log)}
                            disabled={isSaving}
                            aria-label={`Edit ${log.date}`}
                            data-testid="page-history-edit-button"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => void handleDelete(log)}
                            disabled={isSaving}
                            aria-label={`Remove ${log.date}`}
                            data-testid="page-history-remove-button"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </DetailSection>
  );
}
