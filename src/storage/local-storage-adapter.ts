import type { Book, BookInput } from "@/types/book";
import type {
  AnnualReadingChallenge,
  AnnualReadingChallengeInput,
} from "@/types/challenge";
import type {
  AchievementId,
  AchievementUnlock,
} from "@/types/achievement";
import { ACHIEVEMENT_IDS } from "@/types/achievement";
import type { StorageAdapter } from "./storage-adapter";

/**
 * Versioned storage key. The `book-tracker:` prefix is insurance for the
 * future migration to a backend — if we ever need to wipe client data or
 * run a migration, we can scope it cleanly (plan D-P4).
 */
const STORAGE_KEY = "book-tracker:books";

/**
 * Separate key for the per-year reading challenge (spec 018).
 * Lives outside the books payload so challenge settings are
 * isolated from book data and can be cleared or migrated
 * independently. The stored value is a `{ [year]: Challenge }`
 * map so the adapter can serve every year from one read.
 */
const CHALLENGE_KEY = "book-tracker:annual-reading-challenge";

/**
 * Separate key for achievement unlocks (spec 024). Isolated
 * from book data so corrupt achievement storage cannot
 * interfere with the library and so the books payload never
 * has to be migrated when the achievement catalog grows.
 */
const ACHIEVEMENT_KEY = "book-tracker:achievement-unlocks";

/**
 * Known v1 achievement IDs. The local adapter uses this set to
 * reject persisted entries that no longer exist in the catalog
 * (forward-compat insurance — see plan §6).
 */
const KNOWN_ACHIEVEMENT_IDS: ReadonlySet<AchievementId> = new Set(
  ACHIEVEMENT_IDS,
);

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

  async updateBook(id: string, input: BookInput): Promise<Book> {
    const books = await this.listBooks();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error(`Book with id "${id}" not found`);
    }
    // Invariant: index !== -1, so `books[index]` is defined. The
    // defensive check below makes the type system happy and also guards
    // against array mutation between findIndex and access (single-threaded
    // JS, so impossible in practice — but the throw keeps the code
    // honest if invariants ever change).
    const existing = books[index];
    if (existing === undefined) {
      throw new Error(
        `Invariant: book at index ${index} disappeared after findIndex`
      );
    }
    const updated: Book = {
      ...input,
      id,
      createdAt: existing.createdAt,
    };
    books[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    return updated;
  }

  async deleteBook(id: string): Promise<void> {
    const books = await this.listBooks();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error(`Book with id "${id}" not found`);
    }
    books.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  async getAnnualReadingChallenge(
    year: number
  ): Promise<AnnualReadingChallenge | null> {
    const map = readChallengeMap();
    const entry = map[String(year)];
    if (entry === undefined) return null;
    if (!isValidChallenge(entry)) {
      console.warn(
        `[LocalStorageAdapter] Stored challenge for ${year} is malformed, treating as missing`
      );
      return null;
    }
    return entry;
  }

  async saveAnnualReadingChallenge(
    input: AnnualReadingChallengeInput
  ): Promise<AnnualReadingChallenge> {
    const next: AnnualReadingChallenge = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const map = readChallengeMap();
    map[String(input.year)] = next;
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(map));
    return next;
  }

  async listAchievementUnlocks(): Promise<AchievementUnlock[]> {
    return readAchievementUnlocks();
  }

  async saveAchievementUnlocks(
    unlocks: AchievementUnlock[]
  ): Promise<AchievementUnlock[]> {
    const existing = readAchievementUnlocks();
    const byId = new Map<AchievementId, AchievementUnlock>();
    for (const unlock of existing) {
      byId.set(unlock.achievementId, unlock);
    }
    for (const requested of unlocks) {
      if (!isValidUnlock(requested)) continue;
      const current = byId.get(requested.achievementId);
      if (current === undefined) {
        byId.set(requested.achievementId, requested);
        continue;
      }
      if (requested.unlockedAt.localeCompare(current.unlockedAt) < 0) {
        byId.set(requested.achievementId, requested);
      }
    }
    const merged = Array.from(byId.values());
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(merged));
    const lookup = new Map<AchievementId, AchievementUnlock>();
    for (const unlock of merged) {
      lookup.set(unlock.achievementId, unlock);
    }
    const ordered: AchievementUnlock[] = [];
    for (const requested of unlocks) {
      const canonical = lookup.get(requested.achievementId);
      if (canonical !== undefined) ordered.push(canonical);
    }
    return ordered;
  }
}

