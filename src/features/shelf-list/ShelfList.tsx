"use client";

import { useMemo, useState } from "react";
import { BookCard } from "./BookCard";
import { ShelfFilters, type FilterValue } from "./ShelfFilters";
import { EmptyFilterResult } from "./EmptyFilterResult";
import { EditBookDialog } from "@/features/edit-book";
import type { Book } from "@/types/book";

export interface ShelfListProps {
  books: Book[];
}

/**
 * Orchestrator for the shelf grid. Holds local filter state
 * (per spec 002 D4 — not persisted) and the editing book state
 * (per spec 003 D4 — also local, also not persisted). Renders
 * <ShelfFilters> + (grid of <BookCard> | <EmptyFilterResult>) +
 * a single shared <EditBookDialog> when a card's Edit button fires.
 */
export function ShelfList({ books }: ShelfListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const counts = useMemo<Record<FilterValue, number>>(
    () => ({
      all: books.length,
      want: books.filter((b) => b.status === "want").length,
      reading: books.filter((b) => b.status === "reading").length,
      read: books.filter((b) => b.status === "read").length,
    }),
    [books]
  );

  const filteredBooks =
    filter === "all"
      ? books
      : books.filter((b) => b.status === filter);

  return (
    <div className="space-y-6">
      <ShelfFilters
        value={filter}
        onChange={setFilter}
        counts={counts}
      />
      {filteredBooks.length === 0 ? (
        <EmptyFilterResult />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => setEditingBook(book)}
            />
          ))}
        </div>
      )}
      {editingBook !== null && (
        <EditBookDialog
          key={editingBook.id}
          book={editingBook}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingBook(null);
          }}
        />
      )}
    </div>
  );
}
