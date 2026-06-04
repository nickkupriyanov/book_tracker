"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DetailSection } from "@/features/detail-view";
import { useBookLibrary } from "@/state/book-library";
import { RatingStars } from "./RatingStars";
import type { Book } from "@/types/book";

export interface RatingSectionProps {
  book: Book;
}

/**
 * Smart rating section for the detail page. Renders
 * <DetailSection title="Rating"> with <RatingStars>; click
 * on a star updates the book's rating via
 * `useBookLibrary.updateBook`. On storage failure, toasts
 * "Couldn't save rating. Try again." and re-enables the
 * stars; the store is unchanged.
 *
 * Mirrors the smart pattern of `EditBookDialog` and
 * `DeleteBookDialog` (imports `useBookLibrary` directly).
 * Drop-in for `BookDetail` per spec 005 D7.
 */
export function RatingSection({ book }: RatingSectionProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleRate(rating: 1 | 2 | 3 | 4 | 5): Promise<void> {
    setIsUpdating(true);
    try {
      await updateBook(book.id, { ...book, rating });
    } catch {
      toast.error("Couldn't save rating. Try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <DetailSection title="Rating">
      <RatingStars
        value={book.rating}
        onChange={handleRate}
        disabled={isUpdating}
      />
    </DetailSection>
  );
}
