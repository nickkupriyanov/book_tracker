"use client";

import { useEffect, useRef } from "react";
import { useBookLibrary } from "@/state/book-library";
import { useAchievements } from "@/state/achievements";
import type { StorageAdapter } from "@/storage/storage-adapter";

interface AchievementLifecycleProps {
  adapter: StorageAdapter;
  /**
   * Optional HTTP-only callback fired when the achievement
   * store surfaces an `HttpStorageError(401)`. Mirrors the
   * pattern used for the book library in `HttpLibrary` so an
   * expired token during achievement load/save returns the
   * user to the login screen instead of leaving them in a
   * broken state (spec 023 §9 + spec 024).
   */
  onUnauthenticated?: () => void;
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
 * - Watches the achievement store for new errors. A 401 is
 *   forwarded to the optional `onUnauthenticated` callback so the
 *   app can drop the in-memory token and return to the login
 *   screen.
 * - Tears down on unmount: a token change or mode switch remounts
 *   the orchestrator and the store resets inside `init`.
 *
 * The component itself renders nothing — it only wires side
 * effects, so callers can drop it anywhere below the storage
 * adapter boundary.
 */
export function AchievementLifecycle({
  adapter,
  onUnauthenticated,
}: AchievementLifecycleProps) {
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
        // Init failure is already reflected in the store. Log
        // and let the runtime 401 subscriber bounce the user if
        // needed.
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

  // Runtime 401 watcher — mirrors the book library's pattern
  // in `HttpLibrary`. A single subscriber avoids re-rendering
  // the surrounding tree on every store change.
  useEffect(() => {
    if (onUnauthenticated === undefined) return;
    const unsubscribe = useAchievements.subscribe((state, prev) => {
      if (state.lastError === prev.lastError) return;
      const err = state.lastError;
      if (
        err !== null &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "HttpStorageError" &&
        "status" in err &&
        (err as { status?: number }).status === 401
      ) {
        onUnauthenticated();
      }
    });
    return unsubscribe;
  }, [onUnauthenticated]);

  return null;
}
