import { describe, it, expect } from "vitest";
import { validateBookInput } from "@/lib/validation/book";

const VALID_BOOK = {
  title: "Test Book",
  author: "Author",
  status: "reading",
  tags: [],
};

describe("validateReview (inside validateBookInput)", () => {
  it("accepts undefined review", () => {
    const result = validateBookInput({ ...VALID_BOOK, review: undefined });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.review).toBeUndefined();
  });

  it("accepts null review and normalises to undefined", () => {
    const result = validateBookInput({ ...VALID_BOOK, review: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.review).toBeUndefined();
  });

  it("normalises legacy string to { format: 'plain', body }", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: "Great book!",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.review).toEqual({
        format: "plain",
        body: "Great book!",
      });
    }
  });

  it("normalises legacy empty string to undefined", () => {
    const result = validateBookInput({ ...VALID_BOOK, review: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.review).toBeUndefined();
  });

  it("normalises legacy whitespace-only string to undefined", () => {
    const result = validateBookInput({ ...VALID_BOOK, review: "   " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.review).toBeUndefined();
  });

  it("rejects legacy string exceeding REVIEW_MAX", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: "x".repeat(10_001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("accepts { format: 'plain', body } and returns it", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "plain", body: "Nice read." },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.review).toEqual({
        format: "plain",
        body: "Nice read.",
      });
    }
  });

  it("normalises { format: 'plain', body: '' } to undefined", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "plain", body: "" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.review).toBeUndefined();
  });

  it("normalises { format: 'plain', body: '   ' } to undefined", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "plain", body: "   " },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.review).toBeUndefined();
  });

  it("rejects { format: 'plain', body } exceeding REVIEW_MAX", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "plain", body: "x".repeat(10_001) },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("rejects { format: 'plain' } with non-string body", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "plain", body: 42 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("accepts { format: 'rich', body: { type: 'doc', content: [...] } }", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: {
        format: "rich",
        body: { type: "doc", content: [{ type: "paragraph" }] },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.review).toEqual({
        format: "rich",
        body: { type: "doc", content: [{ type: "paragraph" }] },
      });
    }
  });

  it("rejects { format: 'rich', body } where body is not a ProseMirror doc", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "rich", body: "not a doc" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("rejects { format: 'rich', body: { type: 'paragraph' } } (type is not 'doc')", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "rich", body: { type: "paragraph" } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("rejects { format: 'rich', body: { type: 'doc' } } (missing content)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "rich", body: { type: "doc" } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("rejects unknown format value", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "html", body: "<p>test</p>" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("rejects non-object, non-string review", () => {
    const result = validateBookInput({ ...VALID_BOOK, review: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });

  it("accepts { format: 'rich', body: { type: 'doc', content: [] } } (empty rich doc)", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "rich", body: { type: "doc", content: [] } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.review).toEqual({
        format: "rich",
        body: { type: "doc", content: [] },
      });
    }
  });

  it("rejects { format: 'plain' } with missing body", () => {
    const result = validateBookInput({
      ...VALID_BOOK,
      review: { format: "plain" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.review).toBeDefined();
  });
});
