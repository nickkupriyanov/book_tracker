"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Star, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateBookInput } from "@/lib/validation/book";
import { useBookLibrary } from "@/state/book-library";
import {
  applyTargetCurrentPage,
  deriveCurrentPageFromLogs,
} from "@/lib/page-progress";
import type { Book, ReadingLog } from "@/types/book";

export interface PageProgressQuickUpdateProps {
  /** The currently focused reading book. */
  book: Book;
}

/**
 * Returns today's local calendar date as `YYYY-MM-DD`.
 * Used for reading-log dating (spec 016 FR-17).
 */
function todayLocalDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Returns the rounded percent `[0, 100]` of a book.
 * `null` when `totalPages` is missing or zero, or when
 * `currentPage` is missing. Spec 019 §5.2 / FR-4.
 */
function calculatePercent(book: Book): number | null {
  const current = resolveCurrentPage(book);
  if (current === null) return null;
  if (book.totalPages === undefined || book.totalPages === 0) return null;
  return Math.min(100, Math.round((current / book.totalPages) * 100));
}

/**
 * Returns the next `currentPage` for a quick additive action
 * (e.g. `+10`, `+25`). Treats a missing `currentPage` as `0`
 * and caps the result at `totalPages` when present
 * (spec 019 FR-10, FR-11, FR-12).
 */
function calculateQuickActionTarget(book: Book, delta: number): number {
  const current = resolveCurrentPage(book) ?? 0;
  const next = current + delta;
  if (book.totalPages === undefined) return next;
  return Math.min(next, book.totalPages);
}

/**
 * Returns the pages left to read. `null` when
 * `totalPages` is missing. Never below `0` (spec 019 FR-5).
 */
function calculatePagesLeft(book: Book): number | null {
  const current = resolveCurrentPage(book);
  if (current === null) return null;
  if (book.totalPages === undefined) return null;
  return Math.max(0, book.totalPages - current);
}

/**
 * Returns the total pages read today for the active book,
 * derived from `book.readingLogs`. `0` when no log exists
 * for today's local date. Spec 019 §5.4 / FR-18.
 */
function calculateTodayPagesRead(book: Book): number {
  const logs = book.readingLogs ?? [];
  const today = todayLocalDate();
  return logs
    .filter((l) => l.date === today)
    .reduce((sum, l) => sum + l.pagesRead, 0);
}

/**
 * Resolves the current page for display. Prefers the
 * synchronised `Book.currentPage` when present and falls
 * back to the sum of `readingLogs.pagesRead` so old records
 * with stale snapshots still render accurate progress
 * (spec 022 §7).
 */
function resolveCurrentPage(book: Book): number | null {
  return deriveCurrentPageFromLogs(book);
}

/**
 * The focused home page progress block (spec 015 §5.1 → spec 016 §5.6 → spec 022 §5.1). Lets the
 * user type a current page for the active reading book and save —
 * without opening a book detail page. The parent owns active-book
 * selection through the compact reading lane.
 *
 * - Persists through `useBookLibrary.updateBook` and
 *   `validateBookInput`, so the validation rules (positive
 *   whole numbers; `currentPage <= totalPages`) are enforced
 *   exactly like the form path.
 * - Shows "123 / 420 pages" + a quiet progress bar when
 *   `totalPages` is known; "Page 123" when only `currentPage`
 *   is set; a non-blocking prompt to add `totalPages` when
 *   the selected book has none.
 * - When `currentPage === totalPages` it surfaces a soft
 *   completion prompt with rating, review, and mark-as-read
 *   next steps (spec 022 §5.1 / FR-11).
 * - On storage failure, the inline error appears and the
 *   user's typed value is kept so they can retry.
 *
 * The component is presentational: it owns its own draft
 * state and calls the store. The parent decides whether to
 * render it (it should be hidden when there are no reading
 * books — see {@link ShelfClient}).
 */
