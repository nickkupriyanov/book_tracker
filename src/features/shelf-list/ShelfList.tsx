"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BookCard } from "./BookCard";
import { ShelfFilters, type FilterValue } from "./ShelfFilters";
import { ShelfSearch } from "./ShelfSearch";
import { ShelfSort } from "./ShelfSort";
import { ShelfTagFilter } from "./ShelfTagFilter";
import { ClearFilters } from "./ClearFilters";
import { EmptyFilterResult } from "./EmptyFilterResult";
import { filterBooks } from "@/lib/shelf-filter";
import { sortBooks, type SortValue } from "@/lib/shelf-sort";
import { EditBookDialog } from "@/features/edit-book";
import { DeleteBookDialog } from "@/features/delete-book";
import type { Book } from "@/types/book";

export interface ShelfListProps {
  books: Book[];
}

/**
 * Orchestrator for the shelf grid. Holds local filter state
 * (per spec 002 D4 — not persisted), the editing book state
 * (per spec 003 D4 — also local), the deleting book state
 * (per spec 004 D4 — also local), and a view-level sort
 * state (per spec 012 D6 — local, default "recently-added",
 * matches the store's `sortByCreatedAtDesc` invariant).
 *
 * The shelf renders a single cohesive filter block (spec
 * 020 §5.4 / FR-13) — search, status tabs, sort, tags, and
 * a conditional clear-filters action all live inside one
 * `bg-card` surface — followed by the grid of <BookCard> (or
 * <EmptyFilterResult>), and a single shared <EditBookDialog>
 * / <DeleteBookDialog> when a card's Edit or Delete button
 * fires.
 *
 * The two dialogs are mutually exclusive: clicking a card's
 * pencil clears the deleting slot and vice versa, so the
 * shelf never renders both at the same time (spec 004 D4 —
 * precedence rule).
 *
 * Search, tag filter, and sort state are all local (per spec
 * 010 D5 and spec 012 D6); they reset on reload. The status
 * tab counts depend on the active search and tag filters
 * (per spec 011 D3) — they answer "how many books would I
 * see if I switched to this tab right now?" A "Clear
 * filters" button appears inside the filter block when any
 * of the three filter dimensions is non-default (spec 011
 * D2, spec 020 FR-13). Sort is independent of the filter
 * dimensions and is not cleared by the "Clear filters"
 * button. Clearing still resets search/selectedTags/status
 * to defaults and focuses the search input (FR-14).
 */
export function ShelfList({ books }: ShelfListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortValue>("recently-added");
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

  const sortedBooks = useMemo(
    () => sortBooks(filteredBooks, sort),
    [filteredBooks, sort]
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
      <section
        aria-label="Library filters"
        data-testid="shelf-filter-block"
        className="border-border bg-card space-y-3 rounded-lg border p-4"
      >
        <ShelfSearch
          value={search}
          onChange={setSearch}
          inputRef={searchInputRef}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <ShelfFilters
              value={filter}
              onChange={setFilter}
              counts={counts}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasActiveFilters && <ClearFilters onClick={handleClearFilters} />}
            <ShelfSort value={sort} onChange={setSort} />
          </div>
        </div>
        {allTags.length > 0 && (
          <ShelfTagFilter
            tags={allTags}
            selected={selectedTags}
            onToggle={handleTagToggle}
          />
        )}
      </section>

      {filteredBooks.length === 0 ? (
        <EmptyFilterResult />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sortedBooks.map((book) => (
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
