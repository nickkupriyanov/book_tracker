"use client";

import { useState } from "react";
import { BookOpen, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "./StatusPill";
import type { Book } from "@/types/book";

const MAX_VISIBLE_TAGS = 3;

export interface BookCardProps {
  book: Book;
  /**
   * Optional click handler to edit the book. When provided, a small
   * pencil button is rendered at the top-right of the cover (always
   * visible — not hover-only — for mobile and screen-reader access).
   */
  onEdit?: () => void;
}

/**
 * A single book card on the shelf. Presentational, but holds local
 * `coverFailed` state so a broken image URL gracefully falls back to
 * the placeholder without re-rendering the grid.
 */
export function BookCard({ book, onEdit }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = book.coverUrl !== undefined && !coverFailed;

  const visibleTags = book.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = book.tags.length - MAX_VISIBLE_TAGS;

  return (
    <Card>
      <div className="bg-muted relative aspect-[2/3] overflow-hidden">
        {showCover ? (
          // Plain <img> on purpose: spec 002 plan D-P2. <Image> from
          // next/image would require next.config `remotePatterns` config
          // and a hard-coded list of allowed cover hosts. We accept
          // unoptimized cover loads for MVP and rely on `onError` to
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
        {onEdit !== undefined && (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onEdit}
            aria-label="Edit book"
            data-testid="book-card-edit"
            className="absolute top-2 right-2"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
      <CardContent className="space-y-1.5 p-4">
        <h3 className="text-foreground truncate font-serif text-base">
          {book.title}
        </h3>
        <p className="text-muted-foreground truncate text-sm">
          {book.author}
        </p>
        <StatusPill status={book.status} />
        {(visibleTags.length > 0 || overflow > 0) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {overflow > 0 && <Badge variant="outline">+{overflow}</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
