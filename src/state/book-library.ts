import { create } from "zustand";
import type { Book, BookInput } from "@/types/book";
import type { StorageAdapter } from "@/storage/storage-adapter";
import type {
  AnnualReadingChallenge,
  AnnualReadingChallengeInput,
} from "@/types/challenge";

export type BookLibraryStatus = "loading" | "ready" | "error";

/**
 * Friendly inline error shown when a challenge save fails
 * (spec 018 FR-14). The store keeps the previous saved target
 * and exposes this string to the card so the user can retry.
 */
const CHALLENGE_SAVE_ERROR_MESSAGE =
  "Could not save your reading goal. Please try again.";

export interface BookLibraryState {
  /** All books, sorted by `createdAt` descending (newest first). */
  books: Book[];
  status: BookLibraryStatus;
  /**
   * Current-year reading challenge (spec 018). `null` when
   * nothing has been saved yet. The store loads this from the
   * adapter during {@link init} and replaces it on save.
   */
  challenge: AnnualReadingChallenge | null;
  /**
   * `true` while a {@link saveChallenge} call is in flight. The
   * card uses this to disable the save button and render a busy
   * affordance.
   */
  isSavingChallenge: boolean;
  /**
   * Accessible inline error from the last failed
   * {@link saveChallenge}. Cleared on the next save attempt.
   * `null` when no error is active.
   */
  challengeError: string | null;
  /**
   * The last error raised by `init`, an add/update/delete, or a
   * save challenge. `null` when the last operation succeeded or
   * none has run yet. Used by the HTTP-mode `HttpLibrary` to detect
   * 401s and return to the login screen (spec 023 §9).
   *
   * `unknown` here on purpose: the store does not narrow the type
   * of the underlying failure (the adapter layer owns that). The
   * HTTP library checks for `HttpStorageError(401)` at the call
   * site.
   */
  lastError: unknown;
  /**
   * Initialize the store with an adapter. Loads existing books
   * and the current-year challenge, then primes the adapter
   * reference for future {@link addBook} / {@link saveChallenge}
   * calls. Idempotent: the first successful init wins, subsequent
   * calls are no-ops. If the first init fails, a later init with
   * a working adapter can succeed.
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
  /**
   * Remove a book by `id` via the adapter. Other books and ordering
   * are preserved.
   * @throws if {@link init} has not been called, if the adapter fails,
   * or if no book with the given `id` exists.
   */
  deleteBook(id: string): Promise<void>;
  /**
   * Persist the current-year reading challenge via the adapter.
   * Replaces the saved challenge in place and clears any prior
   * error. On failure, the previous challenge is preserved and
   * {@link challengeError} is set to a friendly message.
   * @throws if {@link init} has not been called or if the adapter fails.
   */
  saveChallenge(
    input: AnnualReadingChallengeInput
  ): Promise<AnnualReadingChallenge>;
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

function currentLocalYear(): number {
  return new Date().getFullYear();
}

/**
 * @internal
 * Resets the store for tests: clears the adapter reference and the state.
 * Not for production use.
 */
export function __resetBookLibrary(): void {
  adapter = null;
  useBookLibrary.setState({
    books: [],
    status: "loading",
    challenge: null,
    isSavingChallenge: false,
    challengeError: null,
    lastError: null,
  });
}

export const useBookLibrary = create<BookLibraryState>((set) => ({
  books: [],
  status: "loading",
  challenge: null,
  isSavingChallenge: false,
  challengeError: null,
  lastError: null,
  init: async (next) => {
    if (adapter !== null) return;
    set({ lastError: null });
    try {
      const books = sortByCreatedAtDesc(await next.listBooks());
      const challenge = await next.getAnnualReadingChallenge(
        currentLocalYear()
      );
      set({ books, challenge, status: "ready", lastError: null });
      adapter = next;
    } catch (err) {
      set({ status: "error", lastError: err });
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
        lastError: null,
      }));
      return book;
    } catch (err) {
      set({ status: "error", lastError: err });
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
        lastError: null,
      }));
      return updated;
    } catch (err) {
      set({ status: "error", lastError: err });
      throw err;
    }
  },
  deleteBook: async (id) => {
    if (adapter === null) {
      throw new Error("useBookLibrary: deleteBook called before init()");
    }
    try {
      await adapter.deleteBook(id);
      // No re-sort needed: removing an entry doesn't change the relative
      // order of the rest, and the store's sort by `createdAt` desc is
      // already satisfied by `state.books` (additions are prepended,
      // updates preserve order).
      set((state) => ({
        books: state.books.filter((b) => b.id !== id),
        status: "ready",
        lastError: null,
      }));
    } catch (err) {
      set({ status: "error", lastError: err });
      throw err;
    }
  },
  saveChallenge: async (input) => {
    if (adapter === null) {
      throw new Error("useBookLibrary: saveChallenge called before init()");
    }
    // Clear any stale error at the start of the attempt — the user
    // has acknowledged the previous failure by clicking save again.
    set({ isSavingChallenge: true, challengeError: null, lastError: null });
    try {
      const saved = await adapter.saveAnnualReadingChallenge(input);
      set({ challenge: saved, isSavingChallenge: false, lastError: null });
      return saved;
    } catch (err) {
      set({
        isSavingChallenge: false,
        challengeError: CHALLENGE_SAVE_ERROR_MESSAGE,
        lastError: err,
      });
      throw err;
    }
  },
}));
