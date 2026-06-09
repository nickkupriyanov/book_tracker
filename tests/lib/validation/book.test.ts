import { describe, it, expect } from "vitest";
import { validateBookInput } from "@/lib/validation/book";

const VALID_BOOK = {
  title: "Test Book",
  author: "Author",
  status: "reading" as const,
  tags: [],
};

describe("validateBookInput — startedAt / finishedAt (spec 012)", () => {
  it("omits both date fields when neither is set", () => {
    const result = validateBookInput(VALID_BOOK);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startedAt).toBeUndefined();
      expect(result.value.finishedAt).toBeUndefined();
    }
  });

  it("accepts a valid startedAt", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "2026-04-01",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.startedAt).toBe("2026-04-01");
  });

  it("accepts a valid finishedAt", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      finishedAt: "2026-04-15",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.finishedAt).toBe("2026-04-15");
  });

  it("accepts both dates on the same day", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "2026-04-15",
      finishedAt: "2026-04-15",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts both dates with startedAt < finishedAt", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "2026-04-01",
      finishedAt: "2026-04-15",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects both dates with startedAt > finishedAt (error on finishedAt)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "2026-04-15",
      finishedAt: "2026-04-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.finishedAt).toBe(
        "Finish date must be on or after the start date."
      );
    }
  });

  it("rejects a malformed startedAt (wrong separator)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "2026/04/01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.startedAt).toBeDefined();
    }
  });

  it("rejects a calendar-invalid startedAt (Feb 30)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "2026-02-30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.startedAt).toBeDefined();
    }
  });

  it("rejects a calendar-invalid finishedAt (month 13)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      finishedAt: "2026-13-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.finishedAt).toBeDefined();
    }
  });

  it("accepts empty strings for both date fields (no date)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      startedAt: "",
      finishedAt: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startedAt).toBeUndefined();
      expect(result.value.finishedAt).toBeUndefined();
    }
  });
});

