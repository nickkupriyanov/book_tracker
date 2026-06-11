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
   * Every unlock known to the store. Includes both confirmed
   * saved unlocks and optimistic entries that have not yet
   * round-tripped through the adapter. Sort helpers in
   * `src/lib/achievements.ts` produce UI ordering.
   */
  unlocks: AchievementUnlock[];
  /**
   * Unlocks whose last save attempt failed. They are not part
   * of `unlocks`'s "saved" set, so the next {@link evaluate}
   * or {@link retry} will resend them until the adapter
   * accepts the batch (spec 024 FR-17).
   */
  pendingUnlocks: AchievementUnlock[];
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
  /**
   * Original error from the last failed operation. Used by
   * `HttpLibrary` to detect a 401 and bounce the user back to
   * login (spec 023 §9 + spec 024).
   */
  lastError: unknown;
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
   * matches an empty set. Re-sends any failed-save `pendingUnlocks`
   * from earlier attempts.
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
   * Force a save attempt for any current pending unlocks. Falls
   * back to a full reload from the adapter when nothing is
   * pending. Used by the retry affordance on the achievements
   * page and the home preview.
   */
  retry(): Promise<void>;
}

let adapter: StorageAdapter | null = null;
let initialisedFor: StorageAdapter | null = null;

/**
 * Module-level set of achievement IDs that the adapter has
 * confirmed as saved. Held outside the store so the public
 * type stays minimal and the comparison that drives
 * `pickIdsToUnlock` does not re-trigger on optimistic /
 * pending updates.
 */
let savedIds: Set<AchievementId> = new Set();

export function __resetAchievements(): void {
  adapter = null;
  initialisedFor = null;
  savedIds = new Set();
  useAchievements.setState({
    status: "loading",
    unlocks: [],
    pendingUnlocks: [],
    isSaving: false,
    error: null,
    lastError: null,
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
  pendingUnlocks: [],
  isSaving: false,
  error: null,
  lastError: null,
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
        lastError: err,
      });
      throw err;
    }
    savedIds = new Set(saved.map((u) => u.achievementId));
    set({ unlocks: saved, status: "ready", error: null, lastError: null });
    // Silent retrospective evaluation: never enqueues a toast.
    await get().evaluate({ silent: true, now: options?.now }, books);
  },
  evaluate: async (options, books) => {
    if (adapter === null) return;
    const silent = options?.silent ?? false;
    const now = options?.now ?? (() => new Date());
    const { eligible } = evaluateAchievements(books);
    const newIds = pickIdsToUnlock(eligible, savedIds);
    const pending = get().pendingUnlocks;
    if (newIds.length === 0 && pending.length === 0) {
      return;
    }
    const unlockedAt = now().toISOString();
    const optimistic: AchievementUnlock[] = newIds.map((id) => ({
      achievementId: id,
      unlockedAt,
    }));
    // The batch the adapter actually sees: any failed-save
    // pending unlocks from previous attempts plus the new
    // optimistic entries. The adapter is idempotent and
    // dedupes on `achievementId`, so the union is safe.
    const batch: AchievementUnlock[] = dedupeUnlocks([
      ...pending,
      ...optimistic,
    ]);
    set((state) => ({
      // Show the optimistic + pending in the UI immediately so
      // the user sees progress; the store dedupes on render.
      unlocks: dedupeUnlocks([...state.unlocks, ...batch]),
      isSaving: true,
      error: null,
    }));
    try {
      const canonical = await adapter.saveAchievementUnlocks(batch);
      const canonicalById = new Map(
        canonical.map((u) => [u.achievementId, u]),
      );
      for (const id of batch.map((b) => b.achievementId)) {
        savedIds.add(id);
      }
      set((state) => {
        const merged = dedupeUnlocks([
          ...state.unlocks,
          ...canonical,
          ...batch,
        ]);
        return {
          unlocks: merged,
          pendingUnlocks: [],
          isSaving: false,
          lastError: null,
          // Only fire a toast for IDs the user just discovered.
          notification: silent || newIds.length === 0
            ? null
            : { ids: newIds, unlockedAt },
        };
        // Touch the canonical lookup to keep types honest.
        void canonicalById;
      });
    } catch (err) {
      console.error("[Achievements] save failed", err);
      set((state) => ({
        isSaving: false,
        error: ACHIEVEMENT_SAVE_ERROR_MESSAGE,
        lastError: err,
        // Optimistic + previous pending stay in `unlocks` and
        // become the new `pendingUnlocks` so the next evaluate
        // or retry resends them. `savedIds` is untouched, so
        // the same batch will be picked up again.
        pendingUnlocks: dedupeUnlocks([
          ...state.pendingUnlocks,
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
    const pending = get().pendingUnlocks;
    if (pending.length === 0) {
      set({ error: null, status: "loading", lastError: null });
      try {
        const saved = dedupeUnlocks(await adapter.listAchievementUnlocks());
        savedIds = new Set(saved.map((u) => u.achievementId));
        set({ unlocks: saved, status: "ready" });
      } catch (err) {
        console.error("[Achievements] retry failed", err);
        set({
          status: "error",
          error: ACHIEVEMENT_LOAD_ERROR_MESSAGE,
          lastError: err,
        });
      }
      return;
    }
    // Resend the pending batch. `evaluate` already maintains
    // `unlocks` optimistically; the same call path is correct
    // for retry.
    set({ error: null, isSaving: true, lastError: null });
    try {
      const canonical = await adapter.saveAchievementUnlocks(pending);
      for (const id of pending.map((b) => b.achievementId)) {
        savedIds.add(id);
      }
      set((state) => {
        const merged = dedupeUnlocks([
          ...state.unlocks,
          ...canonical,
          ...pending,
        ]);
        return {
          unlocks: merged,
          pendingUnlocks: [],
          isSaving: false,
          lastError: null,
        };
      });
    } catch (err) {
      console.error("[Achievements] retry save failed", err);
      set({
        isSaving: false,
        error: ACHIEVEMENT_SAVE_ERROR_MESSAGE,
        lastError: err,
      });
    }
  },
}));
