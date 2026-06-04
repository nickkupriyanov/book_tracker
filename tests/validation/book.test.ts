import { describe, it, expect } from "vitest";
import { validateBookInput } from "@/lib/validation/book";
import type { BookInput } from "@/types/book";

const baseInput: BookInput = {
  title: "Piranesi",
  author: "Susanna Clarke",
  status: "reading",
  tags: [],
};

describe("validateBookInput", () => {
  describe("happy path", () => {
    it("accepts a minimal valid input", () => {
      const result = validateBookInput(baseInput);
      expect(result).toEqual({ ok: true, value: baseInput });
    });

    it("accepts a fully populated input", () => {
      const input: BookInput = {
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "read",
        coverUrl: "https://example.com/cover.jpg",
        tags: ["fiction", "fantasy"],
      };
      const result = validateBookInput(input);
      expect(result).toEqual({ ok: true, value: input });
    });
  });

  describe("title", () => {
    it("rejects empty title", () => {
      const result = validateBookInput({ ...baseInput, title: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.title).toBeDefined();
    });

    it("rejects whitespace-only title", () => {
      const result = validateBookInput({ ...baseInput, title: "   " });
      expect(result.ok).toBe(false);
    });

    it("trims leading/trailing whitespace", () => {
      const result = validateBookInput({ ...baseInput, title: "  Piranesi  " });
      expect(result).toEqual({ ok: true, value: { ...baseInput, title: "Piranesi" } });
    });

    it("accepts a 200-character title", () => {
      const result = validateBookInput({ ...baseInput, title: "a".repeat(200) });
      expect(result.ok).toBe(true);
    });

    it("rejects a 201-character title", () => {
      const result = validateBookInput({ ...baseInput, title: "a".repeat(201) });
      expect(result.ok).toBe(false);
    });

    it("rejects non-string title", () => {
      const result = validateBookInput({ ...baseInput, title: 42 });
      expect(result.ok).toBe(false);
    });
  });

  describe("author", () => {
    it("rejects empty author", () => {
      const result = validateBookInput({ ...baseInput, author: "" });
      expect(result.ok).toBe(false);
    });

    it("rejects whitespace-only author", () => {
      const result = validateBookInput({ ...baseInput, author: "   " });
      expect(result.ok).toBe(false);
    });

    it("trims author whitespace", () => {
      const result = validateBookInput({ ...baseInput, author: "  Clarke  " });
      expect(result).toEqual({ ok: true, value: { ...baseInput, author: "Clarke" } });
    });

    it("accepts a 120-character author", () => {
      const result = validateBookInput({ ...baseInput, author: "a".repeat(120) });
      expect(result.ok).toBe(true);
    });

    it("rejects a 121-character author", () => {
      const result = validateBookInput({ ...baseInput, author: "a".repeat(121) });
      expect(result.ok).toBe(false);
    });
  });

  describe("coverUrl", () => {
    it("accepts undefined coverUrl", () => {
      const result = validateBookInput({ ...baseInput, coverUrl: undefined });
      expect(result.ok).toBe(true);
    });

    it("accepts https URL", () => {
      const result = validateBookInput({ ...baseInput, coverUrl: "https://example.com/c.jpg" });
      expect(result.ok).toBe(true);
    });

    it("accepts http URL", () => {
      const result = validateBookInput({ ...baseInput, coverUrl: "http://example.com/c.jpg" });
      expect(result.ok).toBe(true);
    });

    it("rejects ftp URL", () => {
      const result = validateBookInput({ ...baseInput, coverUrl: "ftp://example.com/c.jpg" });
      expect(result.ok).toBe(false);
    });

    it("rejects URL without scheme", () => {
      const result = validateBookInput({ ...baseInput, coverUrl: "example.com/c.jpg" });
      expect(result.ok).toBe(false);
    });

    it("rejects non-string coverUrl", () => {
      const result = validateBookInput({ ...baseInput, coverUrl: 42 });
      expect(result.ok).toBe(false);
    });
  });

  describe("tags", () => {
    it("accepts empty tags array", () => {
      const result = validateBookInput({ ...baseInput, tags: [] });
      expect(result.ok).toBe(true);
    });

    it("normalizes whitespace-only string to []", () => {
      const result = validateBookInput({ ...baseInput, tags: ["   "] });
      expect(result).toEqual({ ok: true, value: { ...baseInput, tags: [] } });
    });

    it("normalizes comma-only string to []", () => {
      const result = validateBookInput({ ...baseInput, tags: [","] });
      expect(result).toEqual({ ok: true, value: { ...baseInput, tags: [] } });
    });

    it("splits comma-separated tags and trims", () => {
      const result = validateBookInput({ ...baseInput, tags: ["  fiction  ,  mystery "] });
      expect(result).toEqual({ ok: true, value: { ...baseInput, tags: ["fiction", "mystery"] } });
    });

    it("lowercases tags", () => {
      const result = validateBookInput({ ...baseInput, tags: ["Fiction", "MYSTERY"] });
      expect(result).toEqual({ ok: true, value: { ...baseInput, tags: ["fiction", "mystery"] } });
    });

    it("deduplicates tags", () => {
      const result = validateBookInput({ ...baseInput, tags: ["fiction", "mystery", "fiction"] });
      expect(result).toEqual({ ok: true, value: { ...baseInput, tags: ["fiction", "mystery"] } });
    });

    it("deduplicates case-insensitively", () => {
      const result = validateBookInput({ ...baseInput, tags: ["fiction", "Fiction", "FICTION"] });
      expect(result).toEqual({ ok: true, value: { ...baseInput, tags: ["fiction"] } });
    });

    it("accepts exactly 10 tags", () => {
      const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const result = validateBookInput({ ...baseInput, tags });
      expect(result.ok).toBe(true);
    });

    it("rejects 11 tags", () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const result = validateBookInput({ ...baseInput, tags });
      expect(result.ok).toBe(false);
    });

    it("accepts a 24-character tag", () => {
      const result = validateBookInput({ ...baseInput, tags: ["a".repeat(24)] });
      expect(result.ok).toBe(true);
    });

    it("rejects a 25-character tag", () => {
      const result = validateBookInput({ ...baseInput, tags: ["a".repeat(25)] });
      expect(result.ok).toBe(false);
    });

    it("rejects non-array tags", () => {
      const result = validateBookInput({ ...baseInput, tags: "fiction" });
      expect(result.ok).toBe(false);
    });
  });

  describe("status", () => {
    it.each(["want", "reading", "read"] as const)("accepts %s", (status) => {
      const result = validateBookInput({ ...baseInput, status });
      expect(result.ok).toBe(true);
    });

    it("rejects case-mismatched status", () => {
      const result = validateBookInput({ ...baseInput, status: "Reading" });
      expect(result.ok).toBe(false);
    });

    it("rejects unknown status string", () => {
      const result = validateBookInput({ ...baseInput, status: "garbage" });
      expect(result.ok).toBe(false);
    });

    it("rejects missing status", () => {
      const { status: _status, ...withoutStatus } = baseInput;
      void _status;
      const result = validateBookInput(withoutStatus);
      expect(result.ok).toBe(false);
    });
  });

  describe("shape errors", () => {
    it("rejects null", () => {
      expect(validateBookInput(null).ok).toBe(false);
    });

    it("rejects undefined", () => {
      expect(validateBookInput(undefined).ok).toBe(false);
    });

    it("rejects primitive", () => {
      expect(validateBookInput("a string").ok).toBe(false);
    });

    it("rejects array", () => {
      expect(validateBookInput([]).ok).toBe(false);
    });
  });

  describe("error reporting", () => {
    it("reports multiple field errors at once", () => {
      const result = validateBookInput({ ...baseInput, title: "", author: "" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.title).toBeDefined();
        expect(result.errors.author).toBeDefined();
      }
    });
  });

  describe("rating (spec 006)", () => {
    it("accepts rating 1", () => {
      const result = validateBookInput({ ...baseInput, rating: 1 });
      expect(result).toEqual({ ok: true, value: { ...baseInput, rating: 1 } });
    });

    it("accepts rating 5", () => {
      const result = validateBookInput({ ...baseInput, rating: 5 });
      expect(result).toEqual({ ok: true, value: { ...baseInput, rating: 5 } });
    });

    it("accepts each integer 1..5", () => {
      for (const r of [1, 2, 3, 4, 5] as const) {
        expect(validateBookInput({ ...baseInput, rating: r }).ok).toBe(true);
      }
    });

    it("accepts missing rating (undefined)", () => {
      // baseInput has no rating key — should validate fine.
      const result = validateBookInput(baseInput);
      expect(result.ok).toBe(true);
    });

    it("rejects rating 6 with an inline error", () => {
      const result = validateBookInput({ ...baseInput, rating: 6 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.rating).toMatch(
          /whole number between 1 and 5/
        );
      }
    });

    it("rejects rating 0 with an inline error", () => {
      const result = validateBookInput({ ...baseInput, rating: 0 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.rating).toMatch(
          /whole number between 1 and 5/
        );
      }
    });

    it("rejects non-integer 3.5 with an inline error", () => {
      const result = validateBookInput({ ...baseInput, rating: 3.5 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.rating).toMatch(
          /whole number between 1 and 5/
        );
      }
    });

    it("rejects non-number rating with an inline error", () => {
      const result = validateBookInput({ ...baseInput, rating: "4" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.rating).toMatch(
          /whole number between 1 and 5/
        );
      }
    });

    it("omits the rating key from the value when not provided", () => {
      const result = validateBookInput(baseInput);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect("rating" in result.value).toBe(false);
      }
    });
  });

  describe("review (spec 007)", () => {
    it("accepts a mid-length review string", () => {
      const result = validateBookInput({
        ...baseInput,
        review: "Loved this book. A quiet masterpiece.",
      });
      expect(result).toEqual({
        ok: true,
        value: {
          ...baseInput,
          review: "Loved this book. A quiet masterpiece.",
        },
      });
    });

    it("accepts a review at the max length (10 000 chars)", () => {
      const review = "a".repeat(10_000);
      const result = validateBookInput({ ...baseInput, review });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.review).toBe(review);
      }
    });

    it("rejects a review over the max length with an inline error", () => {
      const review = "a".repeat(10_001);
      const result = validateBookInput({ ...baseInput, review });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.review).toMatch(
          /10[, ]?000 characters or fewer/
        );
      }
    });

    it("trims the review", () => {
      const result = validateBookInput({
        ...baseInput,
        review: "  Loved it.  ",
      });
      expect(result).toEqual({
        ok: true,
        value: { ...baseInput, review: "Loved it." },
      });
    });

    it("normalises an empty / whitespace-only review to absent (D3)", () => {
      for (const empty of ["", "   ", "\n\n", "\t"]) {
        const result = validateBookInput({ ...baseInput, review: empty });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect("review" in result.value).toBe(false);
        }
      }
    });

    it("accepts missing review (undefined / null)", () => {
      expect(validateBookInput({ ...baseInput, review: undefined }).ok).toBe(true);
      // null is not in the type but the validator should still accept it
      // (treat as missing) so the form-state roundtrip from the textarea
      // (which can emit undefined / null) doesn't blow up.
      expect(
        validateBookInput({ ...baseInput, review: null }).ok
      ).toBe(true);
    });

    it("rejects a non-string review with an inline error", () => {
      const result = validateBookInput({ ...baseInput, review: 42 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.review).toMatch(/Review must be text/);
      }
    });
  });
});
