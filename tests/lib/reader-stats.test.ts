import { describe, it, expect } from "vitest";
import { buildReaderStats } from "@/lib/reader-stats";
import type { Book, ReadingLog } from "@/types/book";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? "book-1",
    title: overrides.title ?? "Untitled",
    author: overrides.author ?? "Anonymous",
    status: overrides.status ?? "want",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLog(overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: overrides.id ?? "log-1",
    date: overrides.date ?? "2026-06-15",
    pagesRead: overrides.pagesRead ?? 10,
    currentPageAfter: overrides.currentPageAfter ?? 10,
    createdAt: overrides.createdAt ?? "2026-06-15T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-15T10:00:00.000Z",
    ...overrides,
  };
}

const NOW = new Date(2026, 5, 15);

describe("buildReaderStats — empty / sparse", () => {
  it("returns an empty portrait for an empty library", () => {
    const stats = buildReaderStats([], { now: NOW });
    expect(stats.isEmpty).toBe(true);
    expect(stats.hero.readCount).toBe(0);
    expect(stats.hero.loggedPages).toBe(0);
    expect(stats.hero.averageRating).toBeNull();
    expect(stats.hero.streakDays).toBe(0);
    expect(stats.hero.topTag).toBeNull();
    expect(stats.hero.hasSparseData).toBe(false);
    expect(stats.favoriteTags).toEqual([]);
    expect(stats.topRated).toEqual([]);
    expect(stats.rhythm.activeDays).toBe(0);
    expect(stats.rhythm.loggedPages).toBe(0);
    expect(stats.rhythm.bestDay).toBeNull();
    expect(stats.rhythm.hasLegacyDaysOnly).toBe(false);
    expect(stats.shelf).toEqual({ want: 0, reading: 0, read: 0, total: 0 });
  });

  it("flags a sparse library (no ratings and no tags) as hasSparseData", () => {
    const books = [
      makeBook({ id: "a", status: "reading" }),
      makeBook({ id: "b", status: "want" }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.isEmpty).toBe(false);
    expect(stats.hero.hasSparseData).toBe(true);
    expect(stats.hero.averageRating).toBeNull();
    expect(stats.hero.topTag).toBeNull();
  });
});

describe("buildReaderStats — hero metrics", () => {
  it("counts only books with status === 'read' as readCount", () => {
    const books = [
      makeBook({ id: "a", status: "read" }),
      makeBook({ id: "b", status: "read" }),
      makeBook({ id: "c", status: "reading" }),
      makeBook({ id: "d", status: "want" }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.hero.readCount).toBe(2);
  });

  it("computes a one-decimal average rating across rated books only", () => {
    const books = [
      makeBook({ id: "a", status: "read", rating: 5 }),
      makeBook({ id: "b", status: "read", rating: 4 }),
      makeBook({ id: "c", status: "read", rating: 3 }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.hero.averageRating).toBe(4);
  });

  it("rounds the average to one decimal place", () => {
    const books = [
      makeBook({ id: "a", status: "read", rating: 5 }),
      makeBook({ id: "b", status: "read", rating: 4 }),
      makeBook({ id: "c", status: "read", rating: 4 }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.hero.averageRating).toBe(4.3);
  });

  it("sums logged pages across every book and every log", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-01", pagesRead: 10 }),
          makeLog({ id: "a2", date: "2026-06-02", pagesRead: 15 }),
        ],
      }),
      makeBook({
        id: "b",
        readingLogs: [makeLog({ id: "b1", date: "2026-06-01", pagesRead: 25 })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.hero.loggedPages).toBe(50);
    expect(stats.rhythm.loggedPages).toBe(50);
  });

  it("ignores non-positive and malformed page values", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", pagesRead: 30 }),
          makeLog({ id: "a2", pagesRead: 0 }),
          makeLog({ id: "a3", pagesRead: Number.NaN }),
          makeLog({ id: "a4", pagesRead: -5 }),
        ],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.hero.loggedPages).toBe(30);
  });

  it("uses the top tag from the whole library", () => {
    const books = [
      makeBook({ id: "a", tags: ["fantasy", "classic"] }),
      makeBook({ id: "b", tags: ["fantasy", "young-adult"] }),
      makeBook({ id: "c", tags: ["essays"] }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.hero.topTag).toBe("fantasy");
  });
});