describe("validateBookInput — readingLogs (spec 016)", () => {
  it("omits readingLogs when not set", () => {
    const result = validateBookInput(VALID_BOOK);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs).toBeUndefined();
    }
  });

  it("accepts a valid single reading log", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-1",
          date: "2026-06-07",
          pagesRead: 30,
          currentPageAfter: 120,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs).toHaveLength(1);
      expect(result.value.readingLogs![0]!.pagesRead).toBe(30);
    }
  });

  it("aggregates multiple logs with the same date", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-1",
          date: "2026-06-07",
          pagesRead: 30,
          currentPageAfter: 120,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
        {
          id: "log-2",
          date: "2026-06-07",
          pagesRead: 15,
          currentPageAfter: 135,
          createdAt: "2026-06-07T12:00:00.000Z",
          updatedAt: "2026-06-07T12:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs).toHaveLength(1);
      expect(result.value.readingLogs![0]!.pagesRead).toBe(45);
      expect(result.value.readingLogs![0]!.currentPageAfter).toBe(45);
      expect(result.value.readingLogs![0]!.updatedAt).toBe(
        "2026-06-07T12:00:00.000Z"
      );
    }
  });

  it("keeps separate dates as separate entries", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-1",
          date: "2026-06-06",
          pagesRead: 10,
          currentPageAfter: 10,
          createdAt: "2026-06-06T10:00:00.000Z",
          updatedAt: "2026-06-06T10:00:00.000Z",
        },
        {
          id: "log-2",
          date: "2026-06-07",
          pagesRead: 20,
          currentPageAfter: 30,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs).toHaveLength(2);
    }
  });

  it("sorts logs chronologically by date", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-2",
          date: "2026-06-07",
          pagesRead: 20,
          currentPageAfter: 30,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
        {
          id: "log-1",
          date: "2026-06-06",
          pagesRead: 10,
          currentPageAfter: 10,
          createdAt: "2026-06-06T10:00:00.000Z",
          updatedAt: "2026-06-06T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs![0]!.date).toBe("2026-06-06");
      expect(result.value.readingLogs![1]!.date).toBe("2026-06-07");
    }
  });

  it("rejects an invalid date in reading log", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-1",
          date: "2026/06/07",
          pagesRead: 30,
          currentPageAfter: 120,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["readingLogs.0.date"]).toBeDefined();
    }
  });

  it("rejects a zero pagesRead", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-1",
          date: "2026-06-07",
          pagesRead: 0,
          currentPageAfter: 120,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["readingLogs.0.pagesRead"]).toBeDefined();
    }
  });

  it("rejects a negative currentPageAfter", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "log-1",
          date: "2026-06-07",
          pagesRead: 30,
          currentPageAfter: -1,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["readingLogs.0.currentPageAfter"]).toBeDefined();
    }
  });

  it("rejects a missing id", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          date: "2026-06-07",
          pagesRead: 30,
          currentPageAfter: 120,
          createdAt: "2026-06-07T10:00:00.000Z",
          updatedAt: "2026-06-07T10:00:00.000Z",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["readingLogs.0.id"]).toBeDefined();
    }
  });

  it("rejects a non-array readingLogs", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: "not-an-array",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.readingLogs).toBeDefined();
    }
  });

  it("normalises an empty array to undefined", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs).toBeUndefined();
    }
  });

  it("resynchronizes currentPageAfter after merging duplicate log dates", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      readingLogs: [
        {
          id: "a",
          date: "2026-06-01",
          pagesRead: 10,
          currentPageAfter: 999,
          createdAt: "2026-06-01T10:00:00.000Z",
          updatedAt: "2026-06-01T10:00:00.000Z",
        },
        {
          id: "b",
          date: "2026-06-01",
          pagesRead: 5,
          currentPageAfter: 5,
          createdAt: "2026-06-01T11:00:00.000Z",
          updatedAt: "2026-06-01T11:00:00.000Z",
        },
        {
          id: "c",
          date: "2026-06-02",
          pagesRead: 20,
          currentPageAfter: 20,
          createdAt: "2026-06-02T10:00:00.000Z",
          updatedAt: "2026-06-02T10:00:00.000Z",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readingLogs).toHaveLength(2);
    expect(result.value.readingLogs?.[0]).toMatchObject({
      date: "2026-06-01",
      pagesRead: 15,
      currentPageAfter: 15,
    });
    expect(result.value.readingLogs?.[1]).toMatchObject({
      date: "2026-06-02",
      pagesRead: 20,
      currentPageAfter: 35,
    });
  });

  it("accepts legacy books without readingLogs", () => {
    const result = validateBookInput(VALID_BOOK);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.readingLogs).toBeUndefined();
    }
  });
});

describe("validateBookInput — currentPage / totalPages (spec 015)", () => {
  it("omits both page fields when neither is set", () => {
    const result = validateBookInput(VALID_BOOK);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currentPage).toBeUndefined();
      expect(result.value.totalPages).toBeUndefined();
    }
  });

  it("accepts a valid currentPage alone", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: 123,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.currentPage).toBe(123);
  });

  it("accepts a valid totalPages alone", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      totalPages: 420,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.totalPages).toBe(420);
  });

  it("accepts both fields when currentPage <= totalPages (equal allowed)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: 420,
      totalPages: 420,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects currentPage > totalPages with an error on currentPage", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: 421,
      totalPages: 420,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.currentPage).toBeDefined();
    }
  });

  it("rejects a zero currentPage", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.currentPage).toBeDefined();
    }
  });

  it("rejects a negative currentPage", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: -5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.currentPage).toBeDefined();
    }
  });

  it("rejects a decimal currentPage", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: 12.5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.currentPage).toBeDefined();
    }
  });

  it("rejects a non-numeric currentPage", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      currentPage: "123",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.currentPage).toBeDefined();
    }
  });

  it("rejects a zero totalPages", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      totalPages: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.totalPages).toBeDefined();
    }
  });

  it("rejects a decimal totalPages", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      totalPages: 420.5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.totalPages).toBeDefined();
    }
  });

  it("rejects a non-numeric totalPages", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      totalPages: "420",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.totalPages).toBeDefined();
    }
  });

  it("accepts a very large totalPages within the page cap", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      totalPages: 99_999,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a totalPages above the cap", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      totalPages: 100_000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.totalPages).toBeDefined();
    }
  });
});
