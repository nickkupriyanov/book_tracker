"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { AuthGate } from "@/features/auth/AuthGate";
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
 *   render prop with the in-memory access token. `RootClient` uses
 *   the token to build an `HttpStorageAdapter` and only then calls
 *   `init`. The token is never persisted.
 *
 * The init is guarded with a ref so re-handoffs of the same token
 * do not reinitialise the store. The store's own `init` is also
 * idempotent (first successful call wins).
 */
export function RootClient({ children }: RootClientProps) {
  const mode: StorageMode = resolveStorageMode();
  const apiBaseUrl = mode === "http" ? requireHttpApiBaseUrl(mode) : null;
  const initialisedTokenRef = useRef<string | null>(null);

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
      {(token) => {
        // The token is the in-memory signal. We re-init only on the
        // first non-null token for a given token value, so a
        // re-render of `AuthGate` that re-hands the same token does
        // not reinitialise the store.
        if (initialisedTokenRef.current !== token) {
          initialisedTokenRef.current = token;
          // Schedule init after the render commits so we don't
          // trigger a setState during render.
          queueMicrotask(() => {
            useBookLibrary
              .getState()
              .init(
                createStorageAdapter({
                  mode: "http",
                  apiBaseUrl,
                  getToken: () => token,
                }),
              )
              .catch((err: unknown) => {
                console.error(
                  "[RootClient] Failed to init library over HTTP",
                  err,
                );
              });
          });
        }
        return <>{children}</>;
      }}
    </AuthGate>
  );
}
