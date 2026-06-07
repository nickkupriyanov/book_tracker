"use client";

import { BookOpen } from "lucide-react";
import type { Book } from "@/types/book";

export interface ReadingBookCardProps {
  book: Book;
  active: boolean;
  onSelect: () => void;
}

/**
 * Small home-only card for the currently-reading lane (spec 015 T9).
 * It intentionally avoids the full shelf card's edit/delete affordances
 * and heavy framed feel: this surface is for switching the active book
 * in the progress panel, not managing the library.
 */
export function ReadingBookCard({
  book,
  active,
  onSelect,
}: ReadingBookCardProps) {
  const progressText =
    book.currentPage !== undefined && book.totalPages !== undefined
      ? `${book.currentPage} / ${book.totalPages}`
      : book.currentPage !== undefined
        ? `Page ${book.currentPage}`
        : "No page yet";

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="reading-book-card"
      aria-pressed={active}
      aria-label={`Focus ${book.title}`}
      className={[
        "group flex min-h-24 w-full gap-3 rounded-lg p-3 text-left transition",
        "bg-card/70 hover:bg-card shadow-[0_1px_8px_rgba(54,38,24,0.06)]",
        active
          ? "ring-primary/35 bg-card ring-2"
          : "ring-border/40 ring-1 hover:ring-border",
      ].join(" ")}
    >
      <div className="bg-muted/80 flex aspect-[2/3] h-20 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {book.coverUrl !== undefined ? (
          // Plain <img> matches the shelf card's MVP posture.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <BookOpen className="text-muted-foreground size-7" />
        )}
      </div>
      <div className="min-w-0 flex-1 self-center">
        <p className="truncate font-serif text-sm text-foreground">
          {book.title}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {book.author}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {progressText}
        </p>
      </div>
    </button>
  );
}
