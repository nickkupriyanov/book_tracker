/**
 * Domain types for the yearly reading challenge (spec 018).
 *
 * This file is the contract for the small `AnnualReadingChallenge`
 * setting — a per-year target the user can edit inline in the
 * home right rail. Books remain the source of truth for completed
 * progress; this type only stores the target.
 *
 * Persisted via {@link import("@/storage/storage-adapter").StorageAdapter}
 * (see `getAnnualReadingChallenge` / `saveAnnualReadingChallenge`).
 */

export interface AnnualReadingChallenge {
  /** Local calendar year the target applies to, e.g. `2026`. */
  year: number;
  /** Positive whole number of books the user is aiming for. */
  targetBooks: number;
  /** ISO 8601 timestamp of the last save (stamped by the adapter). */
  updatedAt: string;
}

/**
 * What callers submit to the storage adapter. `updatedAt` is
 * stamped by the adapter on save (spec 018 §8); callers don't
 * supply it. The shape is the rest of {@link AnnualReadingChallenge}
 * — `year` and `targetBooks`.
 */
export type AnnualReadingChallengeInput = Omit<
  AnnualReadingChallenge,
  "updatedAt"
>;
