"use client";

import { useEffect, useRef } from "react";
import { useBookLibrary } from "@/state/book-library";
import { useAchievements } from "@/state/achievements";
import type { StorageAdapter } from "@/storage/storage-adapter";

interface AchievementLifecycleProps {
  adapter: StorageAdapter;
}

/**
 * Subscribes the achievement store to the active book library.
 *
 * - Calls `useAchievements.init(adapter, ..., books)` once the
 *   library reaches the `ready` state. The init performs a silent
 *   retrospective evaluation and never raises a toast.
 * - Subscribes to subsequent book changes and triggers a non-silent
 *   evaluation. A single batch produces one notification payload
 *   (see the achievement store).
 * - Tears down on unmount: a token change or mode switch remounts
 *   the orchestrator and the store resets inside `init`.
 *
 * The component itself renders nothing — it only wires side
 * effects, so callers can drop it anywhere below the storage
 * adapter boundary.
 */
export function AchievementLifecycle({ adapter }: AchievementLifecycleProps) {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (status !== "ready") {
      initialisedRef.current = false;
      return;
    }
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        await useAchievements
          .getState()
          .init(adapter, undefined, books);
        if (cancelled) return;
      } catch (err) {
        // Init failure is already reflected in the store. Log for
        // the dev console only — books remain usable.
        console.error("[AchievementLifecycle] init failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, adapter, books]);

  useEffect(() => {
    if (status !== "ready") return;
    const unsubscribe = useBookLibrary.subscribe((state, prev) => {
      if (state.books === prev.books) return;
      void useAchievements
        .getState()
        .evaluate(undefined, state.books);
    });
    return unsubscribe;
  }, [status]);

  return null;
}
