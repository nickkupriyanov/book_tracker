"use client";

import { ReadingBookCard } from "./ReadingBookCard";
import type { Book } from "@/types/book";

export interface ReadingBooksListProps {
  books: Book[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
}

/**
 * Compact responsive grid of vertical cover-led reading cards
 * (spec 016 §5.4, spec 020 §5.2). The lane is the source of
 * truth for column width — each card fills its column with
 * `w-full` and the grid uses a `minmax(160px, 1fr)` track so
 * cards stay readable on the narrowest layouts and grow with
 * available space.
 */
export function ReadingBooksList({
  books,
  activeBookId,
  onSelectBook,
}: ReadingBooksListProps) {
  return (
    <div
      data-testid="reading-books-list"
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4"
    >
      {books.map((book) => (
        <ReadingBookCard
          key={book.id}
          book={book}
          active={book.id === activeBookId}
          onSelect={() => onSelectBook(book.id)}
        />
      ))}
    </div>
  );
}
