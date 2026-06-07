"use client";

import { ReadingBookCard } from "./ReadingBookCard";
import type { Book } from "@/types/book";

export interface ReadingBooksListProps {
  books: Book[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
}

/**
 * Compact, focused book list for the home page (spec 015). Renders
 * a small lane of cozy cards for the supplied reading books. Clicking
 * a card changes the active book in the progress panel; editing belongs
 * to the full library.
 */
export function ReadingBooksList({
  books,
  activeBookId,
  onSelectBook,
}: ReadingBooksListProps) {
  return (
    <div
      data-testid="reading-books-list"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
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
