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
