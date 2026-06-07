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
