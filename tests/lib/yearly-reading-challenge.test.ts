import { describe, it, expect } from "vitest";
import { buildYearlyChallenge } from "@/lib/yearly-reading-challenge";
import type { Book, ReadingLog } from "@/types/book";
import type { AnnualReadingChallenge } from "@/types/challenge";

function makeLog(date: string, overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: overrides.id ?? `log-${date}`,
    date,
    pagesRead: overrides.pagesRead ?? 10,
    currentPageAfter: overrides.currentPageAfter ?? 10,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

function makeBook(
  overrides: Partial<Book> & { finishedAt?: string } = {}
): Book {
  const { finishedAt, readingLogs, ...bookOverrides } = overrides;
  return {
    id: "book-1",
    title: "Book",
    author: "A",
    status: "read",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...(finishedAt !== undefined ? { readingLogs: [makeLog(finishedAt)] } : {}),
    ...(readingLogs !== undefined ? { readingLogs } : {}),
    ...bookOverrides,
  };
}

/**
 * June 15, 2026. Mid-year, not a leap year, day 166/365. The
 * `now` injection lets us assert deterministic pace, year, and
 * "elapsed in year" math (spec 018 §9 "Year changes" edge case).
 */
const JUNE_15_2026 = new Date(2026, 5, 15);

function makeChallenge(
  overrides: Partial<AnnualReadingChallenge> = {}
): AnnualReadingChallenge {
  return {
    year: 2026,
    targetBooks: 12,
    updatedAt: "2026-06-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildYearlyChallenge — no target saved", () => {
  it("returns the setup state when no challenge is provided", () => {
    const model = buildYearlyChallenge([], null, { now: JUNE_15_2026 });
    expect(model.state).toBe("setup");
    expect(model.target).toBeNull();
    expect(model.completed).toBe(0);
    expect(model.remaining).toBeNull();
    expect(model.progressPercent).toBe(0);
    expect(model.isComplete).toBe(false);
    expect(model.isExceeded).toBe(false);
    expect(model.pace).toBeNull();
  });
});

describe("buildYearlyChallenge — year derivation", () => {
  it("uses the current local calendar year from `now`", () => {
    const model = buildYearlyChallenge([], null, { now: JUNE_15_2026 });
    expect(model.year).toBe(2026);
  });

  it("honors a different `now` year", () => {
    const model = buildYearlyChallenge([], null, {
      now: new Date(2030, 0, 1),
    });
    expect(model.year).toBe(2030);
  });
});

describe("buildYearlyChallenge — completed count (FR-5…FR-7)", () => {
  it("counts a read book finished in the current year", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2026-04-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(1);
  });

  it("counts multiple read books finished in the current year", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2026-01-15" }),
      makeBook({ id: "b", status: "read", finishedAt: "2026-04-01" }),
      makeBook({ id: "c", status: "read", finishedAt: "2026-12-31" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(3);
  });

  it("does not count read books finished in a previous year", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2025-12-31" }),
      makeBook({ id: "b", status: "read", finishedAt: "2024-06-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(0);
  });

  it("does not count read books finished in a future year", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2027-01-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(0);
  });

  it("does not count read books without a derived finish date (FR-6)", () => {
    const books = [
      makeBook({ id: "a", status: "read" }),
      makeBook({ id: "b", status: "read", finishedAt: undefined }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(0);
  });

  it("does not count books with status other than 'read' (FR-7)", () => {
    const books = [
      makeBook({ id: "a", status: "reading", finishedAt: "2026-04-01" }),
      makeBook({ id: "b", status: "want", finishedAt: "2026-04-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(0);
  });

  it("does not count books with malformed derived finish dates", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "not-a-date" }),
      makeBook({ id: "b", status: "read", finishedAt: "2026-13-40" }),
      makeBook({ id: "c", status: "read", finishedAt: "2026-02-31" }),
      makeBook({ id: "d", status: "read", finishedAt: "" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(0);
  });

  it("treats a non-string log date as missing", () => {
    const corrupt = makeBook({
      id: "a",
      status: "read",
      readingLogs: [makeLog(202604 as unknown as string)],
    });
    const model = buildYearlyChallenge([corrupt], makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.completed).toBe(0);
  });
});

describe("buildYearlyChallenge — undatedReadCount", () => {
  it("counts read books missing a valid derived finish date", () => {
    const books = [
      makeBook({ id: "a", status: "read" }),
      makeBook({ id: "b", status: "read", finishedAt: undefined }),
      makeBook({ id: "c", status: "read", finishedAt: "not-a-date" }),
      makeBook({ id: "d", status: "read", finishedAt: "2026-04-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.undatedReadCount).toBe(3);
  });

  it("excludes want/reading books from the undated-read count", () => {
    const books = [
      makeBook({ id: "a", status: "reading" }),
      makeBook({ id: "b", status: "want" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.undatedReadCount).toBe(0);
  });
});

describe("buildYearlyChallenge — state derivation", () => {
  it("returns the empty state when target is set and nothing is completed", () => {
    const model = buildYearlyChallenge(
      [],
      makeChallenge({ targetBooks: 12 }),
      { now: JUNE_15_2026 }
    );
    expect(model.state).toBe("empty");
    expect(model.target).toBe(12);
    expect(model.completed).toBe(0);
    expect(model.remaining).toBe(12);
    expect(model.pace).toBeNull();
  });

  it("returns the in-progress state when below target", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2026-04-01" }),
      makeBook({ id: "b", status: "read", finishedAt: "2026-05-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.state).toBe("in-progress");
    expect(model.completed).toBe(2);
    expect(model.remaining).toBe(10);
    expect(model.isComplete).toBe(false);
  });

  it("returns the complete state when completed equals target (FR-11)", () => {
    const books = Array.from({ length: 12 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.state).toBe("complete");
    expect(model.completed).toBe(12);
    expect(model.isComplete).toBe(true);
    expect(model.isExceeded).toBe(false);
    expect(model.remaining).toBeNull();
    expect(model.pace).toBeNull();
  });

  it("returns the complete state when completed exceeds target", () => {
    const books = Array.from({ length: 15 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    const model = buildYearlyChallenge(books, makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.state).toBe("complete");
    expect(model.completed).toBe(15);
    expect(model.isComplete).toBe(true);
    expect(model.isExceeded).toBe(true);
    expect(model.remaining).toBeNull();
  });

  it("allows saving a target lower than completed (shows complete)", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2026-04-01" }),
      makeBook({ id: "b", status: "read", finishedAt: "2026-05-01" }),
      makeBook({ id: "c", status: "read", finishedAt: "2026-06-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge({ targetBooks: 2 }), {
      now: JUNE_15_2026,
    });
    expect(model.state).toBe("complete");
    expect(model.completed).toBe(3);
    expect(model.isExceeded).toBe(true);
  });
});

describe("buildYearlyChallenge — progressPercent (FR-9)", () => {
  it("is 0 when target is set and nothing is completed", () => {
    const model = buildYearlyChallenge([], makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.progressPercent).toBe(0);
  });

  it("is the rounded ratio of completed to target", () => {
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2026-04-01" }),
      makeBook({ id: "b", status: "read", finishedAt: "2026-05-01" }),
      makeBook({ id: "c", status: "read", finishedAt: "2026-06-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge({ targetBooks: 10 }), {
      now: JUNE_15_2026,
    });
    expect(model.progressPercent).toBe(30);
  });

  it("is visually capped at 100 when completed exceeds target (FR-9)", () => {
    const books = Array.from({ length: 15 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    const model = buildYearlyChallenge(books, makeChallenge({ targetBooks: 10 }), {
      now: JUNE_15_2026,
    });
    expect(model.progressPercent).toBe(100);
  });
});

describe("buildYearlyChallenge — pace labels (FR-12)", () => {
  function booksWithCount(n: number): Book[] {
    return Array.from({ length: n }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
  }

  it("classifies a strong start as 'ahead'", () => {
    // Mid-year, target 10. With 6 of 10 done, you're ahead.
    const model = buildYearlyChallenge(booksWithCount(6), makeChallenge({ targetBooks: 10 }), {
      now: JUNE_15_2026,
    });
    expect(model.pace).toBe("ahead");
  });

  it("classifies a matching pace as 'on'", () => {
    // Mid-year, target 10. With 5 of 10 done, you're on pace.
    const model = buildYearlyChallenge(booksWithCount(5), makeChallenge({ targetBooks: 10 }), {
      now: JUNE_15_2026,
    });
    expect(model.pace).toBe("on");
  });

  it("classifies a slower start as 'behind'", () => {
    // Mid-year, target 10. With 3 of 10 done, you're behind.
    const model = buildYearlyChallenge(booksWithCount(3), makeChallenge({ targetBooks: 10 }), {
      now: JUNE_15_2026,
    });
    expect(model.pace).toBe("behind");
  });

  it("returns null when no target is saved", () => {
    const model = buildYearlyChallenge(booksWithCount(5), null, {
      now: JUNE_15_2026,
    });
    expect(model.pace).toBeNull();
  });

  it("returns null when zero progress has been made", () => {
    const model = buildYearlyChallenge([], makeChallenge(), {
      now: JUNE_15_2026,
    });
    expect(model.pace).toBeNull();
  });

  it("returns null when the goal is already met", () => {
    const model = buildYearlyChallenge(booksWithCount(12), makeChallenge({ targetBooks: 12 }), {
      now: JUNE_15_2026,
    });
    expect(model.pace).toBeNull();
  });

  it("treats day 1 with one book as 'ahead' for a year-long target", () => {
    // Jan 1, 2026. target 365, completed 1. expectedFloat = 0, round = 0.
    // 1 >= 0 + 1, so the helper classifies this as ahead of pace.
    const books = [
      makeBook({ id: "a", status: "read", finishedAt: "2026-01-01" }),
    ];
    const model = buildYearlyChallenge(books, makeChallenge({ targetBooks: 365 }), {
      now: new Date(2026, 0, 1),
    });
    expect(model.state).toBe("in-progress");
    expect(model.pace).toBe("ahead");
  });
});

describe("buildYearlyChallenge — defaults", () => {
  it("uses the current date when no `now` is provided", () => {
    const model = buildYearlyChallenge([], null);
    const real = new Date();
    expect(model.year).toBe(real.getFullYear());
  });
});
