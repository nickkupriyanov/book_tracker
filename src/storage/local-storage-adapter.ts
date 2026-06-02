import type { Book, BookInput } from "@/types/book";
import type { StorageAdapter } from "./storage-adapter";

/**
 * Versioned storage key. The `book-tracker:` prefix is insurance for the
 * future migration to a backend — if we ever need to wipe client data or
 * run a migration, we can scope it cleanly (plan D-P4).
 */
const STORAGE_KEY = "book-tracker:books";

/**
 * LocalStorage-backed implementation of {@link StorageAdapter}.
 *
 * The sole persistence layer for the MVP. A future `HttpStorageAdapter`
 * will conform to the same interface and replace this in the wiring
 * without any change to the UI or the Zustand store (plan §5).
 */
export class LocalStorageAdapter implements StorageAdapter {
  async listBooks(): Promise<Book[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(
        `[LocalStorageAdapter] Failed to parse ${STORAGE_KEY}, treating as empty`,
        err
      );
      return [];
    }
    if (!Array.isArray(parsed)) {
      console.warn(
        `[LocalStorageAdapter] Value at ${STORAGE_KEY} is not an array, treating as empty`
      );
      return [];
    }
    // Trust the persisted shape: this adapter is the only writer in MVP,
    // so the data here was put there by `addBook` below. A future spec
    // (HTTP adapter, multi-client, migration) will need a runtime guard.
    return parsed as Book[];
  }

  async addBook(input: BookInput): Promise<Book> {
    const book: Book = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const existing = await this.listBooks();
    const next = [...existing, book];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return book;
  }
}
