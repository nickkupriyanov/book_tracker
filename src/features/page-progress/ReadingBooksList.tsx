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
 * (spec 016 §5.4). Each card is ~160px wide.
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