export function PageProgressQuickUpdate({ book }: PageProgressQuickUpdateProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);
  // The component reads its own book from the store so the
  // panel re-renders the moment a save lands (spec 022 §5.1
  // / FR-13). The `book` prop is the initial seed; the
  // store copy is the live, derived source of truth.
  const liveBook =
    useBookLibrary((s) => s.books.find((b) => b.id === book.id)) ?? book;

  const [pageDraft, setPageDraft] = useState<string>(
    resolveCurrentPage(book)?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const today = todayLocalDate();

  const currentPage = resolveCurrentPage(liveBook);

  useEffect(() => {
    setPageDraft(currentPage?.toString() ?? "");
    setError(null);
    setInfo(null);
  }, [liveBook.id, currentPage]);

  /**
   * Persists a new `currentPage` value through the shared
   * `applyTargetCurrentPage` helper so the rules (positive
   * deltas only, `currentPage <= totalPages`, log
   * aggregation, same-day corrections) stay consistent
   * for the typed form and the instant `+10` / `+25` quick
   * actions. Spec 022 §3 / FR-6..FR-10.
   */
  async function persistCurrentPage(
    nextCurrentPage: number | undefined
  ): Promise<void> {
    const applied = applyTargetCurrentPage(liveBook, today, nextCurrentPage);
    if (!applied.ok) {
      setError(applied.message);
      return;
    }

    const nextReadingLogs: ReadingLog[] | undefined = applied.readingLogs;
    const candidate = {
      ...liveBook,
      currentPage: applied.currentPage,
      readingLogs: nextReadingLogs,
    };
    const result = validateBookInput(candidate);
    if (!result.ok) {
      const first = result.errors.currentPage ?? result.errors._form;
      setError(first ?? "Couldn't save that page.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBook(liveBook.id, result.value);
    } catch {
      // Spec 015 §5.3: storage failure keeps the user's
      // typed value visible and leaves the quick update
      // block usable.
      setError("Couldn't save. Your browser storage is full or disabled.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSavePage(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmed = pageDraft.trim();
    const nextCurrentPage = trimmed === "" ? undefined : Number(trimmed);

    if (trimmed !== "" && !Number.isInteger(nextCurrentPage)) {
      setError("Current page must be a whole number.");
      return;
    }

    await persistCurrentPage(nextCurrentPage);
  }

  async function handleQuickAdd(delta: 10 | 25): Promise<void> {
    setError(null);
    setInfo(null);
    await persistCurrentPage(calculateQuickActionTarget(liveBook, delta));
  }

  async function handleFinished(): Promise<void> {
    setError(null);
    setInfo(null);
    setIsFinishing(true);
    try {
      // When `totalPages` is known, snap to the final page so the
      // status flip and the page jump are persisted together
      // (spec 019 FR-16). When `totalPages` is missing, preserve
      // the existing page fields and only flip the status
      // (spec 019 FR-17). Either way the saved book leaves the
      // reading list, so the parent re-derives the active book.
      const nextCurrentPage =
        liveBook.totalPages !== undefined ? liveBook.totalPages : currentPage ?? undefined;
      const applied = applyTargetCurrentPage(liveBook, today, nextCurrentPage);
      if (!applied.ok) {
        setError(applied.message);
        return;
      }
      const nextReadingLogs: ReadingLog[] | undefined = applied.readingLogs;
      const candidate = {
        ...liveBook,
        status: "read" as const,
        currentPage: applied.currentPage,
        readingLogs: nextReadingLogs,
      };
      const result = validateBookInput(candidate);
      if (!result.ok) {
        const first = result.errors.currentPage ?? result.errors._form;
        setError(first ?? "Couldn't mark this book as read.");
        return;
      }
      await updateBook(liveBook.id, result.value);
    } catch {
      setError("Couldn't save. Your browser storage is full or disabled.");
    } finally {
      setIsFinishing(false);
    }
  }

  const canSave = !isSaving;

  const hasTotal = liveBook.totalPages !== undefined;
  const reachedEnd =
    hasTotal && currentPage !== null && currentPage >= liveBook.totalPages!;

  const percent = useMemo(() => calculatePercent(liveBook), [liveBook]);
  const pagesLeft = useMemo(() => calculatePagesLeft(liveBook), [liveBook]);
  const todayPagesRead = useMemo(() => calculateTodayPagesRead(liveBook), [liveBook]);

  const progressText = useMemo<string | null>(() => {
    if (currentPage !== null && liveBook.totalPages !== undefined) {
      return `${currentPage} / ${liveBook.totalPages} pages`;
    }
    if (currentPage !== null) {
      return `Page ${currentPage}`;
    }
    return null;
  }, [liveBook, currentPage]);

  return (
    <section
      aria-label="Quick page update"
      data-testid="page-progress-quick-update"
      className="bg-card border-border rounded-lg border p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center gap-2">
        <BookOpen className="text-muted-foreground size-4" />
        <h2 className="font-serif text-lg text-foreground">Where are you?</h2>
      </header>

      <div className="mb-5 flex gap-4">
        <div className="bg-muted/80 flex aspect-[2/3] w-20 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {liveBook.coverUrl !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={liveBook.coverUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <BookOpen className="text-muted-foreground size-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p
                data-testid="page-progress-title"
                className="font-serif text-2xl text-foreground"
              >
                {liveBook.title}
              </p>
              <p
                data-testid="page-progress-author"
                className="text-muted-foreground text-sm"
              >
                {liveBook.author}
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="self-start sm:shrink-0"
            >
              <Link href={`/book/${liveBook.id}`}>
                Open book
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {hasTotal && currentPage !== null ? (
        <div
          data-testid="page-progress-summary"
          className="mb-5 space-y-2"
        >
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Reading progress
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <p
              data-testid="page-progress-text"
              className="text-foreground text-sm font-medium"
            >
              {progressText}
            </p>
            {percent !== null && (
              <p
                data-testid="page-progress-percent"
                className="text-muted-foreground text-sm"
              >
                {percent}% completed
              </p>
            )}
          </div>
          {percent !== null && (
            <div
              role="progressbar"
              aria-label="Reading progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              data-testid="page-progress-bar"
              className="bg-muted/60 h-1 w-full overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {pagesLeft !== null && (
            <p
              data-testid="page-progress-pages-left"
              className="text-muted-foreground text-sm"
            >
              {pagesLeft} pages left
            </p>
          )}
        </div>
      ) : (
        progressText !== null && (
          <p
            data-testid="page-progress-text"
            className="text-muted-foreground mb-5 text-sm"
          >
            {progressText}
          </p>
        )
      )}

      {!hasTotal && (
        <p
          data-testid="page-progress-add-total"
          className="text-muted-foreground mb-5 text-sm"
        >
          Add the total page count through{" "}
          <Link
            href={`/book/${liveBook.id}`}
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            the book&apos;s edit page
          </Link>{" "}
          to see progress here.
        </p>
      )}

      {reachedEnd && (
        <div
          data-testid="page-progress-completion"
          className="bg-muted/40 border-border mb-5 rounded-md border px-4 py-3"
        >
          <p className="font-serif text-foreground text-base">
            You reached the last page.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Take a moment to close the chapter.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/book/${liveBook.id}#rate`}>
                <Star className="size-3.5" />
                Rate
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/book/${liveBook.id}#review`}>
                <PencilLine className="size-3.5" />
                Write review
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleFinished()}
              disabled={isSaving || isFinishing}
              data-testid="page-progress-mark-read"
            >
              <Check className="size-3.5" />
              {isFinishing ? "Marking…" : "Mark as read"}
            </Button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSavePage}
        className="space-y-3"
        aria-describedby={error ? "page-progress-error" : undefined}
      >
        <div className="space-y-1.5">
          <Label htmlFor="page-progress-page">Current page</Label>
          <div className="flex items-center gap-2">
            <Input
              id="page-progress-page"
              data-testid="page-progress-page-input"
              type="number"
              inputMode="numeric"
              min={1}
              value={pageDraft}
              onChange={(e) => {
                setPageDraft(e.target.value);
                setError(null);
                setInfo(null);
              }}
              placeholder="e.g. 123"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "page-progress-error" : undefined}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!canSave}
              data-testid="page-progress-save"
            >
              {isSaving ? "Saving…" : "Update progress"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleQuickAdd(10)}
              disabled={isSaving || isFinishing}
              data-testid="page-progress-quick-10"
            >
              +10 pages
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleQuickAdd(25)}
              disabled={isSaving || isFinishing}
              data-testid="page-progress-quick-25"
            >
              +25 pages
            </Button>
            {!reachedEnd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleFinished()}
                disabled={isSaving || isFinishing}
                data-testid="page-progress-finished"
              >
                <Check className="size-3.5" />
                {isFinishing ? "Finishing…" : "Finished"}
              </Button>
            )}
          </div>
        </div>

        {todayPagesRead > 0 && (
          <p
            data-testid="page-progress-today"
            className="text-muted-foreground text-sm"
          >
            You read {todayPagesRead} pages today
          </p>
        )}

        {error !== null && (
          <p
            id="page-progress-error"
            role="alert"
            data-testid="page-progress-error"
            className="text-destructive text-sm"
          >
            {error}
          </p>
        )}
        {info !== null && (
          <p
            data-testid="page-progress-info"
            className="text-muted-foreground text-sm"
          >
            {info}
          </p>
        )}
      </form>
    </section>
  );
}
