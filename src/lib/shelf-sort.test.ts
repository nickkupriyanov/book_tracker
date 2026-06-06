import { describe, it, expect } from "vitest";
import type { Book } from "@/types/book";
import { sortBooks, type SortValue } from "./shelf-sort";

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

describe("sortBooks", () => {
  it("returns a new array (does not return the input reference)", () => {
    const books = [makeBook({ id: "a" })];
    const result = sortBooks(books, "title-az");
    expect(result).not.toBe(books);
  });

  it("does not mutate the input array", () => {
    const a = makeBook({ id: "a", title: "B" });
    const b = makeBook({ id: "b", title: "A" });
    const input = [a, b];
    const snapshot = [...input];
    sortBooks(input, "title-az");
    expect(input).toEqual(snapshot);
  });

  it("preserves order on ties (stable sort per ECMA-262)", () => {
    // Two books with the same title and same createdAt —
    // input order must survive.
    const first = makeBook({ id: "first", title: "Same" });
    const second = makeBook({ id: "second", title: "Same" });
    const result = sortBooks([first, second], "title-az");
    expect(result.map((b) => b.id)).toEqual(["first", "second"]);
  });

  it("'recently-added' sorts by createdAt desc (matches store invariant)", () => {
    const old = makeBook({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" });
    const recent = makeBook({
      id: "recent",
      createdAt: "2026-06-06T00:00:00.000Z",
    });
    const older = makeBook({
      id: "older",
      createdAt: "2025-12-01T00:00:00.000Z",
    });
    const result = sortBooks([old, recent, older], "recently-added");
    expect(result.map((b) => b.id)).toEqual(["recent", "old", "older"]);
  });

  it("'recently-started' sorts by startedAt desc, nulls last", () => {
    const a = makeBook({ id: "a", startedAt: "2026-01-01" });
    const b = makeBook({ id: "b", startedAt: "2026-06-01" });
    const c = makeBook({ id: "c", startedAt: "2026-03-01" });
    const d = makeBook({ id: "d" }); // no startedAt
    const e = makeBook({ id: "e" }); // no startedAt
    const result = sortBooks([a, b, c, d, e], "recently-started");
    expect(result.map((b) => b.id)).toEqual(["b", "c", "a", "d", "e"]);
  });

  it("'recently-finished' sorts by finishedAt desc, nulls last", () => {
    const a = makeBook({ id: "a", finishedAt: "2026-01-01" });
    const b = makeBook({ id: "b", finishedAt: "2026-06-01" });
    const c = makeBook({ id: "c", finishedAt: "2026-03-01" });
    const d = makeBook({ id: "d" });
    const result = sortBooks([a, b, c, d], "recently-finished");
    expect(result.map((b) => b.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("'title-az' sorts alphabetically by title (A→Z)", () => {
    const c = makeBook({ id: "c", title: "Charlie" });
    const a = makeBook({ id: "a", title: "Alpha" });
    const b = makeBook({ id: "b", title: "Bravo" });
    const result = sortBooks([c, a, b], "title-az");
    expect(result.map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("'author-az' sorts alphabetically by author (A→Z)", () => {
    const t = makeBook({ id: "t", author: "Tolkien" });
    const k = makeBook({ id: "k", author: "Knuth" });
    const r = makeBook({ id: "r", author: "Rowling" });
    const result = sortBooks([t, k, r], "author-az");
    expect(result.map((b) => b.id)).toEqual(["k", "r", "t"]);
  });

  it("'highest-rated' sorts by rating desc, nulls last", () => {
    const five = makeBook({ id: "5", rating: 5 });
    const three = makeBook({ id: "3", rating: 3 });
    const one = makeBook({ id: "1", rating: 1 });
    const unrated1 = makeBook({ id: "u1" });
    const unrated2 = makeBook({ id: "u2" });
    const result = sortBooks([five, three, one, unrated1, unrated2], "highest-rated");
    expect(result.map((b) => b.id)).toEqual(["5", "3", "1", "u1", "u2"]);
  });

  it("'longest-read' sorts by (finishedAt - startedAt) days desc, nulls last", () => {
    const short = makeBook({
      id: "short",
      startedAt: "2026-04-01",
      finishedAt: "2026-04-08", // 7 days
    });
    const long = makeBook({
      id: "long",
      startedAt: "2026-01-01",
      finishedAt: "2026-04-01", // 90 days
    });
    const medium = makeBook({
      id: "medium",
      startedAt: "2026-03-01",
      finishedAt: "2026-03-15", // 14 days
    });
    const noStart = makeBook({
      id: "no-start",
      finishedAt: "2026-04-01",
    });
    const noEnd = makeBook({
      id: "no-end",
      startedAt: "2026-03-01",
    });
    const neither = makeBook({ id: "neither" });
    const result = sortBooks(
      [short, long, medium, noStart, noEnd, neither],
      "longest-read"
    );
    expect(result.map((b) => b.id)).toEqual([
      "long",
      "medium",
      "short",
      "no-start",
      "no-end",
      "neither",
    ]);
  });
});

describe("SortValue", () => {
  it("is a closed union of 7 discriminators", () => {
    const values: SortValue[] = [
      "recently-added",
      "recently-started",
      "recently-finished",
      "title-az",
      "author-az",
      "highest-rated",
      "longest-read",
    ];
    expect(values).toHaveLength(7);
  });
});
