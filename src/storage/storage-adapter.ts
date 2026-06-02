import type { Book, BookInput } from "@/types/book";

/**
 * Persistence contract for the books library.
 *
 * The MVP ships {@link LocalStorageAdapter}; a future spec will add
 * {@link HttpStorageAdapter} that conforms to this same interface so the
 * UI and the Zustand store don't need to change when the backend arrives.
 *
 * Design notes:
 * - The interface is **persistence only** — it does not own in-memory state.
 *   The Zustand store owns the in-memory list and delegates persistence
 *   to the adapter (plan D-P1 / §5).
 * - Errors are not caught here. Implementations throw on real failure
 *   (quota, disabled storage, network, …) and the caller (store / dialog)
 *   decides what to do.
 */
export interface StorageAdapter {
  /**
   * Return all books, in whatever order the storage provides.
   * The caller is responsible for sorting (the store sorts by `createdAt` desc).
   *
   * @throws on storage failure (corrupt data is handled internally).
   */
  listBooks(): Promise<Book[]>;

  /**
   * Persist a new book and return it with `id` and `createdAt` set.
   * Implementations must not mutate the input.
   *
   * @throws on storage failure (quota, disabled, network).
   */
  addBook(input: BookInput): Promise<Book>;
}
