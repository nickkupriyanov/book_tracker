"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
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
  /**
   * Optional click handler to delete the book. When provided, a small
   * trash button is rendered next to the pencil (or alone if no
   * `onEdit` is given). Ghost variant by default, `text-destructive`
   * on hover only — destructive weight is a hint, not a shout
   * (spec 004 D2).
   */
  onDelete?: () => void;
}

/**
 * A single book card on the shelf. Presentational, but holds local
 * `coverFailed` state so a broken image URL gracefully falls back to
 * the placeholder without re-rendering the grid.
 */
export function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = book.coverUrl !== undefined && !coverFailed;

  const visibleTags = book.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = book.tags.length - MAX_VISIBLE_TAGS;

  const hasActions = onEdit !== undefined || onDelete !== undefined;

  // Lightweight page progress text (spec 015 §5.2 / T7).
  // Shown on every surface that renders the card. The bar
  // lives on the home quick-update block; the card stays
  // text-only to remain warm and book-centered.
  const progressText: string | null =
    book.currentPage !== undefined && book.totalPages !== undefined
      ? `${book.currentPage} / ${book.totalPages} pages`
      : book.currentPage !== undefined
        ? `Page ${book.currentPage}`
        : null;

  return (
    <Card className="gap-0 rounded-lg border-border/70 bg-card py-0 shadow-none">
      <div className="bg-muted relative aspect-[2/3] overflow-hidden rounded-t-lg">
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
            <BookOpen className="text-muted-foreground size-10" />
          </div>
        )}
        {hasActions && (
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            {onEdit !== undefined && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={onEdit}
                aria-label="Edit book"
                data-testid="book-card-edit"
                className="size-7"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {onDelete !== undefined && (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                onClick={onDelete}
                aria-label="Delete book"
                data-testid="book-card-delete"
                className="size-7 bg-background/90 text-muted-foreground shadow-sm hover:bg-background hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      <CardContent className="space-y-1 p-3">
        <Link
          href={`/book/${book.id}`}
          className="hover:underline underline-offset-2"
        >
          <h3 className="text-foreground truncate font-serif text-base">
            {book.title}
          </h3>
        </Link>
        <p className="text-muted-foreground truncate text-sm">
          {book.author}
        </p>
        <StatusPill status={book.status} />
        {progressText !== null && (
          <p
            data-testid="book-card-progress"
            className="text-muted-foreground text-xs"
          >
            {progressText}
          </p>
        )}
        {(visibleTags.length > 0 || overflow > 0) && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            {overflow > 0 && (
              <Badge variant="outline" className="text-[10px]">
                +{overflow}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
