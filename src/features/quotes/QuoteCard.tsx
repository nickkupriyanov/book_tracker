"use client";

import { Button } from "@/components/ui/button";
import type { Quote } from "@/types/quote";

export interface QuoteCardProps {
  quote: Quote;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * A presentational card for a single quote in the Quotes section
 * of the book detail page. Mirrors the "A — Compact row" style
 * from the spec 009 brainstorming.
 *
 * Layout (top to bottom):
 *   1. The quote text in italic, surrounded by curly quotes, with
 *      line breaks preserved (`whitespace-pre-line`).
 *   2. The optional personal note — a smaller, muted italic line,
 *      rendered only when `quote.note` is set. The smaller size
 *      carries the visual hierarchy (no "Note:" label, per spec
 *      009 §5.2).
 *   3. A right-aligned meta row: `p. <number>` (when set) followed
 *      by `· Edit · Delete` link-style buttons. The page label is
 *      omitted entirely when `quote.page` is undefined, and the
 *      divider dots are conditional on the page label so the row
 *      never starts with `·`.
 *
 * All affordances fire the matching callback. Pure presentational:
 * no store access, no state, no dialog wiring (the parent
 * `QuotesSection` forwards clicks; `BookDetail` owns the dialogs).
 */
export function QuoteCard({ quote, onEdit, onDelete }: QuoteCardProps) {
  const hasPage = quote.page !== undefined;
  return (
    <div
      data-testid="quote-card"
      className="bg-muted/40 border border-border/40 space-y-2 rounded-lg p-3.5"
    >
      <p
        data-testid="quote-text"
        className="text-foreground whitespace-pre-line italic"
      >
        &ldquo;{quote.text}&rdquo;
      </p>
      {quote.note !== undefined && (
        <p
          data-testid="quote-note"
          className="text-muted-foreground text-sm italic"
        >
          {quote.note}
        </p>
      )}
      <div className="flex items-center justify-end gap-1 text-sm">
        {hasPage && (
          <>
            <span
              data-testid="quote-page"
              className="text-muted-foreground"
            >
              p. {quote.page}
            </span>
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
          </>
        )}
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={onEdit}
          data-testid="quote-edit-button"
        >
          Edit
        </Button>
        <span className="text-muted-foreground" aria-hidden="true">
          ·
        </span>
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={onDelete}
          data-testid="quote-delete-button"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
