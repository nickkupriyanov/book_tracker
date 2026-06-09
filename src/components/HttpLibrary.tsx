"use client";

import { useEffect, type ReactNode } from "react";

import { __resetBookLibrary, useBookLibrary } from "@/state/book-library";
import { createStorageAdapter } from "@/storage/storage-mode";
import { HttpStorageError } from "@/storage/http-storage-adapter";

interface HttpLibraryProps {
  apiBaseUrl: string;
  token: string;
  /**
   * Called when the library fails to initialise with a 401, or when
   * any later request returns 401. The gate uses this to clear the
   * in-memory token and return to the login screen (spec 023 §9:
   * "Expired or invalid token returns the app to an unauthenticated
   * HTTP-mode state.").
   */
  onUnauthenticated: () => void;
  children: ReactNode;
}

/**
 * Initialises `useBookLibrary` with an `HttpStorageAdapter` after the
 * user logs in, and tears it down when the token changes.
 *
 * The init lives in `useEffect`, not in render: React may discard or
 * replay a render before commit, and side effects that touch global
 * state should only run after a successful commit. The effect also
 * retries cleanly: a new token drops the previous adapter and
 * initialises a fresh one.
 */
export function HttpLibrary({
  apiBaseUrl,
  token,
  onUnauthenticated,
  children,
}: HttpLibraryProps) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Drop the previous adapter so a new token forces a fresh init.
      __resetBookLibrary();
      try {
        await useBookLibrary.getState().init(
          createStorageAdapter({
            mode: "http",
            apiBaseUrl,
            getToken: () => token,
          }),
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof HttpStorageError && err.status === 401) {
          onUnauthenticated();
          return;
        }
        console.error("[HttpLibrary] Failed to init library", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, apiBaseUrl, onUnauthenticated]);

  // Watch the store for runtime 401s. A 401 from any later request
  // also returns the user to login — the in-memory token is the only
  // copy we keep, so we cannot refresh it.
  const lastError = useBookLibrary((s) => s.lastError);
  useEffect(() => {
    if (lastError instanceof HttpStorageError && lastError.status === 401) {
      onUnauthenticated();
    }
  }, [lastError, onUnauthenticated]);

  return <>{children}</>;
}
