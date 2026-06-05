"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/features/detail-view";
import { useBookLibrary } from "@/state/book-library";
import { ReviewDisplay } from "./ReviewDisplay";
import { ReviewEditor } from "./ReviewEditor";
import type { Book } from "@/types/book";
import type { Review } from "@/types/review";

export interface ReviewSectionProps {
  book: Book;
}

function reviewToEditorInitial(review: Review | string | undefined): Review {
  if (review === undefined) return { format: "plain", body: "" };
  if (typeof review === "string") return { format: "plain", body: review };
  return review;
}

/**
 * Smart review section for the detail page (spec 008).
 * Renders <DetailSection title="Review"> with two modes:
 *   - read: shows the review text (or "No review yet.")
 *     via <ReviewDisplay> with an "Edit review" / "Write review"
 *     button.
 *   - edit: a <ReviewEditor> (TipTap-based) with the toolbar,
 *     plus "Cancel" and "Save" buttons. On save, calls
 *     useBookLibrary.updateBook. On storage failure, toasts
 *     "Couldn't save review. Try again." and stays in edit
 *     mode.
 *
 * Mirrors the smart pattern of `RatingSection` (spec 006
 * T3) and the prior text-based `ReviewSection` (spec 007).
 * Drop-in for `BookDetail` per spec 005 D7.
 */
export function ReviewSection({ book }: ReviewSectionProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);
  const [mode, setMode] = useState<"read" | "edit">("read");

  function startEditing(): void {
    setMode("edit");
  }

  function cancelEditing(): void {
    setMode("read");
  }

  async function handleSave(review: Review | undefined): Promise<void> {
    try {
      await updateBook(book.id, { ...book, review });
      if (review === undefined) {
        toast.success("Review deleted.");
      }
      setMode("read");
    } catch {
      toast.error("Couldn't save review. Try again.");
    }
  }

  const hasReview = book.review !== undefined && book.review !== null;

  return (
    <DetailSection title="Review">
      {mode === "read" ? (
        <div className="space-y-3">
          <ReviewDisplay review={book.review} />
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
        <ReviewEditor
          initialValue={reviewToEditorInitial(book.review)}
          onSave={handleSave}
          onCancel={cancelEditing}
        />
      )}
    </DetailSection>
  );
}
