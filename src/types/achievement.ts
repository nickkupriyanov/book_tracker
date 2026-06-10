/**
 * Domain types for reader achievements (spec 024).
 *
 * The achievement catalog is application code, not user data — it
 * defines the eight v1 achievements, their display copy, and the
 * flag that hides a definition until it is unlocked. The only thing
 * persisted per user is a list of unlocks (the IDs they have
 * earned and when they were first discovered).
 */

export type AchievementId =
  | "first-finished-book"
  | "five-finished-books"
  | "long-read"
  | "first-quote"
  | "first-review"
  | "five-rated-books"
  | "seven-day-streak"
  | "thousand-pages";

export const ACHIEVEMENT_IDS: readonly AchievementId[] = [
  "first-finished-book",
  "five-finished-books",
  "long-read",
  "first-quote",
  "first-review",
  "five-rated-books",
  "seven-day-streak",
  "thousand-pages",
] as const;

export interface AchievementUnlock {
  achievementId: AchievementId;
  /**
   * ISO 8601 timestamp assigned when the application first
   * discovers and successfully records the unlock. Never
   * rewritten by later saves.
   */
  unlockedAt: string;
}

export type AchievementIconKey =
  | "first-book"
  | "five-books"
  | "long-read"
  | "first-quote"
  | "first-review"
  | "five-rated"
  | "streak"
  | "thousand-pages";

export interface AchievementDefinition {
  id: AchievementId;
  /** Short display title. Revealed only after unlock for secret items. */
  title: string;
  /** One-line description. Revealed only after unlock for secret items. */
  description: string;
  /**
   * Condition copy shown on locked visible cards ("Mark a book
   * as read to earn this"). Hidden for secret items.
   */
  condition: string;
  /** Icon key resolved by the UI to a Lucide glyph. */
  icon: AchievementIconKey;
  /**
   * True for the two secret items. The UI masks the title,
   * description, and condition of a secret definition until
   * the user unlocks it.
   */
  secret: boolean;
}
