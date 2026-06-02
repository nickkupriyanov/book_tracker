import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { StorageAdapter } from "@/storage/storage-adapter";
import type { Book, BookInput } from "@/types/book";

function makeFakeAdapter(overrides: Partial<StorageAdapter> = {}): StorageAdapter {
  return {
    listBooks: vi.fn().mockResolvedValue([]),
    addBook: vi.fn(async (input: BookInput): Promise<Book> => ({
      ...input,
      id: "fake-id",
      createdAt: new Date().toISOString(),
    })),
    ...overrides,
  };
}

const sampleInput: BookInput = {
  title: "Piranesi",
  author: "Susanna Clarke",
  status: "reading",
  tags: [],
};

describe("useBookLibrary", () => {
  beforeEach(() => {
    __resetBookLibrary();
  });

  describe("initial state", () => {
    it("starts with empty books and loading status", () => {
      const state = useBookLibrary.getState();
      expect(state.books).toEqual([]);
      expect(state.status).toBe("loading");
    });
  });

  describe("init", () => {
    it("loads books from the adapter and sets status to ready", async () => {
      const existing: Book = {
        id: "1",
        title: "Pre-existing",
        author: "Someone",
        status: "read",
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existing]),
      });
      await useBookLibrary.getState().init(adapter);
      const state = useBookLibrary.getState();
      expect(state.books).toEqual([existing]);
      expect(state.status).toBe("ready");
    });

    it("is idempotent: second init is a no-op", async () => {
      const first = makeFakeAdapter();
      const second = makeFakeAdapter();
      await useBookLibrary.getState().init(first);
      await useBookLibrary.getState().init(second);
      expect(first.listBooks).toHaveBeenCalledTimes(1);
      expect(second.listBooks).not.toHaveBeenCalled();
    });

    it("propagates adapter errors and sets status to error", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockRejectedValue(new Error("boom")),
      });
      await expect(useBookLibrary.getState().init(adapter)).rejects.toThrow("boom");
      expect(useBookLibrary.getState().status).toBe("error");
    });

    it("allows retry after init failure", async () => {
      const failing = makeFakeAdapter({
        listBooks: vi.fn().mockRejectedValue(new Error("first fails")),
      });
      const working = makeFakeAdapter();
      await expect(useBookLibrary.getState().init(failing)).rejects.toThrow();
      // Retry with a working adapter should succeed.
      await useBookLibrary.getState().init(working);
      expect(useBookLibrary.getState().status).toBe("ready");
    });
  });

  describe("addBook", () => {
    it("throws if init has not been called", async () => {
      await expect(useBookLibrary.getState().addBook(sampleInput)).rejects.toThrow(/init/);
    });

    it("calls adapter.addBook and prepends the new book", async () => {
      const added: Book = {
        id: "new",
        title: "New",
        author: "new",
        status: "reading",
        tags: [],
        createdAt: "2026-06-02T00:00:00.000Z",
      };
      const adapter = makeFakeAdapter({
        addBook: vi.fn().mockResolvedValue(added),
      });
      await useBookLibrary.getState().init(adapter);
      const result = await useBookLibrary.getState().addBook({
        title: "New",
        author: "new",
        status: "reading",
        tags: [],
      });
      expect(result).toEqual(added);
      const state = useBookLibrary.getState();
      expect(state.books).toEqual([added]);
      expect(state.status).toBe("ready");
    });

    it("preserves existing books and puts newer first", async () => {
      const older: Book = {
        id: "old",
        title: "Old",
        author: "old",
        status: "read",
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      const newer: Book = {
        id: "new",
        title: "New",
        author: "new",
        status: "reading",
        tags: [],
        createdAt: "2026-06-02T00:00:00.000Z",
      };
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([older]),
        addBook: vi.fn().mockResolvedValue(newer),
      });
      await useBookLibrary.getState().init(adapter);
      await useBookLibrary.getState().addBook({
        title: "New",
        author: "new",
        status: "reading",
        tags: [],
      });
      const state = useBookLibrary.getState();
      expect(state.books).toEqual([newer, older]);
    });

    it("propagates adapter.addBook errors and sets status to error", async () => {
      const adapter = makeFakeAdapter({
        addBook: vi.fn().mockRejectedValue(new Error("storage full")),
      });
      await useBookLibrary.getState().init(adapter);
      await expect(useBookLibrary.getState().addBook(sampleInput)).rejects.toThrow(
        "storage full"
      );
      expect(useBookLibrary.getState().status).toBe("error");
    });
  });
});
