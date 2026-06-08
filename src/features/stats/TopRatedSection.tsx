"use client";

import type { TopRatedBook } from "@/lib/reader-stats";

export interface TopRatedSectionProps {
  books: TopRatedBook[];
}

const STAR = "★";

/**
 * The highest-rated books section. Up to five rated books,
 * sorted by rating desc, valid `finishedAt` desc, `createdAt`
 * desc, then title asc (FR-6). When no books carry a rating,
 * shows a gentle empty prompt (FR-11).
 */
export function TopRatedSection({ books }: TopRatedSectionProps) {
  return (
    <section
      aria-label="Highest-rated books"
      data-testid="stats-top-rated"
      className="rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg text-foreground">Highest rated</h2>
        <span
          data-testid="stats-top-rated-count"
          className="text-muted-foreground text-xs tabular-nums"
        >
          {books.length}
        </span>
      </header>

      {books.length === 0 ? (
        <p
          data-testid="stats-top-rated-empty"
          className="text-muted-foreground text-sm"
        >
          No ratings yet — when you rate a book a few stars, it shows up here.
        </p>
      ) : (
        <ol
          data-testid="stats-top-rated-list"
          className="divide-border divide-y"
        >
          {books.map((book) => (
            <li
              key={book.id}
              data-testid="stats-top-rated-item"
              data-book-id={book.id}
              data-book-rating={book.rating}
              className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p
                  data-testid="stats-top-rated-title"
                  className="text-foreground truncate text-sm font-medium"
                >
                  {book.title}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {book.author}
                </p>
              </div>
              <span
                data-testid="stats-top-rated-stars"
                className="text-foreground shrink-0 text-sm tabular-nums"
                aria-label={`Rated ${book.rating} of 5`}
              >
                {STAR.repeat(book.rating)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
