import { describe, it, expect } from "vitest";
import type { Book } from "@/types/book";
import { filterBooks, type FilterCriteria } from "./shelf-filter";

const now = "2026-06-06T00:00:00.000Z";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Untitled",
    author: overrides.author ?? "Anonymous",
    status: overrides.status ?? "want",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? now,
    ...overrides,
  };
}

const tolkien = makeBook({
  id: "1",
  title: "The Lord of the Rings",
  author: "J. R. R. Tolkien",
  status: "read",
  tags: ["fantasy", "classic"],
});

const rowling = makeBook({
  id: "2",
  title: "Harry Potter and the Philosopher's Stone",
  author: "J. K. Rowling",
  status: "read",
  tags: ["fantasy", "young-adult"],
});

const knuth = makeBook({
  id: "3",
  title: "The Art of Computer Programming",
  author: "Donald Knuth",
  status: "reading",
  tags: ["programming", "math"],
});

const doorstop = makeBook({
  id: "4",
  title: "A",
  author: "B",
  status: "want",
  tags: [],
});

const ALL_BOOKS: Book[] = [tolkien, rowling, knuth, doorstop];

const emptyCriteria: FilterCriteria = { search: "", tags: [], status: "all" };

describe("filterBooks — search", () => {
  it("empty criteria returns all books", () => {
    expect(filterBooks(ALL_BOOKS, emptyCriteria)).toEqual(ALL_BOOKS);
  });

  it("matches a single token in title", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "knuth" });
    expect(result).toEqual([knuth]);
  });

  it("matches a single token in author", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "rowling" });
    expect(result).toEqual([rowling]);
  });

  it("matches a single token in tag value", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "young" });
    expect(result).toEqual([rowling]);
  });

  it("multi-token: AND across tokens (every token must match)", () => {
    const result = filterBooks(ALL_BOOKS, {
      ...emptyCriteria,
      search: "tolkien fantasy",
    });
    expect(result).toEqual([tolkien]);
  });

  it("multi-token: excludes books missing any token", () => {
    const result = filterBooks(ALL_BOOKS, {
      ...emptyCriteria,
      search: "knuth fantasy",
    });
    expect(result).toEqual([]);
  });

  it("is case-insensitive (uppercase query, lowercase data)", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "TOLKIEN" });
    expect(result).toEqual([tolkien]);
  });

  it("trims and collapses leading / trailing / repeated whitespace", () => {
    const result = filterBooks(ALL_BOOKS, {
      ...emptyCriteria,
      search: "  tolkien   fantasy  ",
    });
    expect(result).toEqual([tolkien]);
  });

  it("whitespace-only search is treated as empty", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "   " });
    expect(result).toEqual(ALL_BOOKS);
  });

  it("books with empty tags do not crash the search", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "doorstop" });
    expect(result).toEqual([]);
  });

  it("tag-only search uses OR within tag values (single token still matches any)", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, search: "math" });
    expect(result).toEqual([knuth]);
  });
});

describe("filterBooks — tags", () => {
  it("empty tag filter returns all books (subject to other criteria)", () => {
    expect(filterBooks(ALL_BOOKS, emptyCriteria)).toEqual(ALL_BOOKS);
  });

  it("single tag: matches books carrying that tag", () => {
    const result = filterBooks(ALL_BOOKS, {
      ...emptyCriteria,
      tags: ["fantasy"],
    });
    expect(result).toEqual([tolkien, rowling]);
  });

  it("multi-tag: OR within selected tags (any of)", () => {
    const result = filterBooks(ALL_BOOKS, {
      ...emptyCriteria,
      tags: ["fantasy", "programming"],
    });
    expect(result).toEqual([tolkien, rowling, knuth]);
  });

  it("unknown tag matches nothing", () => {
    const result = filterBooks(ALL_BOOKS, {
      ...emptyCriteria,
      tags: ["nonexistent"],
    });
    expect(result).toEqual([]);
  });
});

describe("filterBooks — status", () => {
  it("status='all' returns all books (subject to other criteria)", () => {
    expect(filterBooks(ALL_BOOKS, emptyCriteria)).toEqual(ALL_BOOKS);
  });

  it("status='read' returns only read books", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, status: "read" });
    expect(result).toEqual([tolkien, rowling]);
  });

  it("status='reading' returns only reading books", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, status: "reading" });
    expect(result).toEqual([knuth]);
  });

  it("status='want' returns only want books", () => {
    const result = filterBooks(ALL_BOOKS, { ...emptyCriteria, status: "want" });
    expect(result).toEqual([doorstop]);
  });
});

describe("filterBooks — combined criteria", () => {
  it("AND across search, tags, and status", () => {
    const result = filterBooks(ALL_BOOKS, {
      search: "tolkien",
      tags: ["fantasy"],
      status: "read",
    });
    expect(result).toEqual([tolkien]);
  });

  it("AND with a search that excludes everything returns []", () => {
    const result = filterBooks(ALL_BOOKS, {
      search: "knuth",
      tags: ["fantasy"],
      status: "read",
    });
    expect(result).toEqual([]);
  });

  it("search alone against the doorstop (empty tags) does not crash", () => {
    const doorstopOnly: Book[] = [doorstop];
    const result = filterBooks(doorstopOnly, { ...emptyCriteria, search: "a" });
    expect(result).toEqual([doorstop]);
  });
});
