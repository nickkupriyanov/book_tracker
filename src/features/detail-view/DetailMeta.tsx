"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/features/shelf-list/StatusPill";
import type { Book } from "@/types/book";

export interface DetailMetaProps {
  book: Book;
}

/**
 * The main meta block of the detail page. Renders the book's
 * cover (with fallback placeholder), title, author, status,
 * all tags, and the added-on date.
 *
 * Cover sizing: `w-full max-w-xs` on mobile (stacked), `w-64`
 * on desktop (side-by-side with the meta column). Date is
 * formatted with `Intl.DateTimeFormat("en-GB", { dateStyle:
 * "long" })` for consistency with the rest of the English UI
 * (spec 005 D10).
 */
export function DetailMeta({ book }: DetailMetaProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = book.coverUrl !== undefined && !coverFailed;

  const addedOn = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
  }).format(new Date(book.createdAt));

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="bg-muted relative aspect-[2/3] w-full max-w-xs overflow-hidden rounded-lg md:w-64 md:shrink-0">
        {showCover ? (
          // Plain <img> on purpose: mirrors the BookCard pattern
          // (spec 002 plan D-P2). next/image would require
          // `remotePatterns` config. We rely on `onError` to
          // gracefully fall back to the placeholder.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt={book.title}
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="text-muted-foreground size-12" />
          </div>
        )}
      </div>
      <div className="space-y-4 md:flex-1">
        <h1 className="font-serif text-3xl text-foreground">
          {book.title}
        </h1>
        <p className="text-muted-foreground text-lg">{book.author}</p>
        <div>
          <StatusPill status={book.status} />
        </div>
        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {book.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-sm">
          Added on {addedOn}
        </p>
      </div>
    </div>
  );
}
