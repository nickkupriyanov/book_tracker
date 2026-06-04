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
    updateBook: vi.fn(
      async (id: string, input: BookInput): Promise<Book> => ({
        ...input,
        id,
        createdAt: new Date().toISOString(),
      })
    ),
    deleteBook: vi.fn(async (): Promise<void> => undefined),
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

  describe("updateBook", () => {
    // Dates are ordered so the store's sortByCreatedAtDesc produces
    // [A, B, C] — i.e. A is the newest, C is the oldest. The test
    // data must match the store's sort to make the order assertions
    // meaningful.
    const existingA: Book = {
      id: "a",
      title: "A",
      author: "a",
      status: "want",
      tags: [],
      createdAt: "2026-03-01T00:00:00.000Z",
    };
    const existingB: Book = {
      id: "b",
      title: "B",
      author: "b",
      status: "reading",
      tags: [],
      createdAt: "2026-02-01T00:00:00.000Z",
    };
    const existingC: Book = {
      id: "c",
      title: "C",
      author: "c",
      status: "read",
      tags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    it("updates an existing book and returns the updated book", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA, existingB]),
      });
      await useBookLibrary.getState().init(adapter);

      const updated = await useBookLibrary.getState().updateBook("a", {
        title: "A-new",
        author: "a-new",
        status: "reading",
        tags: [],
      });

      expect(updated.title).toBe("A-new");
      expect(updated.id).toBe("a");
      // Don't check createdAt here — that's the adapter's contract,
      // covered by T1 (LocalStorageAdapter tests).
    });

    it("replaces the book in place, preserving other books", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA, existingB, existingC]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().updateBook("b", {
        title: "B-new",
        author: "b",
        status: "read",
        tags: [],
      });

      const state = useBookLibrary.getState();
      expect(state.books).toHaveLength(3);
      expect(state.books.find((b) => b.id === "a")).toEqual(existingA);
      expect(state.books.find((b) => b.id === "b")?.title).toBe("B-new");
      expect(state.books.find((b) => b.id === "c")).toEqual(existingC);
    });

    it("preserves the order of books after update", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA, existingB, existingC]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().updateBook("b", {
        title: "B-new",
        author: "b",
        status: "read",
        tags: [],
      });

      const state = useBookLibrary.getState();
      expect(state.books.map((b) => b.id)).toEqual(["a", "b", "c"]);
    });

    it("sets status to 'ready' after a successful update", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().updateBook("a", {
        title: "A-new",
        author: "a",
        status: "want",
        tags: [],
      });

      expect(useBookLibrary.getState().status).toBe("ready");
    });

    it("propagates adapter.updateBook errors and sets status to error", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA]),
        updateBook: vi.fn().mockRejectedValue(new Error("not found")),
      });
      await useBookLibrary.getState().init(adapter);

      await expect(
        useBookLibrary.getState().updateBook("a", {
          title: "A-new",
          author: "a",
          status: "want",
          tags: [],
        })
      ).rejects.toThrow("not found");
      expect(useBookLibrary.getState().status).toBe("error");
    });

    it("throws if init has not been called", async () => {
      await expect(
        useBookLibrary.getState().updateBook("a", {
          title: "A",
          author: "a",
          status: "want",
          tags: [],
        })
      ).rejects.toThrow(/init/);
    });
  });

  describe("deleteBook", () => {
    const existingA: Book = {
      id: "a",
      title: "A",
      author: "a",
      status: "want",
      tags: [],
      createdAt: "2026-03-01T00:00:00.000Z",
    };
    const existingB: Book = {
      id: "b",
      title: "B",
      author: "b",
      status: "reading",
      tags: [],
      createdAt: "2026-02-01T00:00:00.000Z",
    };
    const existingC: Book = {
      id: "c",
      title: "C",
      author: "c",
      status: "read",
      tags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    it("calls adapter.deleteBook with the given id", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA, existingB]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().deleteBook("b");

      expect(adapter.deleteBook).toHaveBeenCalledWith("b");
    });

    it("removes the targeted book and preserves the others", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA, existingB, existingC]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().deleteBook("b");

      const state = useBookLibrary.getState();
      expect(state.books).toHaveLength(2);
      expect(state.books.find((b) => b.id === "a")).toEqual(existingA);
      expect(state.books.find((b) => b.id === "c")).toEqual(existingC);
      expect(state.books.find((b) => b.id === "b")).toBeUndefined();
    });

    it("preserves the order of the remaining books", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA, existingB, existingC]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().deleteBook("b");

      expect(useBookLibrary.getState().books.map((b) => b.id)).toEqual([
        "a",
        "c",
      ]);
    });

    it("sets status to 'ready' after a successful delete", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA]),
      });
      await useBookLibrary.getState().init(adapter);

      await useBookLibrary.getState().deleteBook("a");

      expect(useBookLibrary.getState().status).toBe("ready");
    });

    it("propagates adapter.deleteBook errors and sets status to error", async () => {
      const adapter = makeFakeAdapter({
        listBooks: vi.fn().mockResolvedValue([existingA]),
        deleteBook: vi.fn().mockRejectedValue(new Error("not found")),
      });
      await useBookLibrary.getState().init(adapter);

      await expect(
        useBookLibrary.getState().deleteBook("a")
      ).rejects.toThrow("not found");
      expect(useBookLibrary.getState().status).toBe("error");
    });

    it("throws if init has not been called", async () => {
      await expect(
        useBookLibrary.getState().deleteBook("a")
      ).rejects.toThrow(/init/);
    });
  });
});
