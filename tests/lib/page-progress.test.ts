import { describe, it, expect } from "vitest";
import {
  applyPagesRead,
  applyTargetCurrentPage,
  deriveCurrentPageFromLogs,
  pagesLoggedBefore,
  removeReadingLogForDate,
  sortedReadingLogs,
} from "@/lib/page-progress";
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
    id: overrides.id ?? "log-1",
    date: overrides.date ?? "2026-06-10",
    pagesRead: overrides.pagesRead ?? 20,
    currentPageAfter: overrides.currentPageAfter ?? 20,
    createdAt: overrides.createdAt ?? "2026-06-10T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("deriveCurrentPageFromLogs", () => {
  it("returns null when the book has no logs", () => {
    expect(deriveCurrentPageFromLogs(makeBook())).toBeNull();
  });

  it("sums pagesRead across all logs", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 10 }),
        makeLog({ id: "b", date: "2026-06-02", pagesRead: 15 }),
        makeLog({ id: "c", date: "2026-06-03", pagesRead: 5 }),
      ],
    });
    expect(deriveCurrentPageFromLogs(book)).toBe(30);
  });

  it("ignores malformed log entries", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 10 }),
        // Dropped: no id.
        { date: "2026-06-02", pagesRead: 5, currentPageAfter: 0 } as unknown as ReadingLog,
        // Dropped: zero pagesRead.
        makeLog({ id: "b", date: "2026-06-03", pagesRead: 0 }),
        makeLog({ id: "c", date: "2026-06-04", pagesRead: 20 }),
      ],
    });
    expect(deriveCurrentPageFromLogs(book)).toBe(30);
  });
});

describe("sortedReadingLogs", () => {
  it("returns logs in chronological order", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "b", date: "2026-06-02", pagesRead: 15 }),
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 10 }),
        makeLog({ id: "c", date: "2026-06-03", pagesRead: 5 }),
      ],
    });
    expect(sortedReadingLogs(book).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
});

describe("pagesLoggedBefore", () => {
  it("sums pagesRead from logs strictly before targetDate", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 10 }),
        makeLog({ id: "b", date: "2026-06-02", pagesRead: 15 }),
        makeLog({ id: "c", date: "2026-06-03", pagesRead: 5 }),
      ],
    });
    expect(pagesLoggedBefore(book, "2026-06-02")).toBe(10);
    expect(pagesLoggedBefore(book, "2026-06-03")).toBe(25);
    expect(pagesLoggedBefore(book, "2026-06-01")).toBe(0);
  });
});

