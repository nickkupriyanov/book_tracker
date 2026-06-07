import { describe, it, expect } from "vitest";
import {
  currentCalendarMonth,
  shiftCalendarMonth,
  buildReadingCalendarMonth,
} from "@/lib/reading-calendar";
import { READING_CALENDAR_FALLBACK_COLOR } from "@/lib/cover-color";
import type { Book } from "@/types/book";

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

describe("currentCalendarMonth", () => {
  it("returns the current local year and 0-based month", () => {
    const now = new Date(2026, 5, 15); // June 15, 2026
    const result = currentCalendarMonth(now);
    expect(result).toEqual({ year: 2026, month: 5 });
  });

  it("returns January as month 0", () => {
    const result = currentCalendarMonth(new Date(2026, 0, 1));
    expect(result.month).toBe(0);
  });

  it("returns December as month 11", () => {
    const result = currentCalendarMonth(new Date(2026, 11, 31));
    expect(result.month).toBe(11);
  });
});

describe("shiftCalendarMonth", () => {
  it("shifts forward within the same year", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 5 }, 1)).toEqual({
      year: 2026,
      month: 6,
    });
  });

  it("shifts backward within the same year", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 5 }, -1)).toEqual({
      year: 2026,
      month: 4,
    });
  });

  it("wraps from December to January of next year", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
  });

  it("wraps from January to December of previous year", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
  });

  it("shifts by multiple months and crosses the year boundary", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 10 }, 3)).toEqual({
      year: 2027,
      month: 1,
    });
  });

  it("returns the same month when delta is 0", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 5 }, 0)).toEqual({
      year: 2026,
      month: 5,
    });
  });
});

