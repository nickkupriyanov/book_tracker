"use client";

import { useEffect, type ReactNode } from "react";

import { AuthGate } from "@/features/auth/AuthGate";
import { HttpLibrary } from "@/components/HttpLibrary";
import {
  type StorageMode,
  createStorageAdapter,
  requireHttpApiBaseUrl,
  resolveStorageMode,
} from "@/storage/storage-mode";
import { useBookLibrary } from "@/state/book-library";

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
 */
export function RootClient({ children }: RootClientProps) {
  const mode: StorageMode = resolveStorageMode();
  const apiBaseUrl = mode === "http" ? requireHttpApiBaseUrl(mode) : null;

  useEffect(() => {
    if (mode !== "local") {
      return;
    }
    useBookLibrary
      .getState()
      .init(createStorageAdapter({ mode: "local", apiBaseUrl: null }))
      .catch((err: unknown) => {
        console.error("[RootClient] Failed to init library", err);
      });
  }, [mode]);

  if (mode === "local") {
    return <>{children}</>;
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