describe("applyTargetCurrentPage", () => {
  it("creates a log entry with pagesRead = target on a fresh date", () => {
    const book = makeBook();
    const result = applyTargetCurrentPage(book, "2026-06-10", 30, {
      generateId: () => "fixed-id",
      nowIso: () => "2026-06-10T10:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.readingLogs).toEqual([
      {
        id: "fixed-id",
        date: "2026-06-10",
        pagesRead: 30,
        currentPageAfter: 30,
        createdAt: "2026-06-10T10:00:00.000Z",
        updatedAt: "2026-06-10T10:00:00.000Z",
      },
    ]);
    expect(result.currentPage).toBe(30);
  });

  it("aggregates same-day corrections: 30 -> 10 -> 30 totals 30 pages", () => {
    let book = makeBook();
    const first = applyTargetCurrentPage(book, "2026-06-10", 30, {
      generateId: () => "id-1",
      nowIso: () => "2026-06-10T10:00:00.000Z",
    });
    if (!first.ok) throw new Error("first apply failed");
    book = { ...book, readingLogs: first.readingLogs };

    const second = applyTargetCurrentPage(book, "2026-06-10", 10, {
      generateId: () => "id-1",
      nowIso: () => "2026-06-10T11:00:00.000Z",
    });
    if (!second.ok) throw new Error("second apply failed");
    book = { ...book, readingLogs: second.readingLogs };

    // Correction back to 10: pagesRead = 10 - 0 = 10.
    expect(book.readingLogs?.[0]?.pagesRead).toBe(10);

    const third = applyTargetCurrentPage(book, "2026-06-10", 30, {
      generateId: () => "id-1",
      nowIso: () => "2026-06-10T12:00:00.000Z",
    });
    if (!third.ok) throw new Error("third apply failed");
    book = { ...book, readingLogs: third.readingLogs };

    // Total logged pages for the book: 30, not 50.
    expect(deriveCurrentPageFromLogs(book)).toBe(30);
    expect(book.readingLogs).toHaveLength(1);
    expect(book.readingLogs?.[0]?.pagesRead).toBe(30);
  });

  it("removes the log for the date when target equals pagesBefore (zero delta)", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 30 }),
        makeLog({ id: "b", date: "2026-06-10", pagesRead: 50 }),
      ],
    });
    // Set target on 2026-06-10 to the running sum BEFORE it (30).
    const result = applyTargetCurrentPage(book, "2026-06-10", 30);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Only the 06-01 entry remains, with synchronized
    // currentPageAfter = 30.
    expect(result.readingLogs).toHaveLength(1);
    expect(result.readingLogs?.[0]).toMatchObject({
      id: "a",
      date: "2026-06-01",
      pagesRead: 30,
      currentPageAfter: 30,
    });
  });

  it("clears the log and currentPage when target is undefined", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 30 }),
        makeLog({ id: "b", date: "2026-06-10", pagesRead: 50 }),
      ],
    });
    const result = applyTargetCurrentPage(book, "2026-06-10", undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.readingLogs).toHaveLength(1);
    expect(result.readingLogs?.[0]).toMatchObject({
      id: "a",
      date: "2026-06-01",
      pagesRead: 30,
      currentPageAfter: 30,
    });
    expect(result.currentPage).toBe(30);
  });

  it("returns readingLogs = undefined when clearing the last entry", () => {
    const book = makeBook({
      readingLogs: [makeLog({ id: "a", date: "2026-06-10", pagesRead: 30 })],
    });
    const result = applyTargetCurrentPage(book, "2026-06-10", undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.readingLogs).toBeUndefined();
  });

  it("rejects a negative delta with negativeDelta", () => {
    const book = makeBook({
      readingLogs: [makeLog({ id: "a", date: "2026-06-01", pagesRead: 30 })],
    });
    // 30 already logged before 2026-06-10; target 10 is below 30.
    const result = applyTargetCurrentPage(book, "2026-06-10", 10);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("negativeDelta");
  });

  it("rejects target > totalPages with pageLimit", () => {
    const book = makeBook({ totalPages: 200 });
    const result = applyTargetCurrentPage(book, "2026-06-10", 250);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("pageLimit");
  });

  it("accepts target = totalPages", () => {
    const book = makeBook({ totalPages: 200 });
    const result = applyTargetCurrentPage(book, "2026-06-10", 200, {
      generateId: () => "id",
      nowIso: () => "t",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects non-integer target", () => {
    const book = makeBook();
    const result = applyTargetCurrentPage(book, "2026-06-10", 12.5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("page");
  });

  it("rejects negative target", () => {
    const book = makeBook();
    const result = applyTargetCurrentPage(book, "2026-06-10", -1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("page");
  });

  it("synchronizes currentPageAfter with the running sum after editing an earlier date", () => {
    // Two logs: 30 on 06-01, 20 on 06-10. Running sums 30, 50.
    let book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 30, currentPageAfter: 30 }),
        makeLog({ id: "b", date: "2026-06-10", pagesRead: 20, currentPageAfter: 50 }),
      ],
    });
    // Edit 2026-06-01 to 35 → page 35, delta = 35 - 0 = 35.
    const result = applyTargetCurrentPage(book, "2026-06-01", 35, {
      generateId: () => "id-a",
      nowIso: () => "t",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    book = { ...book, readingLogs: result.readingLogs };
    // 06-01: pagesRead 35, currentPageAfter 35.
    // 06-10: pagesRead 20, currentPageAfter 55.
    expect(book.readingLogs?.[0]?.pagesRead).toBe(35);
    expect(book.readingLogs?.[0]?.currentPageAfter).toBe(35);
    expect(book.readingLogs?.[1]?.pagesRead).toBe(20);
    expect(book.readingLogs?.[1]?.currentPageAfter).toBe(55);
  });
});

describe("applyPagesRead", () => {
  it("adds a new entry with synchronized currentPageAfter", () => {
    const book = makeBook();
    const result = applyPagesRead(book, "2026-06-10", 30, {
      generateId: () => "id",
      nowIso: () => "t",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.readingLogs).toEqual([
      {
        id: "id",
        date: "2026-06-10",
        pagesRead: 30,
        currentPageAfter: 30,
        createdAt: "t",
        updatedAt: "t",
      },
    ]);
  });

  it("replaces the entry for the same date and syncs running sum", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 30, currentPageAfter: 30 }),
        makeLog({ id: "b", date: "2026-06-10", pagesRead: 20, currentPageAfter: 50 }),
      ],
    });
    const result = applyPagesRead(book, "2026-06-10", 40, {
      generateId: () => "id-b",
      nowIso: () => "t2",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.readingLogs?.[1]?.pagesRead).toBe(40);
    expect(result.readingLogs?.[1]?.currentPageAfter).toBe(70);
  });

  it("removes the entry when pagesRead is 0", () => {
    const book = makeBook({
      readingLogs: [makeLog({ id: "a", date: "2026-06-10", pagesRead: 30 })],
    });
    const result = applyPagesRead(book, "2026-06-10", 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.readingLogs).toBeUndefined();
  });

  it("rejects a negative pagesRead", () => {
    const book = makeBook();
    const result = applyPagesRead(book, "2026-06-10", -1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("pagesRead");
  });
});

describe("removeReadingLogForDate", () => {
  it("removes the entry for the date and re-syncs later entries", () => {
    const book = makeBook({
      readingLogs: [
        makeLog({ id: "a", date: "2026-06-01", pagesRead: 30, currentPageAfter: 30 }),
        makeLog({ id: "b", date: "2026-06-10", pagesRead: 20, currentPageAfter: 50 }),
      ],
    });
    const next = removeReadingLogForDate(book, "2026-06-01");
    expect(next).toEqual([
      { ...book.readingLogs![1]!, currentPageAfter: 20 },
    ]);
  });

  it("returns undefined when removing the last entry", () => {
    const book = makeBook({
      readingLogs: [makeLog({ id: "a", date: "2026-06-10", pagesRead: 30 })],
    });
    expect(removeReadingLogForDate(book, "2026-06-10")).toBeUndefined();
  });
});
