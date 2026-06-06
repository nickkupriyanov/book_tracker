import type { Book, ReadingStatus } from "@/types/book";

export interface FilterCriteria {
  search: string;
  tags: string[];
  status: "all" | ReadingStatus;
}

function parseSearchTokens(raw: string): string[] {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") return [];
  return trimmed.split(/\s+/).filter((t) => t.length > 0);
}

function matchesStatus(book: Book, status: FilterCriteria["status"]): boolean {
  if (status === "all") return true;
  return book.status === status;
}

function matchesTags(book: Book, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((t) => book.tags.includes(t));
}

function matchesSearch(book: Book, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystacks = [book.title, book.author, ...book.tags].map((s) =>
    s.toLowerCase()
  );
  return tokens.every((token) => haystacks.some((h) => h.includes(token)));
}

export function filterBooks(books: Book[], criteria: FilterCriteria): Book[] {
  const tokens = parseSearchTokens(criteria.search);
  return books.filter(
    (book) =>
      matchesStatus(book, criteria.status) &&
      matchesTags(book, criteria.tags) &&
      matchesSearch(book, tokens)
  );
}
