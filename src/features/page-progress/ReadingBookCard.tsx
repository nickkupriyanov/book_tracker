"use client";

import { BookOpen } from "lucide-react";
import { deriveCurrentPageFromLogs } from "@/lib/page-progress";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/book";

export interface ReadingBookCardProps {
  book: Book;
  active: boolean;
  onSelect: () => void;
}

/**
 * Vertical cover-led card for the home reading lane (spec 016
 * §5.4, spec 020 §5.2). The card sizes from its parent lane
 * (no fixed width — spec 020 FR-8) and keeps the cover flush
 * to top/left/right. Click selects the active book for Where
 * Are You; detail navigation lives in the focus panel to keep
 * this card a single interactive target.
 */
export function ReadingBookCard({
  book,
  active,
  onSelect,
}: ReadingBookCardProps) {
  const currentPage = deriveCurrentPageFromLogs(book);
  const progressText =
    currentPage !== null && book.totalPages !== undefined
      ? `${currentPage} / ${book.totalPages}`
      : currentPage !== null
        ? `Page ${currentPage}`
        : "No page yet";

  return (
    <div
      data-testid="reading-book-card"
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`Focus ${book.title}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "w-full rounded-lg bg-card shadow-sm transition",
        active
          ? "ring-primary/35 ring-2"
          : "ring-border/40 ring-1 hover:ring-border",
      )}
    >
      <div className="bg-muted/80 flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-t-lg">
        {book.coverUrl !== undefined ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <BookOpen className="text-muted-foreground size-8" />
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="font-serif text-sm text-foreground truncate">
          {book.title}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {book.author}
        </p>
        <p className="text-muted-foreground text-xs">
          {progressText}
        </p>
        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {book.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
              >
                {tag}
              </span>
            ))}
            {book.tags.length > 2 && (
              <span className="text-muted-foreground text-[10px]">
                +{book.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