describe("buildReaderStats — favorite tags", () => {
  it("sorts tags by count desc, then label asc (FR-5)", () => {
    const books = [
      makeBook({ id: "a", tags: ["essay", "history"] }),
      makeBook({ id: "b", tags: ["essay", "biography"] }),
      makeBook({ id: "c", tags: ["essay"] }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.favoriteTags).toEqual([
      { label: "essay", count: 3 },
      { label: "biography", count: 1 },
      { label: "history", count: 1 },
    ]);
  });

  it("ignores blank tag values", () => {
    const books = [
      makeBook({ id: "a", tags: ["fiction", "  ", ""] }),
      makeBook({ id: "b", tags: ["fiction"] }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.favoriteTags).toEqual([{ label: "fiction", count: 2 }]);
  });
});

describe("buildReaderStats — top-rated books (FR-6)", () => {
  it("excludes unrated books", () => {
    const books = [
      makeBook({ id: "a", title: "A", status: "read", rating: 5 }),
      makeBook({ id: "b", title: "B", status: "read" }),
      makeBook({ id: "c", title: "C", status: "read", rating: 4 }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.topRated.map((b) => b.id)).toEqual(["a", "c"]);
  });

  it("caps the list at five books", () => {
    const books = Array.from({ length: 8 }, (_, i) =>
      makeBook({
        id: `b-${i}`,
        title: `Book ${i}`,
        status: "read",
        rating: 5,
      })
    );
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.topRated).toHaveLength(5);
  });

  it("sorts by rating desc, finishedAt desc, createdAt desc, title asc", () => {
    const books = [
      makeBook({
        id: "a",
        title: "Aardvark",
        status: "read",
        rating: 5,
        finishedAt: "2026-05-01",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      makeBook({
        id: "b",
        title: "Beetle",
        status: "read",
        rating: 5,
        finishedAt: "2026-06-01",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      makeBook({
        id: "c",
        title: "Crane",
        status: "read",
        rating: 5,
        finishedAt: "2026-06-01",
        createdAt: "2026-02-01T00:00:00.000Z",
      }),
      makeBook({
        id: "d",
        title: "Daisy",
        status: "read",
        rating: 4,
        finishedAt: "2026-06-15",
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.topRated.map((b) => b.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("treats an invalid finishedAt as null in tie-breaks", () => {
    const books = [
      makeBook({
        id: "a",
        title: "Aardvark",
        status: "read",
        rating: 5,
        finishedAt: "not-a-date",
        createdAt: "2026-02-01T00:00:00.000Z",
      }),
      makeBook({
        id: "b",
        title: "Beetle",
        status: "read",
        rating: 5,
        finishedAt: "2026-06-01",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.topRated.map((b) => b.id)).toEqual(["b", "a"]);
  });
});

describe("buildReaderStats — reading rhythm", () => {
  it("counts streak as 0 when the most recent activity is older than yesterday", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-10" })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.streakDays).toBe(0);
  });

  it("counts today as a 1-day streak", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-15" })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.streakDays).toBe(1);
  });

  it("walks back consecutive days from today", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-13" }),
          makeLog({ id: "a2", date: "2026-06-14" }),
          makeLog({ id: "a3", date: "2026-06-15" }),
        ],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.streakDays).toBe(3);
  });

  it("combines readingLogs and legacy readingDays for the streak (FR-7)", () => {
    const books = [
      makeBook({
        id: "a",
        readingDays: ["2026-06-13", "2026-06-14"],
        readingLogs: [makeLog({ id: "a1", date: "2026-06-15" })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.streakDays).toBe(3);
  });

  it("uses readingLogs.pagesRead for the best day (FR-8)", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-10", pagesRead: 30 }),
          makeLog({ id: "a2", date: "2026-06-12", pagesRead: 80 }),
        ],
      }),
      makeBook({
        id: "b",
        readingLogs: [makeLog({ id: "b1", date: "2026-06-12", pagesRead: 20 })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.bestDay).toEqual({
      date: "2026-06-12",
      pagesRead: 100,
    });
  });

  it("breaks best-day ties by earliest date (deterministic)", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-10", pagesRead: 50 })],
      }),
      makeBook({
        id: "b",
        readingLogs: [makeLog({ id: "b1", date: "2026-06-09", pagesRead: 50 })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.bestDay).toEqual({
      date: "2026-06-09",
      pagesRead: 50,
    });
  });

  it("flags hasLegacyDaysOnly when only legacy readingDays exist (FR-9)", () => {
    const books = [
      makeBook({
        id: "a",
        readingDays: ["2026-06-14", "2026-06-15"],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.hasLegacyDaysOnly).toBe(true);
    expect(stats.rhythm.bestDay).toBeNull();
    expect(stats.rhythm.loggedPages).toBe(0);
    expect(stats.rhythm.streakDays).toBe(2);
  });

  it("does not flag hasLegacyDaysOnly when any readingLogs.pagesRead is positive", () => {
    const books = [
      makeBook({
        id: "a",
        readingDays: ["2026-06-15"],
        readingLogs: [makeLog({ id: "a1", date: "2026-06-15", pagesRead: 5 })],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.hasLegacyDaysOnly).toBe(false);
  });
});

describe("buildReaderStats — shelf balance (FR-10)", () => {
  it("counts books per status and totals them", () => {
    const books = [
      makeBook({ id: "a", status: "want" }),
      makeBook({ id: "b", status: "want" }),
      makeBook({ id: "c", status: "reading" }),
      makeBook({ id: "d", status: "read" }),
      makeBook({ id: "e", status: "read" }),
      makeBook({ id: "f", status: "read" }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.shelf).toEqual({
      want: 2,
      reading: 1,
      read: 3,
      total: 6,
    });
  });
});

describe("buildReaderStats — defensive parsing", () => {
  it("ignores malformed readingLogs dates and pagesRead", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-15", pagesRead: 10 }),
          makeLog({ id: "a2", date: "garbage", pagesRead: 99 }),
          makeLog({ id: "a3", date: "2026-02-30", pagesRead: 99 }),
        ],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.streakDays).toBe(1);
    expect(stats.rhythm.bestDay?.pagesRead).toBe(10);
  });

  it("ignores malformed legacy readingDays entries", () => {
    const books = [
      makeBook({
        id: "a",
        readingDays: ["2026-06-15", "garbage", "2026/06/14"],
      }),
    ];
    const stats = buildReaderStats(books, { now: NOW });
    expect(stats.rhythm.streakDays).toBe(1);
    expect(stats.rhythm.activeDays).toBe(1);
  });
});
