import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import type { BookInput } from "@/types/book";
import type { AnnualReadingChallengeInput } from "@/types/challenge";

const STORAGE_KEY = "book-tracker:books";
const CHALLENGE_KEY = "book-tracker:annual-reading-challenge";

describe("LocalStorageAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("listBooks", () => {
    it("returns an empty array when storage is empty", async () => {
      const adapter = new LocalStorageAdapter();
      const books = await adapter.listBooks();
      expect(books).toEqual([]);
    });

    it("returns a previously added book", async () => {
      const adapter = new LocalStorageAdapter();
      const input: BookInput = {
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "reading",
        tags: [],
      };
      const added = await adapter.addBook(input);
      const books = await adapter.listBooks();
      expect(books).toHaveLength(1);
      expect(books[0]).toEqual(added);
    });

    it("returns multiple books in insertion order", async () => {
      const adapter = new LocalStorageAdapter();
      const a = await adapter.addBook({ title: "A", author: "a", status: "want", tags: [] });
      const b = await adapter.addBook({ title: "B", author: "b", status: "want", tags: [] });
      const c = await adapter.addBook({ title: "C", author: "c", status: "want", tags: [] });
      const books = await adapter.listBooks();
      expect(books).toEqual([a, b, c]);
    });

    it("returns an empty array and warns on corrupt JSON", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, "not valid json");
      const adapter = new LocalStorageAdapter();
      const books = await adapter.listBooks();
      expect(books).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns an empty array and warns when stored value is not an array", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
      const adapter = new LocalStorageAdapter();
      const books = await adapter.listBooks();
      expect(books).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("addBook", () => {
    it("returns a book with id and createdAt set", async () => {
      const adapter = new LocalStorageAdapter();
      const input: BookInput = {
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "reading",
        tags: ["fiction"],
      };
      const book = await adapter.addBook(input);
      expect(book.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(book.createdAt).toBeDefined();
      expect(() => new Date(book.createdAt).toISOString()).not.toThrow();
    });

    it("preserves all input fields, including optional coverUrl", async () => {
      const adapter = new LocalStorageAdapter();
      const input: BookInput = {
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "read",
        coverUrl: "https://example.com/cover.jpg",
        tags: ["fiction", "fantasy"],
      };
      const book = await adapter.addBook(input);
      expect(book.title).toBe("Piranesi");
      expect(book.author).toBe("Susanna Clarke");
      expect(book.status).toBe("read");
      expect(book.coverUrl).toBe("https://example.com/cover.jpg");
      expect(book.tags).toEqual(["fiction", "fantasy"]);
    });

    it("does not mutate the input", async () => {
      const adapter = new LocalStorageAdapter();
      const input: BookInput = {
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "reading",
        tags: ["fiction"],
      };
      const snapshot = { ...input, tags: [...input.tags] };
      await adapter.addBook(input);
      expect(input).toEqual(snapshot);
    });

    it("generates unique ids across multiple calls", async () => {
      const adapter = new LocalStorageAdapter();
      const a = await adapter.addBook({ title: "A", author: "a", status: "want", tags: [] });
      const b = await adapter.addBook({ title: "B", author: "b", status: "want", tags: [] });
      expect(a.id).not.toBe(b.id);
    });

    it("persists across adapter instances", async () => {
      const first = new LocalStorageAdapter();
      const added = await first.addBook({
        title: "Persistent",
        author: "x",
        status: "want",
        tags: [],
      });
      const second = new LocalStorageAdapter();
      const books = await second.listBooks();
      expect(books).toHaveLength(1);
      expect(books[0]?.id).toBe(added.id);
    });

    it("propagates QuotaExceededError from setItem", async () => {
      const adapter = new LocalStorageAdapter();
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          const err = new Error("quota");
          err.name = "QuotaExceededError";
          throw err;
        });
      await expect(
        adapter.addBook({ title: "X", author: "x", status: "want", tags: [] })
      ).rejects.toThrow();
      setItemSpy.mockRestore();
    });
  });

  describe("updateBook", () => {
    const original: BookInput = {
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "want",
      tags: ["fiction"],
    };

    it("updates an existing book and returns it with new fields", async () => {
      const adapter = new LocalStorageAdapter();
      const added = await adapter.addBook(original);
      const updated = await adapter.updateBook(added.id, {
        title: "The Long Way",
        author: "Becky Chambers",
        status: "reading",
        tags: ["sci-fi"],
      });
      expect(updated.title).toBe("The Long Way");
      expect(updated.author).toBe("Becky Chambers");
      expect(updated.status).toBe("reading");
      expect(updated.tags).toEqual(["sci-fi"]);
    });

    it("preserves the book's id and createdAt across the update", async () => {
      const adapter = new LocalStorageAdapter();
      const added = await adapter.addBook(original);
      const updated = await adapter.updateBook(added.id, {
        title: "Updated",
        author: "Updated",
        status: "read",
        tags: [],
      });
      expect(updated.id).toBe(added.id);
      expect(updated.createdAt).toBe(added.createdAt);
    });

    it("throws when the id is not found", async () => {
      const adapter = new LocalStorageAdapter();
      await expect(
        adapter.updateBook("nonexistent-id", {
          title: "X",
          author: "X",
          status: "want",
          tags: [],
        })
      ).rejects.toThrow(/not found/);
    });

    it("does not affect other books in storage", async () => {
      const adapter = new LocalStorageAdapter();
      const a = await adapter.addBook({
        title: "A",
        author: "a",
        status: "want",
        tags: [],
      });
      const b = await adapter.addBook({
        title: "B",
        author: "b",
        status: "reading",
        tags: [],
      });
      const c = await adapter.addBook({
        title: "C",
        author: "c",
        status: "read",
        tags: [],
      });
      await adapter.updateBook(b.id, {
        title: "B-new",
        author: "b-new",
        status: "want",
        tags: [],
      });
      const all = await adapter.listBooks();
      expect(all).toHaveLength(3);
      expect(all.find((x) => x.id === a.id)).toEqual(a);
      expect(all.find((x) => x.id === c.id)).toEqual(c);
    });

    it("preserves insertion order after an update", async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.addBook({
        title: "A",
        author: "a",
        status: "want",
        tags: [],
      });
      const b = await adapter.addBook({
        title: "B",
        author: "b",
        status: "reading",
        tags: [],
      });
      await adapter.addBook({
        title: "C",
        author: "c",
        status: "read",
        tags: [],
      });
      await adapter.updateBook(b.id, {
        title: "B-new",
        author: "b",
        status: "read",
        tags: [],
      });
      const all = await adapter.listBooks();
      expect(all.map((x) => x.title)).toEqual(["A", "B-new", "C"]);
    });
  });

  describe("deleteBook", () => {
    it("removes the targeted book and leaves the rest of storage intact", async () => {
      const adapter = new LocalStorageAdapter();
      const a = await adapter.addBook({
        title: "A",
        author: "a",
        status: "want",
        tags: [],
      });
      const b = await adapter.addBook({
        title: "B",
        author: "b",
        status: "reading",
        tags: [],
      });
      await adapter.deleteBook(a.id);
      const all = await adapter.listBooks();
      expect(all).toEqual([b]);
    });

    it("preserves the insertion order of the remaining books", async () => {
      const adapter = new LocalStorageAdapter();
      const a = await adapter.addBook({
        title: "A",
        author: "a",
        status: "want",
        tags: [],
      });
      const b = await adapter.addBook({
        title: "B",
        author: "b",
        status: "reading",
        tags: [],
      });
      const c = await adapter.addBook({
        title: "C",
        author: "c",
        status: "read",
        tags: [],
      });
      await adapter.deleteBook(b.id);
      const all = await adapter.listBooks();
      expect(all.map((x) => x.id)).toEqual([a.id, c.id]);
    });

    it("leaves an empty array after deleting the only book", async () => {
      const adapter = new LocalStorageAdapter();
      const a = await adapter.addBook({
        title: "A",
        author: "a",
        status: "want",
        tags: [],
      });
      await adapter.deleteBook(a.id);
      const all = await adapter.listBooks();
      expect(all).toEqual([]);
    });

    it("throws when the id is not found", async () => {
      const adapter = new LocalStorageAdapter();
      await expect(adapter.deleteBook("nonexistent-id")).rejects.toThrow(
        /not found/
      );
    });

    it("propagates QuotaExceededError from setItem", async () => {
      const adapter = new LocalStorageAdapter();
      const added = await adapter.addBook({
        title: "A",
        author: "a",
        status: "want",
        tags: [],
      });
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          const err = new Error("quota");
          err.name = "QuotaExceededError";
          throw err;
        });
      await expect(adapter.deleteBook(added.id)).rejects.toThrow();
      setItemSpy.mockRestore();
    });
  });

  describe("getAnnualReadingChallenge", () => {
    it("returns null when no challenge has been saved", async () => {
      const adapter = new LocalStorageAdapter();
      const result = await adapter.getAnnualReadingChallenge(2026);
      expect(result).toBeNull();
    });

    it("returns the saved challenge for the requested year", async () => {
      const adapter = new LocalStorageAdapter();
      const input: AnnualReadingChallengeInput = {
        year: 2026,
        targetBooks: 12,
      };
      await adapter.saveAnnualReadingChallenge(input);
      const result = await adapter.getAnnualReadingChallenge(2026);
      expect(result).not.toBeNull();
      expect(result?.year).toBe(2026);
      expect(result?.targetBooks).toBe(12);
      expect(typeof result?.updatedAt).toBe("string");
      expect(() => new Date(result!.updatedAt).toISOString()).not.toThrow();
    });

    it("stores each year's challenge independently", async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.saveAnnualReadingChallenge({
        year: 2025,
        targetBooks: 8,
      });
      await adapter.saveAnnualReadingChallenge({
        year: 2026,
        targetBooks: 24,
      });
      expect((await adapter.getAnnualReadingChallenge(2025))?.targetBooks).toBe(8);
      expect((await adapter.getAnnualReadingChallenge(2026))?.targetBooks).toBe(24);
    });

    it("returns null and warns when the stored payload is corrupt JSON", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(CHALLENGE_KEY, "not valid json");
      const adapter = new LocalStorageAdapter();
      const result = await adapter.getAnnualReadingChallenge(2026);
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns null and warns when the stored payload is not an object", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(CHALLENGE_KEY, JSON.stringify(42));
      const adapter = new LocalStorageAdapter();
      const result = await adapter.getAnnualReadingChallenge(2026);
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns null and warns when the stored payload is missing required fields", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(CHALLENGE_KEY, JSON.stringify({ year: 2026 }));
      const adapter = new LocalStorageAdapter();
      const result = await adapter.getAnnualReadingChallenge(2026);
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns null when the requested year is absent but other years exist", async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.saveAnnualReadingChallenge({
        year: 2025,
        targetBooks: 8,
      });
      const result = await adapter.getAnnualReadingChallenge(2026);
      expect(result).toBeNull();
    });
  });

  describe("saveAnnualReadingChallenge", () => {
    it("stamps updatedAt with the current ISO timestamp", async () => {
      const adapter = new LocalStorageAdapter();
      const saved = await adapter.saveAnnualReadingChallenge({
        year: 2026,
        targetBooks: 10,
      });
      expect(() => new Date(saved.updatedAt).toISOString()).not.toThrow();
    });

    it("overwrites a previous challenge for the same year", async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.saveAnnualReadingChallenge({
        year: 2026,
        targetBooks: 10,
      });
      const updated = await adapter.saveAnnualReadingChallenge({
        year: 2026,
        targetBooks: 24,
      });
      expect(updated.targetBooks).toBe(24);
      const loaded = await adapter.getAnnualReadingChallenge(2026);
      expect(loaded?.targetBooks).toBe(24);
    });

    it("does not touch the books storage", async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.addBook({
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "reading",
        tags: [],
      });
      localStorage.removeItem(CHALLENGE_KEY);
      await adapter.saveAnnualReadingChallenge({
        year: 2026,
        targetBooks: 12,
      });
      const booksRaw = localStorage.getItem(STORAGE_KEY);
      expect(booksRaw).not.toBeNull();
      const parsed = JSON.parse(booksRaw!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      // The books key must not be repurposed as the challenge key.
      expect(localStorage.getItem(`${STORAGE_KEY}:annual`)).toBeNull();
    });

    it("does not touch the challenge storage when adding a book", async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.saveAnnualReadingChallenge({
        year: 2026,
        targetBooks: 12,
      });
      const before = localStorage.getItem(CHALLENGE_KEY);
      await adapter.addBook({
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "reading",
        tags: [],
      });
      expect(localStorage.getItem(CHALLENGE_KEY)).toBe(before);
    });

    it("propagates QuotaExceededError from setItem", async () => {
      const adapter = new LocalStorageAdapter();
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          const err = new Error("quota");
          err.name = "QuotaExceededError";
          throw err;
        });
      await expect(
        adapter.saveAnnualReadingChallenge({ year: 2026, targetBooks: 12 })
      ).rejects.toThrow();
      setItemSpy.mockRestore();
    });
  });
});
