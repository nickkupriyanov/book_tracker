"use client";

import { Button } from "@/components/ui/button";
import { DetailSection } from "@/features/detail-view";
import { QuoteCard } from "./QuoteCard";
import type { Quote } from "@/types/quote";
import type { Book } from "@/types/book";

const QUOTES_MAX_COUNT = 200;

export interface QuotesSectionProps {
  book: Book;
  onAdd: () => void;
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
}

/**
 * The Quotes section of the book detail page. Dumb: all click
 * handlers are callbacks up to the parent (BookDetail), and
 * dialog state is owned by BookDetail too — this component is
 * presentational plus a one-line sort.
 *
 * Renders <DetailSection title="Quotes"> with:
 *   - Empty state (book.quotes undefined OR []): muted copy
 *     + outlined "+ Add quote" button.
 *   - Non-empty: a <div className="space-y-3"> of <QuoteCard>s,
 *     sorted by createdAt desc, then a solid "+ Add quote"
 *     button below.
 *
 * The "+ Add quote" button is `disabled` (still rendered, not
 * removed) when the book is at the 200-quote cap (FR-15). The
 * cap is also enforced in `validateBookInput` for defence in
 * depth.
 */
export function QuotesSection({
  book,
  onAdd,
  onEdit,
  onDelete,
}: QuotesSectionProps) {
  const quotes = book.quotes ?? [];
  const isEmpty = quotes.length === 0;
  const sortedQuotes = isEmpty
    ? []
    : [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const atCap = quotes.length >= QUOTES_MAX_COUNT;

  return (
    <DetailSection title="Quotes">
      {isEmpty ? (
        <div className="space-y-3">
          <p
            className="text-muted-foreground text-sm"
            data-testid="quotes-empty"
          >
            No quotes yet. Add the first passage that stayed with you.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            data-testid="add-quote-button"
          >
            + Add quote
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedQuotes.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              onEdit={() => onEdit(q)}
              onDelete={() => onDelete(q)}
            />
          ))}
          <Button
            type="button"
            size="sm"
            onClick={onAdd}
            disabled={atCap}
            data-testid="add-quote-button"
          >
            + Add quote
          </Button>
        </div>
      )}
    </DetailSection>
  );
}
