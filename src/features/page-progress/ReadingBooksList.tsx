"use client";

import { BookCard } from "@/features/shelf-list";
import type { Book } from "@/types/book";

export interface ReadingBooksListProps {
  books: Book[];
}

/**
 * Compact, focused book list for the home page (spec 015). Renders
 * a grid of {@link BookCard} for the supplied reading books without
 * shelf edit/delete affordances — those live on /library. The home
 * surface is for the daily "what am I reading now?" habit; editing
 * belongs to the full library.
 *
 * `BookCard` is presentational; the cards still link to /book/<id>
 * for the detail view (spec 005) and display progress text/bar from
 * the lightweight `currentPage` / `totalPages` rendering (spec 015
 * §5.2, T7).
 */
export function ReadingBooksList({ books }: ReadingBooksListProps) {
  return (
    <div
      data-testid="reading-books-list"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
    >
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
