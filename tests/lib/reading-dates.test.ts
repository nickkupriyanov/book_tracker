import { describe, expect, it } from "vitest";
import { deriveReadingDates, isLocalDateString } from "@/lib/reading-dates";
import type { Book, ReadingLog } from "@/types/book";

function makeLog(date: string, overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: overrides.id ?? `log-${date}`,
    date,
    pagesRead: overrides.pagesRead ?? 10,
    currentPageAfter: overrides.currentPageAfter ?? 10,
    createdAt: overrides.createdAt ?? `${date}T10:00:00.000Z`,
    updatedAt: overrides.updatedAt ?? `${date}T10:00:00.000Z`,
  };
}

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? "book-1",
    title: overrides.title ?? "Book",
    author: overrides.author ?? "Author",
    status: overrides.status ?? "reading",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deriveReadingDates", () => {
  it("returns null dates when a book has no reading logs", () => {
    expect(deriveReadingDates(makeBook())).toEqual({
      startedAt: null,
      finishedAt: null,
    });
  });

  it("uses the earliest valid log date as startedAt", () => {
    const book = makeBook({
      readingLogs: [
        makeLog("2026-06-10"),
        makeLog("2026-05-01"),
        makeLog("2026-06-01"),
      ],
    });
    expect(deriveReadingDates(book).startedAt).toBe("2026-05-01");
  });

  it("uses the latest valid log date as finishedAt only for read books", () => {
    const logs = [makeLog("2026-05-01"), makeLog("2026-06-10")];
    expect(
      deriveReadingDates(makeBook({ status: "read", readingLogs: logs }))
    ).toEqual({
      startedAt: "2026-05-01",
      finishedAt: "2026-06-10",
    });
    expect(
      deriveReadingDates(makeBook({ status: "reading", readingLogs: logs }))
    ).toEqual({
      startedAt: "2026-05-01",
      finishedAt: null,
    });
  });

  it("ignores malformed or impossible log dates", () => {
    const book = makeBook({
      status: "read",
      readingLogs: [
        makeLog("not-a-date"),
        makeLog("2026-02-31"),
        makeLog("2026-04-01"),
      ],
    });
    expect(deriveReadingDates(book)).toEqual({
      startedAt: "2026-04-01",
      finishedAt: "2026-04-01",
    });
  });

  it("ignores legacy stored date fields", () => {
    const legacy = {
      ...makeBook({ status: "read" }),
      startedAt: "2026-01-01",
      finishedAt: "2026-01-02",
    };
    expect(deriveReadingDates(legacy)).toEqual({
      startedAt: null,
      finishedAt: null,
    });
  });
});

describe("isLocalDateString", () => {
  it("accepts real YYYY-MM-DD calendar dates", () => {
    expect(isLocalDateString("2026-06-09")).toBe(true);
  });

  it("rejects non-strings, malformed strings, and impossible dates", () => {
    expect(isLocalDateString(undefined)).toBe(false);
    expect(isLocalDateString("2026/06/09")).toBe(false);
    expect(isLocalDateString("2026-02-31")).toBe(false);
  });
});