describe("buildReadingCalendarMonth", () => {
  describe("days", () => {
    it("returns exactly 30 days for June", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      expect(result.days).toHaveLength(30);
    });

    it("returns exactly 31 days for July", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 6 });
      expect(result.days).toHaveLength(31);
    });

    it("returns 28 days for non-leap-year February", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 1 });
      expect(result.days).toHaveLength(28);
    });

    it("returns 29 days for leap-year February", () => {
      const result = buildReadingCalendarMonth([], { year: 2024, month: 1 });
      expect(result.days).toHaveLength(29);
    });

    it("uses YYYY-MM-DD dates with leading zeros", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      expect(result.days[0]?.date).toBe("2026-06-01");
      expect(result.days[9]?.date).toBe("2026-06-10");
      expect(result.days[29]?.date).toBe("2026-06-30");
    });

    it("labels dayOfMonth as a 1-based number", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      expect(result.days.map((d) => d.dayOfMonth)).toEqual(
        Array.from({ length: 30 }, (_, i) => i + 1)
      );
    });
  });

  describe("label", () => {
    it("formats the label as 'Month YYYY'", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      expect(result.label).toBe("June 2026");
    });

    it("uses the right month name for January", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 0 });
      expect(result.label).toBe("January 2026");
    });

    it("uses the right month name for December", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 11 });
      expect(result.label).toBe("December 2026");
    });
  });

  describe("hasLoggedDays", () => {
    it("is false for an empty library", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      expect(result.hasLoggedDays).toBe(false);
    });

    it("is false when no books are logged in the visible month", () => {
      const book = makeBook({ readingDays: ["2026-07-01"] });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      expect(result.hasLoggedDays).toBe(false);
    });

    it("is true when a book is logged in the visible month", () => {
      const book = makeBook({ readingDays: ["2026-06-10"] });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      expect(result.hasLoggedDays).toBe(true);
    });

    it("is true when at least one of several books is logged in the month", () => {
      const a = makeBook({ id: "a", readingDays: ["2026-07-01"] });
      const b = makeBook({ id: "b", readingDays: ["2026-06-05"] });
      const result = buildReadingCalendarMonth([a, b], {
        year: 2026,
        month: 5,
      });
      expect(result.hasLoggedDays).toBe(true);
    });
  });

  describe("day books and colors", () => {
    it("attaches a book to the day matching its readingDay", () => {
      const book = makeBook({
        readingDays: ["2026-06-10"],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.books).toHaveLength(1);
      expect(day?.books[0]?.id).toBe("book-1");
      expect(day?.books[0]?.color).toBe("#b85b45");
    });

    it("leaves untouched days with an empty books array", () => {
      const book = makeBook({ readingDays: ["2026-06-10"] });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      const day = result.days.find((d) => d.date === "2026-06-09");
      expect(day?.books).toEqual([]);
    });

    it("uses the fallback color when the book has no coverColor", () => {
      const book = makeBook({ readingDays: ["2026-06-10"] });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.books[0]?.color).toBe(READING_CALENDAR_FALLBACK_COLOR);
    });

    it("visibleColors has one entry for a single-book day", () => {
      const book = makeBook({
        readingDays: ["2026-06-10"],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.visibleColors).toEqual(["#b85b45"]);
    });

    it("visibleColors has up to three entries for multi-book days", () => {
      const a = makeBook({
        id: "a",
        title: "A",
        readingDays: ["2026-06-10"],
        coverColor: "#aa0000",
      });
      const b = makeBook({
        id: "b",
        title: "B",
        readingDays: ["2026-06-10"],
        coverColor: "#00aa00",
      });
      const c = makeBook({
        id: "c",
        title: "C",
        readingDays: ["2026-06-10"],
        coverColor: "#0000aa",
      });
      const result = buildReadingCalendarMonth([a, b, c], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.visibleColors).toEqual(["#aa0000", "#00aa00", "#0000aa"]);
      expect(day?.books).toHaveLength(3);
    });

    it("truncates visibleColors to three when more than three books share a day", () => {
      const a = makeBook({
        id: "a",
        title: "A",
        readingDays: ["2026-06-10"],
        coverColor: "#aa0000",
      });
      const b = makeBook({
        id: "b",
        title: "B",
        readingDays: ["2026-06-10"],
        coverColor: "#00aa00",
      });
      const c = makeBook({
        id: "c",
        title: "C",
        readingDays: ["2026-06-10"],
        coverColor: "#0000aa",
      });
      const d = makeBook({
        id: "d",
        title: "D",
        readingDays: ["2026-06-10"],
        coverColor: "#aaaa00",
      });
      const result = buildReadingCalendarMonth([a, b, c, d], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.visibleColors).toHaveLength(3);
      expect(day?.books).toHaveLength(4);
    });

    it("sorts day books by title, then id", () => {
      const z = makeBook({
        id: "z",
        title: "Zebra",
        readingDays: ["2026-06-10"],
        coverColor: "#aa0000",
      });
      const a = makeBook({
        id: "a",
        title: "Apple",
        readingDays: ["2026-06-10"],
        coverColor: "#00aa00",
      });
      const result = buildReadingCalendarMonth([z, a], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.books.map((b) => b.id)).toEqual(["a", "z"]);
    });

    it("breaks title ties with id", () => {
      const late = makeBook({
        id: "z-2",
        title: "Same",
        readingDays: ["2026-06-10"],
        coverColor: "#aa0000",
      });
      const early = makeBook({
        id: "a-1",
        title: "Same",
        readingDays: ["2026-06-10"],
        coverColor: "#00aa00",
      });
      const result = buildReadingCalendarMonth([late, early], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.books.map((b) => b.id)).toEqual(["a-1", "z-2"]);
    });
  });

  describe("accessible labels", () => {
    it("labels empty days as 'No reading logged'", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      const day = result.days[0];
      expect(day?.ariaLabel).toMatch(/2026-06-01/);
      expect(day?.ariaLabel).toMatch(/no reading logged/i);
      expect(day?.title).toBe(day?.ariaLabel);
    });

    it("includes the date and the book title in the label for a single-book day", () => {
      const book = makeBook({
        readingDays: ["2026-06-10"],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([book], { year: 2026, month: 5 });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.ariaLabel).toMatch(/2026-06-10/);
      expect(day?.ariaLabel).toMatch(/Piranesi/);
    });

    it("lists all book titles in the label for a multi-book day, even when visibleColors is truncated", () => {
      const a = makeBook({
        id: "a",
        title: "Alpha",
        readingDays: ["2026-06-10"],
        coverColor: "#aa0000",
      });
      const b = makeBook({
        id: "b",
        title: "Beta",
        readingDays: ["2026-06-10"],
        coverColor: "#00aa00",
      });
      const c = makeBook({
        id: "c",
        title: "Gamma",
        readingDays: ["2026-06-10"],
        coverColor: "#0000aa",
      });
      const d = makeBook({
        id: "d",
        title: "Delta",
        readingDays: ["2026-06-10"],
        coverColor: "#aaaa00",
      });
      const result = buildReadingCalendarMonth([a, b, c, d], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.ariaLabel).toContain("Alpha");
      expect(day?.ariaLabel).toContain("Beta");
      expect(day?.ariaLabel).toContain("Gamma");
      expect(day?.ariaLabel).toContain("Delta");
    });
  });

  describe("legend", () => {
    it("is empty for a library with no logged days in the month", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 5 });
      expect(result.legend).toEqual([]);
    });

    it("omits books that have no reading days in the visible month", () => {
      const a = makeBook({
        id: "a",
        title: "In Month",
        readingDays: ["2026-06-10"],
        coverColor: "#b85b45",
      });
      const b = makeBook({
        id: "b",
        title: "Other Month",
        readingDays: ["2026-07-10"],
        coverColor: "#0000aa",
      });
      const result = buildReadingCalendarMonth([a, b], {
        year: 2026,
        month: 5,
      });
      expect(result.legend).toHaveLength(1);
      expect(result.legend[0]?.bookId).toBe("a");
    });

    it("deduplicates books that appear on multiple days in the month", () => {
      const a = makeBook({
        id: "a",
        title: "Repeat",
        readingDays: ["2026-06-10", "2026-06-11", "2026-06-12"],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([a], { year: 2026, month: 5 });
      expect(result.legend).toHaveLength(1);
    });

    it("sorts legend by first reading day in the month, then title, then id", () => {
      const early = makeBook({
        id: "e",
        title: "Early",
        readingDays: ["2026-06-05"],
        coverColor: "#aa0000",
      });
      const lateTitle = makeBook({
        id: "l",
        title: "Late",
        readingDays: ["2026-06-20"],
        coverColor: "#00aa00",
      });
      const sameDay1 = makeBook({
        id: "s-a",
        title: "Same",
        readingDays: ["2026-06-10"],
        coverColor: "#0000aa",
      });
      const sameDay2 = makeBook({
        id: "s-z",
        title: "Same",
        readingDays: ["2026-06-10"],
        coverColor: "#aaaa00",
      });
      const result = buildReadingCalendarMonth(
        [lateTitle, sameDay1, sameDay2, early],
        { year: 2026, month: 5 }
      );
      expect(result.legend.map((l) => l.bookId)).toEqual([
        "e",
        "s-a",
        "s-z",
        "l",
      ]);
    });

    it("uses the book's coverColor (or fallback) in the legend entry", () => {
      const withColorBook = makeBook({
        id: "with",
        title: "With color",
        readingDays: ["2026-06-10"],
        coverColor: "#b85b45",
      });
      const withoutColorBook = makeBook({
        id: "without",
        title: "Without color",
        readingDays: ["2026-06-15"],
      });
      const result = buildReadingCalendarMonth(
        [withColorBook, withoutColorBook],
        { year: 2026, month: 5 }
      );
      const withEntry = result.legend.find((l) => l.bookId === "with");
      const withoutEntry = result.legend.find((l) => l.bookId === "without");
      expect(withEntry?.color).toBe("#b85b45");
      expect(withoutEntry?.color).toBe(READING_CALENDAR_FALLBACK_COLOR);
    });
  });

  describe("readingLogs (spec 016)", () => {
    it("attaches a book to the day matching its readingLog date", () => {
      const book = makeBook({
        readingLogs: [
          {
            id: "log-1",
            date: "2026-06-10",
            pagesRead: 30,
            currentPageAfter: 120,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([book], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.books).toHaveLength(1);
      expect(day?.books[0]?.id).toBe("book-1");
      expect(day?.books[0]?.pagesRead).toBe(30);
    });

    it("sorts books by pagesRead descending within a day", () => {
      const few = makeBook({
        id: "few",
        title: "Few Pages",
        readingLogs: [
          {
            id: "log-1",
            date: "2026-06-10",
            pagesRead: 10,
            currentPageAfter: 10,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#aa0000",
      });
      const many = makeBook({
        id: "many",
        title: "Many Pages",
        readingLogs: [
          {
            id: "log-2",
            date: "2026-06-10",
            pagesRead: 50,
            currentPageAfter: 50,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#00aa00",
      });
      const result = buildReadingCalendarMonth([few, many], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.books[0]?.id).toBe("many");
      expect(day?.books[1]?.id).toBe("few");
    });

    it("visibleColors reflects top-three books by pagesRead", () => {
      const a = makeBook({
        id: "a",
        title: "A",
        readingLogs: [
          {
            id: "log-1",
            date: "2026-06-10",
            pagesRead: 5,
            currentPageAfter: 5,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#aa0000",
      });
      const b = makeBook({
        id: "b",
        title: "B",
        readingLogs: [
          {
            id: "log-2",
            date: "2026-06-10",
            pagesRead: 30,
            currentPageAfter: 30,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#00aa00",
      });
      const c = makeBook({
        id: "c",
        title: "C",
        readingLogs: [
          {
            id: "log-3",
            date: "2026-06-10",
            pagesRead: 10,
            currentPageAfter: 10,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#0000aa",
      });
      const d = makeBook({
        id: "d",
        title: "D",
        readingLogs: [
          {
            id: "log-4",
            date: "2026-06-10",
            pagesRead: 20,
            currentPageAfter: 20,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#aaaa00",
      });
      const result = buildReadingCalendarMonth([a, b, c, d], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.visibleColors).toEqual(["#00aa00", "#aaaa00", "#0000aa"]);
      expect(day?.books).toHaveLength(4);
    });

    it("labels include page counts when pagesRead is present", () => {
      const book = makeBook({
        id: "a",
        title: "Piranesi",
        readingLogs: [
          {
            id: "log-1",
            date: "2026-06-10",
            pagesRead: 30,
            currentPageAfter: 120,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([book], {
        year: 2026,
        month: 5,
      });
      const day = result.days.find((d) => d.date === "2026-06-10");
      expect(day?.ariaLabel).toContain("Piranesi (30 pages)");
    });

    it("logs take priority over legacy readingDays for the same book and date", () => {
      const book = makeBook({
        id: "a",
        title: "Both",
        readingLogs: [
          {
            id: "log-1",
            date: "2026-06-10",
            pagesRead: 30,
            currentPageAfter: 120,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
        readingDays: ["2026-06-10", "2026-06-11"],
        coverColor: "#b85b45",
      });
      const result = buildReadingCalendarMonth([book], {
        year: 2026,
        month: 5,
      });
      // June 10: only one ref (from log), with pagesRead.
      const day10 = result.days.find((d) => d.date === "2026-06-10");
      expect(day10?.books).toHaveLength(1);
      expect(day10?.books[0]?.pagesRead).toBe(30);
      // June 11: only readingDays, no log → legacy fallback.
      const day11 = result.days.find((d) => d.date === "2026-06-11");
      expect(day11?.books).toHaveLength(1);
      expect(day11?.books[0]?.pagesRead).toBeUndefined();
    });

    it("hasLoggedDays is true when readingLogs exist in the visible month", () => {
      const book = makeBook({
        readingLogs: [
          {
            id: "log-1",
            date: "2026-06-10",
            pagesRead: 30,
            currentPageAfter: 120,
            createdAt: "2026-06-07T10:00:00.000Z",
            updatedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
      });
      const result = buildReadingCalendarMonth([book], {
        year: 2026,
        month: 5,
      });
      expect(result.hasLoggedDays).toBe(true);
    });
  });

  describe("year wrap", () => {
    it("December renders as 31 days", () => {
      const result = buildReadingCalendarMonth([], { year: 2026, month: 11 });
      expect(result.days).toHaveLength(31);
      expect(result.days[0]?.date).toBe("2026-12-01");
      expect(result.days[30]?.date).toBe("2026-12-31");
    });

    it("picks up a reading day that crosses a year boundary cleanly", () => {
      const book = makeBook({ readingDays: ["2025-12-31"] });
      const result = buildReadingCalendarMonth([book], {
        year: 2025,
        month: 11,
      });
      expect(result.days[30]?.books).toHaveLength(1);
    });
  });
});
