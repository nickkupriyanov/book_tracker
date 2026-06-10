import type { Book, BookInput } from "@/types/book";
import type {
  AnnualReadingChallenge,
  AnnualReadingChallengeInput,
} from "@/types/challenge";
import type { AchievementUnlock } from "@/types/achievement";

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
  /**
   * Update an existing book by `id`, replacing the mutable fields
   * (`title`, `author`, `status`, `coverUrl`, `tags`) with `input`.
   * `id` and `createdAt` are preserved from the existing record.
   *
   * @throws if no book with that `id` exists.
   * @throws on storage failure (quota, disabled, network).
   */
  updateBook(id: string, input: BookInput): Promise<Book>;
  /**
   * Remove a book by `id`. No-op (silent success) is intentionally
   * avoided: throws if not found, so a stale-id delete surfaces a
   * real error rather than appearing to succeed.
   *
   * @throws if no book with that `id` exists.
   * @throws on storage failure (quota, disabled, network).
   */
  deleteBook(id: string): Promise<void>;

  /**
   * Read the per-year reading challenge (spec 018). Returns the
   * saved challenge for the requested year, or `null` when nothing
   * has been saved yet. Corrupt or malformed storage is treated
   * as no saved challenge (the same way `listBooks` handles
   * corrupt book data).
   *
   * @throws on real storage failure (quota, disabled, network).
   */
  getAnnualReadingChallenge(
    year: number
  ): Promise<AnnualReadingChallenge | null>;

  /**
   * Persist the per-year reading challenge. The adapter stamps
   * `updatedAt` with the current time and returns the saved record.
   * Implementations must not mutate `input` and must not touch
   * book storage.
   *
   * @throws on storage failure (quota, disabled, network).
   */
  saveAnnualReadingChallenge(
    input: AnnualReadingChallengeInput
  ): Promise<AnnualReadingChallenge>;

  /**
   * Read every saved achievement unlock for the active storage
   * scope. Returns `[]` when nothing has been saved yet; corrupt
   * or malformed entries are dropped silently (spec 024 FR-5,
   * §9).
   *
   * @throws on real storage failure (quota, disabled, network).
   */
  listAchievementUnlocks(): Promise<AchievementUnlock[]>;

  /**
   * Persist a batch of achievement unlocks. Idempotent: an
   * already-saved unlock keeps its original `unlockedAt`. The
   * canonical record for every requested `achievementId` is
   * returned in request order. Implementations must not mutate
   * the input array.
   *
   * @throws on storage failure (quota, disabled, network).
   */
  saveAchievementUnlocks(
    unlocks: AchievementUnlock[]
  ): Promise<AchievementUnlock[]>;
}
