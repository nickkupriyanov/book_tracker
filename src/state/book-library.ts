import { create } from "zustand";
import type { Book, BookInput } from "@/types/book";
import type { StorageAdapter } from "@/storage/storage-adapter";

export type BookLibraryStatus = "loading" | "ready" | "error";

export interface BookLibraryState {
  /** All books, sorted by `createdAt` descending (newest first). */
  books: Book[];
  status: BookLibraryStatus;
  /**
   * Initialize the store with an adapter. Loads existing books and
   * primes the adapter reference for future {@link addBook} calls.
   * Idempotent: the first successful init wins, subsequent calls are no-ops.
   * If the first init fails, a later init with a working adapter can succeed.
   */
  init(adapter: StorageAdapter): Promise<void>;
  /**
   * Persist a new book via the adapter and prepend it to the list.
   * @throws if {@link init} has not been called or if the adapter fails.
   */
  addBook(input: BookInput): Promise<Book>;
  /**
   * Update an existing book by `id` via the adapter. Replaces the book
   * in place (other books and ordering are preserved).
   * @throws if {@link init} has not been called, if the adapter fails,
   * or if no book with the given `id` exists.
   */
  updateBook(id: string, input: BookInput): Promise<Book>;
}

/**
 * Module-level adapter reference. Held outside the store so the public
 * type stays minimal and consumers can't accidentally subscribe to it
 * via Zustand selectors (plan D-P1 / §4).
 */
let adapter: StorageAdapter | null = null;

function sortByCreatedAtDesc(books: Book[]): Book[] {
  return [...books].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * @internal
 * Resets the store for tests: clears the adapter reference and the state.
 * Not for production use.
 */
export function __resetBookLibrary(): void {
  adapter = null;
  useBookLibrary.setState({ books: [], status: "loading" });
}

export const useBookLibrary = create<BookLibraryState>((set) => ({
  books: [],
  status: "loading",
  init: async (next) => {
    if (adapter !== null) return;
    try {
      const books = sortByCreatedAtDesc(await next.listBooks());
      set({ books, status: "ready" });
      adapter = next;
    } catch (err) {
      set({ status: "error" });
      throw err;
    }
  },
  addBook: async (input) => {
    if (adapter === null) {
      throw new Error("useBookLibrary: addBook called before init()");
    }
    try {
      const book = await adapter.addBook(input);
      set((state) => ({
        books: sortByCreatedAtDesc([book, ...state.books]),
        status: "ready",
      }));
      return book;
    } catch (err) {
      set({ status: "error" });
      throw err;
    }
  },
  updateBook: async (id, input) => {
    if (adapter === null) {
      throw new Error("useBookLibrary: updateBook called before init()");
    }
    try {
      const updated = await adapter.updateBook(id, input);
      // No re-sort needed: `updated.createdAt` is preserved by the adapter,
      // so the book's position in the list is unchanged.
      set((state) => ({
        books: state.books.map((b) => (b.id === id ? updated : b)),
        status: "ready",
      }));
      return updated;
    } catch (err) {
      set({ status: "error" });
      throw err;
    }
  },
}));
