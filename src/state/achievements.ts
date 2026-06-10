import { create } from "zustand";
import type { Book } from "@/types/book";
import type {
  AchievementId,
  AchievementUnlock,
} from "@/types/achievement";
import type { StorageAdapter } from "@/storage/storage-adapter";
import { evaluateAchievements } from "@/lib/achievements";

/**
 * Friendly inline error shown when achievement persistence
 * fails (spec 024 FR-16, FR-17). The store keeps unlocks in
 * memory so the UI can render them and offer a retry.
 */
const ACHIEVEMENT_SAVE_ERROR_MESSAGE =
  "Could not save your achievement progress. Please try again.";

const ACHIEVEMENT_LOAD_ERROR_MESSAGE =
  "Could not load your achievements. Please try again.";

export type AchievementStatus = "loading" | "ready" | "error";

/**
 * One pending notification payload per evaluation. The bridge
 * component reads the payload, renders a single Sonner toast,
 * then calls {@link acknowledgeNotification} so the same batch
 * never re-renders a second toast.
 */
export interface AchievementNotification {
  /** New unlock IDs unlocked in this batch (catalog order). */
  ids: AchievementId[];
  /** Shared discovery timestamp for the entire batch. */
  unlockedAt: string;
}

export interface AchievementState {
  status: AchievementStatus;
  /**
   * Every unlock known to the store (saved + pending). Sort
   * helpers in `src/lib/achievements.ts` produce UI ordering.
   */
  unlocks: AchievementUnlock[];
  /**
   * True when at least one save attempt is in flight. UI uses
   * this to disable the retry button.
   */
  isSaving: boolean;
  /**
   * Friendly inline error from the last failed load or save.
   * Cleared on the next successful operation. `null` when no
   * error is active.
   */
  error: string | null;
  /** Most recent notification payload waiting for the toast bridge. */
  notification: AchievementNotification | null;
  /**
   * Initialize the store with an adapter. Loads existing unlocks,
   * performs one silent retrospective evaluation against the
   * current books, and stores anything new. Subsequent calls
   * with the same adapter are no-ops; a new adapter (e.g. on
   * logout/login or mode switch) resets state and re-runs.
   */
  init(
    adapter: StorageAdapter,
    options: { now?: () => Date } | undefined,
    books: readonly Book[]
  ): Promise<void>;
  /**
   * Re-evaluate the current library against the saved unlocks and
   * persist any newly matched achievements. Persists the new
   * batch with one shared discovery timestamp, exposes one
   * notification payload, and is silent when the evaluation
   * matches an empty set.
   */
  evaluate(
    options: { now?: () => Date; silent?: boolean } | undefined,
    books: readonly Book[]
  ): Promise<void>;
  /**
   * Mark the current notification as consumed. The toast bridge
   * calls this after rendering the Sonner toast.
   */
  acknowledgeNotification(): void;
  /**
   * Force-reload unlocks from the adapter. Used by the retry
   * affordance on the achievements page.
   */
  retry(): Promise<void>;
}

let adapter: StorageAdapter | null = null;
let initialisedFor: StorageAdapter | null = null;

export function __resetAchievements(): void {
  adapter = null;
  initialisedFor = null;
  useAchievements.setState({
    status: "loading",
    unlocks: [],
    isSaving: false,
    error: null,
    notification: null,
  });
}

function dedupeUnlocks(
  unlocks: readonly AchievementUnlock[]
): AchievementUnlock[] {
  const byId = new Map<AchievementId, AchievementUnlock>();
  for (const unlock of unlocks) {
    const current = byId.get(unlock.achievementId);
    if (current === undefined) {
      byId.set(unlock.achievementId, unlock);
      continue;
    }
    if (unlock.unlockedAt.localeCompare(current.unlockedAt) < 0) {
      byId.set(unlock.achievementId, unlock);
    }
  }
  return Array.from(byId.values());
}

function pickIdsToUnlock(
  eligible: ReadonlySet<AchievementId>,
  known: ReadonlySet<AchievementId>
): AchievementId[] {
  const ids: AchievementId[] = [];
  for (const id of eligible) {
    if (known.has(id)) continue;
    ids.push(id);
  }
  return ids;
}

export const useAchievements = create<AchievementState>((set, get) => ({
  status: "loading",
  unlocks: [],
  isSaving: false,
  error: null,
  notification: null,
  init: async (next, options, books) => {
    if (initialisedFor === next) {
      // Same adapter instance — re-run evaluation against the
      // current books so a later re-mount still reconciles.
      await get().evaluate({ silent: true, now: options?.now }, books);
      return;
    }
    __resetAchievements();
    adapter = next;
    initialisedFor = next;
    set({ status: "loading", error: null });
    let saved: AchievementUnlock[];
    try {
      saved = dedupeUnlocks(await next.listAchievementUnlocks());
    } catch (err) {
      console.error("[Achievements] load failed", err);
      set({
        status: "error",
        error: ACHIEVEMENT_LOAD_ERROR_MESSAGE,
      });
      throw err;
    }
    set({ unlocks: saved, status: "ready", error: null });
    // Silent retrospective evaluation: never enqueues a toast.
    await get().evaluate({ silent: true, now: options?.now }, books);
  },
  evaluate: async (options, books) => {
    if (adapter === null) return;
    const silent = options?.silent ?? false;
    const now = options?.now ?? (() => new Date());
    const { eligible } = evaluateAchievements(books);
    const known = new Set(get().unlocks.map((u) => u.achievementId));
    const idsToUnlock = pickIdsToUnlock(eligible, known);
    if (idsToUnlock.length === 0) {
      return;
    }
    const unlockedAt = now().toISOString();
    const optimistic: AchievementUnlock[] = idsToUnlock.map((id) => ({
      achievementId: id,
      unlockedAt,
    }));
    set((state) => ({
      unlocks: dedupeUnlocks([...state.unlocks, ...optimistic]),
      isSaving: true,
      error: null,
    }));
    try {
      const canonical = await adapter.saveAchievementUnlocks(optimistic);
      set((state) => {
        const merged = dedupeUnlocks([
          ...state.unlocks,
          ...canonical,
          ...optimistic,
        ]);
        return {
          unlocks: merged,
          isSaving: false,
          notification: silent ? null : { ids: idsToUnlock, unlockedAt },
        };
      });
    } catch (err) {
      console.error("[Achievements] save failed", err);
      set((state) => ({
        isSaving: false,
        error: ACHIEVEMENT_SAVE_ERROR_MESSAGE,
        // Optimistic entries remain in `unlocks` for the rest of
        // the session and the next evaluation/retry will resend
        // the batch (FR-17).
        unlocks: dedupeUnlocks([
          ...state.unlocks,
          ...optimistic,
        ]),
      }));
    }
  },
  acknowledgeNotification: () => {
    set({ notification: null });
  },
  retry: async () => {
    if (adapter === null) return;
    set({ error: null, status: "loading" });
    try {
      const saved = dedupeUnlocks(await adapter.listAchievementUnlocks());
      set({ unlocks: saved, status: "ready" });
    } catch (err) {
      console.error("[Achievements] retry failed", err);
      set({ status: "error", error: ACHIEVEMENT_LOAD_ERROR_MESSAGE });
    }
  },
}));
