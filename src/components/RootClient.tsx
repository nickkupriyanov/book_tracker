"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import { AuthGate } from "@/features/auth/AuthGate";
import { HttpLibrary } from "@/components/HttpLibrary";
import {
  type StorageMode,
  createStorageAdapter,
  requireHttpApiBaseUrl,
  resolveStorageMode,
} from "@/storage/storage-mode";
import { useBookLibrary } from "@/state/book-library";
import { AchievementLifecycle } from "@/features/achievements/AchievementLifecycle";

interface RootClientProps {
  children: ReactNode;
}

/**
 * Root-level client wrapper that selects the right storage mode and
 * initialises the book library.
 *
 * - Local mode: creates a `LocalStorageAdapter` and calls
 *   `useBookLibrary.init(adapter)` on mount.
 * - HTTP mode: hands the children to `AuthGate`. The gate renders
 *   the login surface until the user authenticates, then calls the
 *   render prop with the in-memory access token. `HttpLibrary`
 *   receives the token and initialises the store from a `useEffect`
 *   so the side effect runs only after commit. The token is never
 *   persisted.
 *
 * The local `AchievementLifecycle` is mounted alongside the book
 * library init in local mode. HTTP mode mounts its lifecycle
 * inside `HttpLibrary` so it follows the token.
 */
export function RootClient({ children }: RootClientProps) {
  const mode: StorageMode = resolveStorageMode();
  const apiBaseUrl = mode === "http" ? requireHttpApiBaseUrl(mode) : null;

  const localAdapter = useMemo(
    () =>
      mode === "local"
        ? createStorageAdapter({ mode: "local", apiBaseUrl: null })
        : null,
    [mode]
  );

  useEffect(() => {
    if (localAdapter === null) {
      return;
    }
    useBookLibrary
      .getState()
      .init(localAdapter)
      .catch((err: unknown) => {
        console.error("[RootClient] Failed to init library", err);
      });
  }, [localAdapter]);

  if (mode === "local") {
    return (
      <>
        {localAdapter !== null ? (
          <AchievementLifecycle adapter={localAdapter} />
        ) : null}
        {children}
      </>
    );
  }

  return (
    <AuthGate mode={mode} apiBaseUrl={apiBaseUrl}>
      {(token, { onUnauthenticated }) => {
        if (!token) {
          return <>{children}</>;
        }
        return (
          <HttpLibrary
            apiBaseUrl={apiBaseUrl as string}
            token={token}
            onUnauthenticated={onUnauthenticated}
          >
            {children}
          </HttpLibrary>
        );
      }}
    </AuthGate>
  );
}
