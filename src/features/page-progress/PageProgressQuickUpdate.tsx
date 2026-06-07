"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateBookInput } from "@/lib/validation/book";
import { useBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

export interface PageProgressQuickUpdateProps {
  /**
   * The user's currently-reading books. The component
   * derives its own `selectedBookId` from this list and
   * falls back to the first entry when the current
   * selection drops out of the list (e.g. after a
   * "Mark as read" removes it).
   */
  books: Book[];
}

const SELECT_NONE = "__none__";

/**
 * The focused home page progress block (spec 015 §5.1). Lets the
 * user pick one of their reading books from a shadcn `Select`,
 * type a current page, and save — without opening a book detail
 * page.
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
 *   **Mark as read** action that flips the status to `"read"`
 *   through the existing update path, preserving the saved
 *   page fields.
 * - On storage failure, the inline error appears and the
 *   user's typed value is kept so they can retry.
 *
 * The component is presentational: it owns its own draft
 * state and calls the store. The parent decides whether to
 * render it (it should be hidden when there are no reading
 * books — see {@link ShelfClient}).
 */
export function PageProgressQuickUpdate({ books }: PageProgressQuickUpdateProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);

  const initialId = books[0]?.id ?? SELECT_NONE;
  const [selectedBookId, setSelectedBookId] = useState<string>(initialId);
  const [pageDraft, setPageDraft] = useState<string>(
    books[0]?.currentPage?.toString() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // If the selected book drops out of the reading list
  // (e.g. it was marked read on another surface, or it was
  // the only reading book and the user navigated away),
  // fall back to the first remaining entry. Reset the draft
  // to that book's `currentPage`. Spec 015 §9 — "A book
  // can stop being `reading` after it was selected in the
  // quick update block. The home page should derive the
  // selected book from the current reading list and fall
  // back to the first reading book when needed."
  useEffect(() => {
    const stillInList = books.some((b) => b.id === selectedBookId);
    if (!stillInList) {
      const next = books[0];
      setSelectedBookId(next?.id ?? SELECT_NONE);
      setPageDraft(next?.currentPage?.toString() ?? "");
    }
  }, [books, selectedBookId]);

  const selectedBook = useMemo<Book | undefined>(
    () => books.find((b) => b.id === selectedBookId),
    [books, selectedBookId]
  );

  function handleBookChange(nextId: string): void {
    setSelectedBookId(nextId);
    const next = books.find((b) => b.id === nextId);
    setPageDraft(next?.currentPage?.toString() ?? "");
    setError(null);
    setInfo(null);
  }

  async function handleSavePage(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (selectedBook === undefined) return;
    setError(null);
    setInfo(null);

    const trimmed = pageDraft.trim();
    const nextCurrentPage = trimmed === "" ? undefined : Number(trimmed);

    if (trimmed !== "" && !Number.isInteger(nextCurrentPage)) {
      setError("Current page must be a whole number.");
      return;
    }

    // Validate through the same boundary the form uses, so the
    // currentPage <= totalPages cross-field rule is enforced
    // identically here. Build a BookInput shape and revalidate;
    // any failure surfaces under the right field key.
    const candidate = {
      ...selectedBook,
      currentPage: nextCurrentPage,
    };
    const result = validateBookInput(candidate);
    if (!result.ok) {
      const first = result.errors.currentPage ?? result.errors._form;
      setError(first ?? "Couldn't save that page.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBook(selectedBook.id, result.value);
    } catch {
      // Spec 015 §5.3: storage failure keeps the user's typed
      // value visible and leaves the quick update block usable.
      setError("Couldn't save. Your browser storage is full or disabled.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkAsRead(): Promise<void> {
    if (selectedBook === undefined) return;
    setError(null);
    setInfo(null);
    setIsMarkingRead(true);
    try {
      // Preserve the page fields explicitly so the update path
      // carries them through unchanged. Spec 015 FR-10.
      await updateBook(selectedBook.id, {
        ...selectedBook,
        status: "read",
      });
      // The book leaves the reading list after this; the
      // useEffect above re-derives the selection.
      setInfo(`Marked "${selectedBook.title}" as read.`);
    } catch {
      setError("Couldn't save. Your browser storage is full or disabled.");
    } finally {
      setIsMarkingRead(false);
    }
  }

  const canSave = !isSaving && selectedBook !== undefined;
  const draftIsEmpty = pageDraft.trim() === "";

  const hasTotal = selectedBook?.totalPages !== undefined;
  const reachedEnd =
    selectedBook?.currentPage !== undefined &&
    selectedBook.totalPages !== undefined &&
    selectedBook.currentPage === selectedBook.totalPages;

  const progressText = useMemo<string | null>(() => {
    if (selectedBook === undefined) return null;
    if (
      selectedBook.currentPage !== undefined &&
      selectedBook.totalPages !== undefined
    ) {
      return `${selectedBook.currentPage} / ${selectedBook.totalPages} pages`;
    }
    if (selectedBook.currentPage !== undefined) {
      return `Page ${selectedBook.currentPage}`;
    }
    return null;
  }, [selectedBook]);

  const percent = useMemo<number | null>(() => {
    if (
      selectedBook === undefined ||
      selectedBook.currentPage === undefined ||
      selectedBook.totalPages === undefined ||
      selectedBook.totalPages === 0
    ) {
      return null;
    }
    return Math.min(
      100,
      Math.round((selectedBook.currentPage / selectedBook.totalPages) * 100)
    );
  }, [selectedBook]);

  return (
    <section
      aria-label="Quick page update"
      data-testid="page-progress-quick-update"
      className="bg-card border-border rounded-lg border p-5 shadow-sm"
    >
      <header className="mb-3 flex items-center gap-2">
        <BookOpen className="text-muted-foreground size-4" />
        <h2 className="font-serif text-lg text-foreground">Where are you?</h2>
      </header>

      <form
        onSubmit={handleSavePage}
        className="space-y-3"
        aria-describedby={error ? "page-progress-error" : undefined}
      >
        <div className="space-y-1.5">
          <Label htmlFor="page-progress-book">Currently reading</Label>
          <Select
            value={selectedBookId}
            onValueChange={handleBookChange}
          >
            <SelectTrigger
              id="page-progress-book"
              data-testid="page-progress-book-trigger"
              className="w-full"
            >
              <SelectValue placeholder="Choose a book…" />
            </SelectTrigger>
            <SelectContent>
              {books.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              disabled={selectedBook === undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "page-progress-error" : undefined}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!canSave || draftIsEmpty}
              data-testid="page-progress-save"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
          {progressText !== null && (
            <p
              data-testid="page-progress-text"
              className="text-muted-foreground text-sm"
            >
              {progressText}
            </p>
          )}
          {percent !== null && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              data-testid="page-progress-bar"
              className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {selectedBook !== undefined && !hasTotal && (
            <p
              data-testid="page-progress-add-total"
              className="text-muted-foreground text-sm"
            >
              Add the total page count through{" "}
              <Link
                href={`/book/${selectedBook.id}`}
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                the book&apos;s edit page
              </Link>{" "}
              to see progress here.
            </p>
          )}
          {reachedEnd && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleMarkAsRead()}
              disabled={isMarkingRead}
              data-testid="page-progress-mark-as-read"
              className="mt-1"
            >
              <Check className="size-4" />
              {isMarkingRead ? "Marking…" : "Mark as read"}
            </Button>
          )}
        </div>

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
