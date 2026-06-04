"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DetailSection } from "@/features/detail-view";
import { useBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

const REVIEW_MAX = 10_000;

export interface ReviewSectionProps {
  book: Book;
}

/**
 * Smart review section for the detail page. Renders
 * <DetailSection title="Review"> with two modes:
 *   - read: shows the review text (or "No review yet.")
 *     with an "Edit review" / "Write review" button.
 *   - edit: a <Textarea> pre-filled with the current
 *     review, plus "Cancel" and "Save" buttons. On
 *     save, calls useBookLibrary.updateBook. On
 *     storage failure, toasts "Couldn't save review.
 *     Try again." and stays in edit mode.
 *
 * Mirrors the smart pattern of `RatingSection` (spec 006
 * T3). Drop-in for `BookDetail` per spec 005 D7.
 * Reuses `DetailSection` from spec 005 T1.
 */
export function ReviewSection({ book }: ReviewSectionProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draft, setDraft] = useState<string>(book.review ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  function startEditing(): void {
    setDraft(book.review ?? "");
    setErrors({});
    setMode("edit");
  }

  function cancelEditing(): void {
    setMode("read");
    setErrors({});
  }

  async function handleSave(): Promise<void> {
    const trimmed = draft.trim();
    const next = trimmed === "" ? undefined : trimmed;
    // Local pre-check (mirrors validateReview). The adapter's
    // persistence is the source of truth for storage failures,
    // but a too-long input should be caught before the call.
    if (trimmed.length > REVIEW_MAX) {
      setErrors({
        review: `Review must be ${REVIEW_MAX} characters or fewer.`,
      });
      return;
    }
    setIsUpdating(true);
    setErrors({});
    try {
      await updateBook(book.id, { ...book, review: next });
      setMode("read");
    } catch {
      toast.error("Couldn't save review. Try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  const hasReview = book.review !== undefined;

  return (
    <DetailSection title="Review">
      {mode === "read" ? (
        <div className="space-y-3">
          {hasReview ? (
            <p
              className="text-foreground whitespace-pre-line"
              data-testid="review-text"
            >
              {book.review}
            </p>
          ) : (
            <p
              className="text-muted-foreground text-sm"
              data-testid="review-empty"
            >
              No review yet.
            </p>
          )}
          <Button
            type="button"
            variant={hasReview ? "ghost" : "outline"}
            size="sm"
            onClick={startEditing}
            data-testid="review-edit-button"
          >
            {hasReview ? "Edit review" : "Write review"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isUpdating}
            rows={8}
            data-testid="review-textarea"
            aria-label="Review"
            aria-invalid={errors.review ? true : undefined}
            aria-describedby={
              errors.review ? "review-error" : undefined
            }
          />
          {errors.review && (
            <p
              id="review-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.review}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              disabled={isUpdating}
              data-testid="review-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void handleSave();
              }}
              disabled={isUpdating}
              data-testid="review-save-button"
            >
              {isUpdating ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </DetailSection>
  );
}
