import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import type { Book, ReadingLog } from "@/types/book";
import {
  ACHIEVEMENT_CATALOG,
  evaluateAchievements,
  groupAchievements,
  hasFirstFinishedBook,
  hasFirstQuote,
  hasFirstReview,
  hasLongRead,
  hasSevenDayStreak,
  isNonEmptyReview,
  sortUnlocksByRecency,
  sumLoggedPages,
} from "@/lib/achievements";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? "book-1",
    title: overrides.title ?? "Untitled",
    author: overrides.author ?? "Anonymous",
    status: overrides.status ?? "want",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function readLog(date: string, pagesRead: number): ReadingLog {
  return {
    id: "log-" + date,
    date,
    pagesRead,
    currentPageAfter: pagesRead,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function richDoc(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

describe("ACHIEVEMENT_CATALOG", () => {
  it("contains exactly eight entries with the approved IDs", () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(8);
    const ids = ACHIEVEMENT_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toContain("first-finished-book");
    expect(ids).toContain("five-finished-books");
    expect(ids).toContain("long-read");
    expect(ids).toContain("first-quote");
    expect(ids).toContain("first-review");
    expect(ids).toContain("five-rated-books");
    expect(ids).toContain("seven-day-streak");
    expect(ids).toContain("thousand-pages");
  });

  it("marks exactly the long-read and seven-day-streak definitions as secret", () => {
    const secretIds = ACHIEVEMENT_CATALOG.filter((d) => d.secret).map((d) => d.id);
    expect(secretIds).toEqual(["long-read", "seven-day-streak"]);
  });

  it("exposes title, description, condition, and icon for every entry", () => {
    for (const entry of ACHIEVEMENT_CATALOG) {
      expect(entry.title).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.condition).toBeTruthy();
      expect(entry.icon).toBeTruthy();
    }
  });
});

describe("first-finished-book", () => {
  it("unlocks when at least one book has status read", () => {
    const books = [book({ id: "a" }), book({ id: "b", status: "read" })];
    expect(hasFirstFinishedBook(books)).toBe(true);
    expect(evaluateAchievements(books).eligible.has("first-finished-book")).toBe(
      true,
    );
  });

  it("does not unlock for an empty library", () => {
    expect(hasFirstFinishedBook([])).toBe(false);
    expect(evaluateAchievements([]).eligible.has("first-finished-book")).toBe(
      false,
    );
  });
});

describe("five-finished-books", () => {
  it("unlocks at exactly five read books", () => {
    const books = Array.from({ length: 5 }, (_, i) =>
      book({ id: `b${i}`, status: "read" }),
    );
    expect(evaluateAchievements(books).eligible.has("five-finished-books")).toBe(
      true,
    );
  });

  it("does not unlock with only four read books", () => {
    const books = Array.from({ length: 4 }, (_, i) =>
      book({ id: `b${i}`, status: "read" }),
    );
    expect(evaluateAchievements(books).eligible.has("five-finished-books")).toBe(
      false,
    );
  });
});

describe("long-read", () => {
  it("unlocks only for a read book with totalPages >= 500", () => {
    expect(
      hasLongRead([book({ id: "a", status: "read", totalPages: 500 })]),
    ).toBe(true);
    expect(
      hasLongRead([book({ id: "a", status: "read", totalPages: 499 })]),
    ).toBe(false);
  });

  it("ignores a 500+ page book that is not yet read", () => {
    expect(
      hasLongRead([book({ id: "a", status: "reading", totalPages: 800 })]),
    ).toBe(false);
  });

  it("ignores invalid totalPages values", () => {
    expect(
      hasLongRead([
        book({ id: "a", status: "read", totalPages: 500.5 }),
        book({ id: "b", status: "read", totalPages: -10 }),
        book({ id: "c", status: "read" }),
      ]),
    ).toBe(false);
  });
});

describe("first-quote", () => {
  it("unlocks when any quote has non-empty text", () => {
    expect(
      hasFirstQuote([
        book({
          id: "a",
          quotes: [
            {
              id: "q1",
              text: "  ",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
        book({
          id: "b",
          quotes: [
            {
              id: "q2",
              text: "It was the best of times",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ]),
    ).toBe(true);
  });

  it("does not unlock with no quotes or empty quotes only", () => {
    expect(hasFirstQuote([book({ id: "a" })])).toBe(false);
    expect(
      hasFirstQuote([
        book({
          id: "a",
          quotes: [
            { id: "q1", text: "", createdAt: "2026-01-01T00:00:00.000Z" },
          ],
        }),
      ]),
    ).toBe(false);
  });
});

describe("first-review", () => {
  it("accepts a non-empty plain review", () => {
    expect(
      hasFirstReview([book({ id: "a", review: { format: "plain", body: "Loved it" } })]),
    ).toBe(true);
  });

  it("accepts a legacy plain string review", () => {
    expect(hasFirstReview([book({ id: "a", review: "Loved it" as never })])).toBe(
      true,
    );
  });

  it("accepts a rich review with textual content", () => {
    expect(
      hasFirstReview([book({ id: "a", review: { format: "rich", body: richDoc("Great") } })]),
    ).toBe(true);
  });

  it("rejects an empty rich review", () => {
    expect(
      hasFirstReview([
        book({
          id: "a",
          review: { format: "rich", body: richDoc("   ") },
        }),
      ]),
    ).toBe(false);
  });

  it("rejects an empty plain review", () => {
    expect(
      hasFirstReview([book({ id: "a", review: { format: "plain", body: "" } })]),
    ).toBe(false);
  });

  it("rejects undefined and malformed reviews", () => {
    expect(hasFirstReview([book({ id: "a" })])).toBe(false);
    expect(hasFirstReview([book({ id: "a", review: 42 as never })])).toBe(false);
  });
});

describe("isNonEmptyReview", () => {
  it("walks rich review content via a small recursive walker", () => {
    expect(
      isNonEmptyReview({
        format: "rich",
        body: {
          type: "doc",
          content: [
            { type: "paragraph" },
            { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
          ],
        },
      }),
    ).toBe(true);
  });
});

describe("five-rated-books", () => {
  it("unlocks at five rated books regardless of rating value", () => {
    const books = [
      book({ id: "a", rating: 1 }),
      book({ id: "b", rating: 2 }),
      book({ id: "c", rating: 3 }),
      book({ id: "d", rating: 4 }),
      book({ id: "e", rating: 5 }),
    ];
    expect(evaluateAchievements(books).eligible.has("five-rated-books")).toBe(true);
  });

  it("does not unlock with invalid rating values", () => {
    const books = [
      book({ id: "a", rating: 3 as 1 }),
      book({ id: "b", rating: 0 as 1 }),
    ];
    expect(evaluateAchievements(books).eligible.has("five-rated-books")).toBe(
      false,
    );
  });
});

describe("seven-day-streak", () => {
  it("unlocks with seven unique consecutive local dates across books", () => {
    const dates = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
    ];
    const books = dates.map((d, i) =>
      book({ id: `b${i}`, readingLogs: [readLog(d, 10)] }),
    );
    expect(hasSevenDayStreak(books)).toBe(true);
  });

  it("does not count duplicate dates twice", () => {
    const books = [
      book({
        id: "a",
        readingLogs: [readLog("2026-01-01", 10), readLog("2026-01-01", 5)],
      }),
    ];
    expect(hasSevenDayStreak(books)).toBe(false);
  });

  it("ignores invalid dates and non-positive pages", () => {
    const books = [
      book({
        id: "a",
        readingLogs: [
          readLog("2026-13-40", 10),
          readLog("2026-01-01", 0),
          readLog("2026-01-01", -5),
        ],
      }),
    ];
    expect(hasSevenDayStreak(books)).toBe(false);
  });

  it("requires exact consecutive days (gap breaks the run)", () => {
    const books = [
      book({
        id: "a",
        readingLogs: [
          readLog("2026-01-01", 10),
          readLog("2026-01-02", 10),
          readLog("2026-01-04", 10),
          readLog("2026-01-05", 10),
          readLog("2026-01-06", 10),
          readLog("2026-01-07", 10),
          readLog("2026-01-08", 10),
        ],
      }),
    ];
    expect(hasSevenDayStreak(books)).toBe(false);
  });
});

describe("thousand-pages", () => {
  it("unlocks at exactly 1000 positive pages logged", () => {
    const books = [
      book({ id: "a", readingLogs: [readLog("2026-01-01", 600)] }),
      book({ id: "b", readingLogs: [readLog("2026-01-02", 400)] }),
    ];
    expect(sumLoggedPages(books)).toBe(1000);
    expect(evaluateAchievements(books).eligible.has("thousand-pages")).toBe(true);
  });

  it("does not unlock below 1000 pages", () => {
    const books = [
      book({ id: "a", readingLogs: [readLog("2026-01-01", 999)] }),
    ];
    expect(evaluateAchievements(books).eligible.has("thousand-pages")).toBe(
      false,
    );
  });
});

describe("evaluateAchievements", () => {
  it("is deterministic for the same input", () => {
    const books = [
      book({ id: "a", status: "read", totalPages: 600, rating: 5 }),
      book({
        id: "b",
        review: { format: "rich", body: richDoc("Great") },
        quotes: [
          {
            id: "q1",
            text: "quote",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    ];
    const a = evaluateAchievements(books);
    const b = evaluateAchievements(books);
    expect(Array.from(a.eligible).sort()).toEqual(Array.from(b.eligible).sort());
  });

  it("returns no eligible IDs for an empty library", () => {
    expect(evaluateAchievements([]).eligible.size).toBe(0);
  });
});

describe("groupAchievements", () => {
  it("places unlocked, visible-locked, and secret-locked in that order", () => {
    const unlocks = [
      {
        achievementId: "first-quote" as const,
        unlockedAt: "2026-01-05T00:00:00.000Z",
      },
      {
        achievementId: "first-finished-book" as const,
        unlockedAt: "2026-01-10T00:00:00.000Z",
      },
    ];
    const groups = groupAchievements(unlocks);
    expect(groups.unlocked.map((u) => u.achievementId)).toEqual([
      "first-finished-book",
      "first-quote",
    ]);
    expect(groups.visibleLocked.map((d) => d.id)).toEqual([
      "five-finished-books",
      "first-review",
      "five-rated-books",
      "thousand-pages",
    ]);
    expect(groups.secretLocked.map((d) => d.id)).toEqual([
      "long-read",
      "seven-day-streak",
    ]);
  });

  it("ignores unknown IDs in unlock input", () => {
    const groups = groupAchievements([
      {
        achievementId: "first-finished-book" as const,
        unlockedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        achievementId: "unknown" as never,
        unlockedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(groups.unlocked).toHaveLength(1);
  });

  it("preserves the earliest timestamp when duplicates collide", () => {
    const groups = groupAchievements([
      {
        achievementId: "first-finished-book" as const,
        unlockedAt: "2026-01-10T00:00:00.000Z",
      },
      {
        achievementId: "first-finished-book" as const,
        unlockedAt: "2026-01-05T00:00:00.000Z",
      },
    ]);
    expect(groups.unlocked[0]?.unlockedAt).toBe("2026-01-05T00:00:00.000Z");
  });
});

describe("sortUnlocksByRecency", () => {
  it("orders unlock list newest first", () => {
    const sorted = sortUnlocksByRecency([
      {
        achievementId: "first-quote" as const,
        unlockedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        achievementId: "first-finished-book" as const,
        unlockedAt: "2026-01-10T00:00:00.000Z",
      },
    ]);
    expect(sorted[0]?.achievementId).toBe("first-finished-book");
  });
});
