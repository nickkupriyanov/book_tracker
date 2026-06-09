"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { LoginForm } from "./LoginForm";
import type { StorageMode } from "@/storage/storage-mode";

export interface AuthGateProps {
  /**
   * Storage mode selected at build time. In local mode the gate is a
   * no-op and children render immediately.
   */
  mode: StorageMode;
  /**
   * API base URL required in HTTP mode. When `mode === "http"` and
   * this is null/empty the gate shows a configuration error.
   */
  apiBaseUrl: string | null;
  /**
   * Render the protected tree with the current access token. The
   * gate only ever invokes this callback after a successful login.
   */
  children: (token: string) => ReactNode;
  /**
   * Optional fetch override passed through to `LoginForm`. Intended
   * for tests.
   *
   * @internal
   */
  fetchImpl?: typeof fetch;
}

/**
 * HTTP-mode authentication gate.
 *
 * The gate owns auth UI and the in-memory access token. It does not
 * call the book store directly — `RootClient` is the consumer that
 * turns the token into a `StorageAdapter` and initializes the
 * library (spec 023 §3.2).
 */
export function AuthGate({ mode, apiBaseUrl, children, fetchImpl }: AuthGateProps) {
  const [token, setToken] = useState<string | null>(null);

  // On mount, the in-memory token is empty by design (spec 023 §6
  // FR-21). A page reload returns the user to the login screen.
  useEffect(() => {
    setToken(null);
  }, []);

  const handleLogin = useCallback(async (accessToken: string) => {
    setToken(accessToken);
  }, []);

  if (mode === "local") {
    // Local mode has no auth. We pass a placeholder token because
    // LocalStorageAdapter doesn't need one. RootClient still receives
    // the call so its signature stays uniform.
    return <>{children("local")}</>;
  }

  if (!apiBaseUrl) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-lg border border-border bg-card p-6 text-sm shadow-sm">
        <h1 className="text-lg font-semibold">Server not configured</h1>
        <p className="mt-2 text-muted-foreground">
          HTTP mode is enabled but <code>NEXT_PUBLIC_API_BASE_URL</code>{" "}
          is missing. Set it in your environment and reload.
        </p>
      </div>
    );
  }

  if (token) {
    return <>{children(token)}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <LoginForm
        apiBaseUrl={apiBaseUrl}
        onLogin={handleLogin}
        {...(fetchImpl ? { fetchImpl } : {})}
      />
    </div>
  );
}
