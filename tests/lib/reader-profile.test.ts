import { describe, it, expect } from "vitest";
import { buildReaderProfile } from "@/lib/reader-profile";
import type { Book, ReadingLog } from "@/types/book";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Piranesi",
    author: "Susanna Clarke",
    status: "reading",
    tags: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLog(overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: "log-1",
    date: "2026-06-10",
    pagesRead: 20,
    currentPageAfter: 20,
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildReaderProfile — identity", () => {
  it("uses the fixed 'Quiet Reader' nickname", () => {
    const profile = buildReaderProfile([], { now: new Date(2026, 5, 15) });
    expect(profile.nickname).toBe("Quiet Reader");
  });

  it("derives 'QR' as the avatar monogram from the nickname", () => {
    const profile = buildReaderProfile([], { now: new Date(2026, 5, 15) });
    expect(profile.initials).toBe("QR");
  });
});

describe("buildReaderProfile — read count", () => {
  it("returns 0 when no books are read", () => {
    const books = [
      makeBook({ id: "a", status: "want" }),
      makeBook({ id: "b", status: "reading" }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.readCount).toBe(0);
  });

  it("counts only books with status === 'read'", () => {
    const books = [
      makeBook({ id: "a", status: "read" }),
      makeBook({ id: "b", status: "read" }),
      makeBook({ id: "c", status: "reading" }),
      makeBook({ id: "d", status: "want" }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.readCount).toBe(2);
  });
});

describe("buildReaderProfile — page total", () => {
  it("returns 0 when no books have reading logs", () => {
    const books = [makeBook({ id: "a", status: "reading" })];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.totalPages).toBe(0);
  });

  it("sums pagesRead across every log of every book", () => {
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
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.totalPages).toBe(50);
  });

  it("ignores non-positive or malformed pagesRead values", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-01", pagesRead: 30 }),
          // Defensive: legacy or future malformed records.
          makeLog({ id: "a2", date: "2026-06-02", pagesRead: 0 }),
          makeLog({
            id: "a3",
            date: "2026-06-03",
            pagesRead: Number.NaN,
          }),
          makeLog({ id: "a4", date: "2026-06-04", pagesRead: -5 }),
        ],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.totalPages).toBe(30);
  });
});

describe("buildReaderProfile — streak", () => {
  it("is 0 when there are no reading dates at all", () => {
    const books = [makeBook({ id: "a" })];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(0);
  });

  it("is 0 when the most recent reading date is older than yesterday", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-10" })],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(0);
  });

  it("counts today as a 1-day streak", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-15" })],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(1);
  });

  it("counts yesterday as a 1-day active streak when today has no log", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-14" })],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(1);
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
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(3);
  });

  it("walks back consecutive days from yesterday when today is missing", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-12" }),
          makeLog({ id: "a2", date: "2026-06-13" }),
          makeLog({ id: "a3", date: "2026-06-14" }),
        ],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(3);
  });

  it("breaks the streak at the first missing day", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-11" }),
          // 2026-06-12 is missing
          makeLog({ id: "a3", date: "2026-06-13" }),
          makeLog({ id: "a4", date: "2026-06-14" }),
          makeLog({ id: "a5", date: "2026-06-15" }),
        ],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(3);
  });

  it("deduplicates the same reading date across multiple books", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-15" })],
      }),
      makeBook({
        id: "b",
        readingLogs: [makeLog({ id: "b1", date: "2026-06-15" })],
      }),
      makeBook({
        id: "c",
        readingLogs: [makeLog({ id: "c1", date: "2026-06-14" })],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(2);
  });

  it("crosses month boundaries", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-05-30" }),
          makeLog({ id: "a2", date: "2026-05-31" }),
          makeLog({ id: "a3", date: "2026-06-01" }),
        ],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 1) });
    expect(profile.streakDays).toBe(3);
  });

  it("crosses year boundaries", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2025-12-31" }),
          makeLog({ id: "a2", date: "2026-01-01" }),
        ],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 0, 1) });
    expect(profile.streakDays).toBe(2);
  });
});

describe("buildReaderProfile — defensive parsing", () => {
  it("ignores malformed readingLogs entries", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: [
          makeLog({ id: "a1", date: "2026-06-15", pagesRead: 10 }),
          // Garbage date should not contribute.
          makeLog({ id: "a2", date: "not-a-date", pagesRead: 5 }),
        ],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.streakDays).toBe(1);
    expect(profile.totalPages).toBe(15);
  });

  it("returns a calm zero-activity profile for an empty library", () => {
    const profile = buildReaderProfile([], { now: new Date(2026, 5, 15) });
    expect(profile.readCount).toBe(0);
    expect(profile.streakDays).toBe(0);
    expect(profile.totalPages).toBe(0);
  });
});

describe("buildReaderProfile — status copy", () => {
  it("returns 'Quiet beginning' when there is no activity", () => {
    const books = [
      makeBook({ id: "a", status: "want" }),
      makeBook({ id: "b", status: "reading" }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.status).toBe("Quiet beginning");
  });

  it("returns 'Shelf keeper' when at least one book is finished but no pages are logged", () => {
    const books = [makeBook({ id: "a", status: "read" })];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.status).toBe("Shelf keeper");
  });

  it("returns 'Page wanderer' when there are logged pages without a long streak", () => {
    const books = [
      makeBook({
        id: "a",
        status: "reading",
        readingLogs: [makeLog({ id: "a1", date: "2026-06-15", pagesRead: 30 })],
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.status).toBe("Page wanderer");
  });

  it("returns 'Seasoned reader' when ten or more books are finished", () => {
    const books = Array.from({ length: 10 }, (_, i) =>
      makeBook({ id: `b-${i}`, status: "read" })
    );
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.status).toBe("Seasoned reader");
  });

  it("returns 'On a steady streak' when the streak reaches seven days", () => {
    const books = [
      makeBook({
        id: "a",
        readingLogs: Array.from({ length: 7 }, (_, i) =>
          makeLog({
            id: `l-${i}`,
            date: `2026-06-${String(9 + i).padStart(2, "0")}`,
          })
        ),
      }),
    ];
    const profile = buildReaderProfile(books, { now: new Date(2026, 5, 15) });
    expect(profile.status).toBe("On a steady streak");
  });
});
