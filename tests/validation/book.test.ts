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
});