/**
 * Reads the saved achievement unlock array. Absent, corrupt, or
 * non-array storage collapses to `[]` (mirrors `listBooks`).
 * Per-entry validation drops anything that is not one of the
 * eight v1 IDs with a parseable ISO timestamp; the rest of the
 * array is preserved.
 */
function readAchievementUnlocks(): AchievementUnlock[] {
  const raw = localStorage.getItem(ACHIEVEMENT_KEY);
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(
      `[LocalStorageAdapter] Failed to parse ${ACHIEVEMENT_KEY}, treating as empty`,
      err
    );
    return [];
  }
  if (!Array.isArray(parsed)) {
    console.warn(
      `[LocalStorageAdapter] Value at ${ACHIEVEMENT_KEY} is not an array, treating as empty`
    );
    return [];
  }
  const valid: AchievementUnlock[] = [];
  for (const entry of parsed) {
    if (!isValidUnlock(entry)) continue;
    valid.push(entry);
  }
  return valid;
}

function isValidUnlock(value: unknown): value is AchievementUnlock {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { achievementId?: unknown; unlockedAt?: unknown };
  if (
    typeof candidate.achievementId !== "string" ||
    !KNOWN_ACHIEVEMENT_IDS.has(candidate.achievementId as AchievementId)
  ) {
    return false;
  }
  if (typeof candidate.unlockedAt !== "string") return false;
  const parsed = Date.parse(candidate.unlockedAt);
  if (!Number.isFinite(parsed)) return false;
  return true;
}

/**
 * Reads the challenge map from localStorage. Returns an empty
 * object when the key is absent, when the JSON is corrupt, or
 * when the stored value is not a plain object. All "missing or
 * broken" cases collapse to the same empty-map result so the
 * rest of the adapter can ignore the failure mode (mirrors
 * `listBooks`).
 */
function readChallengeMap(): Record<string, AnnualReadingChallenge> {
  const raw = localStorage.getItem(CHALLENGE_KEY);
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(
      `[LocalStorageAdapter] Failed to parse ${CHALLENGE_KEY}, treating as empty`,
      err
    );
    return {};
  }
  if (!isPlainObject(parsed)) {
    console.warn(
      `[LocalStorageAdapter] Value at ${CHALLENGE_KEY} is not an object, treating as empty`
    );
    return {};
  }
  return parsed as Record<string, AnnualReadingChallenge>;
}

/**
 * Narrow type guard for "object" (not array, not null). Used by
 * the challenge map reader and the per-entry validator so we
 * can keep the rest of the code `unknown`-free.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates a single stored challenge entry. Rejects entries
 * that are missing fields, have the wrong shape, or carry a
 * non-positive `targetBooks`. Corrupt-or-missing is treated
 * as no saved challenge per spec 018 §8.
 */
function isValidChallenge(value: unknown): value is AnnualReadingChallenge {
  if (!isPlainObject(value)) return false;
  if (typeof value["year"] !== "number" || !Number.isInteger(value["year"])) {
    return false;
  }
  if (
    typeof value["targetBooks"] !== "number" ||
    !Number.isInteger(value["targetBooks"]) ||
    value["targetBooks"] <= 0
  ) {
    return false;
  }
  if (typeof value["updatedAt"] !== "string") return false;
  return true;
}
