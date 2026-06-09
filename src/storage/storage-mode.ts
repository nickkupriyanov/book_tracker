/**
 * Storage mode resolver and adapter factory.
 *
 * The app supports two storage backends behind the same
 * {@link import("./storage-adapter").StorageAdapter} interface:
 *
 * - `local` — `LocalStorageAdapter`, the default. No backend required.
 * - `http` — `HttpStorageAdapter`, available only after a successful
 *   login. The HTTP adapter itself lands in T7; this module only knows
 *   how to *resolve* the mode and validate the environment.
 *
 * The switch is a build-time / deployment concern, not a runtime user
 * setting. The mode is read from `NEXT_PUBLIC_STORAGE_MODE` and the
 * base URL from `NEXT_PUBLIC_API_BASE_URL`.
 */

import { LocalStorageAdapter } from "./local-storage-adapter";
import type { StorageAdapter } from "./storage-adapter";

export const STORAGE_MODES = ["local", "http"] as const;
export type StorageMode = (typeof STORAGE_MODES)[number];

export class StorageModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageModeError";
  }
}

function readStorageModeEnv(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_STORAGE_MODE;
  if (raw === undefined) {
    return undefined;
  }
  return raw;
}

function readApiBaseUrlEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Resolve the active storage mode.
 *
 * - Missing or empty `NEXT_PUBLIC_STORAGE_MODE` returns `"local"`.
 * - Any other unknown value throws {@link StorageModeError}.
 */
export function resolveStorageMode(
  env: { storageMode?: string | undefined } = {},
): StorageMode {
  const raw = env.storageMode ?? readStorageModeEnv();
  if (raw === undefined || raw === "") {
    return "local";
  }
  if ((STORAGE_MODES as readonly string[]).includes(raw)) {
    return raw as StorageMode;
  }
  throw new StorageModeError(
    `Unknown NEXT_PUBLIC_STORAGE_MODE: ${JSON.stringify(raw)}. ` +
      `Expected one of: ${STORAGE_MODES.join(", ")}.`,
  );
}

/**
 * Return the API base URL when HTTP mode is selected. Local mode does
 * not need a base URL.
 */
export function requireHttpApiBaseUrl(
  mode: StorageMode,
  env: { apiBaseUrl?: string | null } = {},
): string | null {
  if (mode === "local") {
    return null;
  }
  const url = env.apiBaseUrl ?? readApiBaseUrlEnv();
  if (!url) {
    throw new StorageModeError(
      "NEXT_PUBLIC_API_BASE_URL is required when " +
        "NEXT_PUBLIC_STORAGE_MODE=http.",
    );
  }
  return url;
}

export interface CreateStorageAdapterOptions {
  mode: StorageMode;
  apiBaseUrl: string | null;
  /**
   * Returns the current access token, or `null` when the user is not
   * authenticated. Required when `mode === "http"`.
   */
  getToken?: () => string | null;
}

/**
 * Build a {@link StorageAdapter} for the requested mode.
 *
 * In local mode this returns a {@link LocalStorageAdapter}. In HTTP
 * mode it throws — the HTTP adapter depends on an authenticated
 * token, which is only available after the user logs in. Wire the
 * HTTP adapter from T7's `createHttpStorageAdapter` here once the
 * token is in hand.
 */
export function createStorageAdapter(
  options: CreateStorageAdapterOptions,
): StorageAdapter {
  if (options.mode === "local") {
    return new LocalStorageAdapter();
  }
  // Lazy import avoids pulling fetch/network code into the local-mode
  // bundle path; in tests we can pre-inject `getToken` if needed.
  throw new StorageModeError(
    "HttpStorageAdapter is wired by T7. Pass the authenticated token " +
      "via `getToken` and import the HTTP factory directly.",
  );
}
