import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import type { BookInput } from "@/types/book";

const STORAGE_KEY = "book-tracker:books";

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
});
