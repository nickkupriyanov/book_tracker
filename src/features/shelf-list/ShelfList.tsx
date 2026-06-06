"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BookCard } from "./BookCard";
import { ShelfFilters, type FilterValue } from "./ShelfFilters";
import { ShelfSearch } from "./ShelfSearch";
import { ShelfTagFilter } from "./ShelfTagFilter";
import { ClearFilters } from "./ClearFilters";
import { EmptyFilterResult } from "./EmptyFilterResult";
import { filterBooks } from "@/lib/shelf-filter";
import { EditBookDialog } from "@/features/edit-book";
import { DeleteBookDialog } from "@/features/delete-book";
import type { Book } from "@/types/book";

export interface ShelfListProps {
  books: Book[];
}

/**
 * Orchestrator for the shelf grid. Holds local filter state
 * (per spec 002 D4 — not persisted), the editing book state
 * (per spec 003 D4 — also local), and the deleting book state
 * (per spec 004 D4 — also local). Renders <ShelfSearch> +
 * <ShelfFilters> + <ShelfTagFilter> + (grid of <BookCard> |
 * <EmptyFilterResult>) + a single shared <EditBookDialog> when
 * a card's Edit button fires, or a single shared
 * <DeleteBookDialog> when a card's Delete button fires.
 *
 * The two dialogs are mutually exclusive: clicking a card's pencil
 * clears the deleting slot and vice versa, so the shelf never
 * renders both at the same time (spec 004 D4 — precedence rule).
 *
 * Search and tag filter state are also local (per spec 010 D5);
 * they reset on reload. The status tab counts depend on the
 * active search and tag filters (per spec 011 D3) — they answer
 * "how many books would I see if I switched to this tab right
 * now?" A "Clear filters" button appears when any of the three
 * filter dimensions is non-default (spec 011 D2).
 */
export function ShelfList({ books }: ShelfListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const counts = useMemo<Record<FilterValue, number>>(
    () => ({
      all: filterBooks(books, { search, tags: selectedTags, status: "all" }).length,
      want: filterBooks(books, { search, tags: selectedTags, status: "want" }).length,
      reading: filterBooks(books, { search, tags: selectedTags, status: "reading" }).length,
      read: filterBooks(books, { search, tags: selectedTags, status: "read" }).length,
    }),
    [books, search, selectedTags]
  );

  const allTags = useMemo(
    () => Array.from(new Set(books.flatMap((b) => b.tags))).sort(),
    [books]
  );

  const filteredBooks = useMemo(
    () =>
      filterBooks(books, {
        search,
        tags: selectedTags,
        status: filter,
      }),
    [books, search, selectedTags, filter]
  );

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedTags([]);
    setFilter("all");
    searchInputRef.current?.focus();
  }, []);

  const hasActiveFilters =
    search !== "" || selectedTags.length > 0 || filter !== "all";

  return (
    <div className="space-y-6">
      <ShelfSearch
        value={search}
        onChange={setSearch}
        inputRef={searchInputRef}
      />
      <ShelfFilters value={filter} onChange={setFilter} counts={counts} />
      <ShelfTagFilter
        tags={allTags}
        selected={selectedTags}
        onToggle={handleTagToggle}
      />
      {hasActiveFilters && <ClearFilters onClick={handleClearFilters} />}
      {filteredBooks.length === 0 ? (
        <EmptyFilterResult />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => {
                setDeletingBook(null);
                setEditingBook(book);
              }}
              onDelete={() => {
                setEditingBook(null);
                setDeletingBook(book);
              }}
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
      {deletingBook !== null && (
        <DeleteBookDialog
          key={deletingBook.id}
          book={deletingBook}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDeletingBook(null);
          }}
        />
      )}
    </div>
  );
}
