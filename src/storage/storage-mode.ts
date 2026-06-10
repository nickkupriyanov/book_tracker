/**
 * Storage mode resolver and adapter factory.
 *
 * The app supports two storage backends behind the same
 * {@link import("./storage-adapter").StorageAdapter} interface:
 *
 * - `local` — `LocalStorageAdapter`, the default. No backend required.
 * - `http` — `HttpStorageAdapter`, available only after a successful
 *   login.
 *
 * The switch is a build-time / deployment concern, not a runtime user
 * setting. The mode is read from `NEXT_PUBLIC_STORAGE_MODE` and the
 * base URL from `NEXT_PUBLIC_API_BASE_URL`.
 */

import { HttpStorageAdapter } from "./http-storage-adapter";
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
  /**
   * Optional fetch override passed through to the HTTP adapter.
   */
  fetchImpl?: typeof fetch;
}

/**
 * Build a {@link StorageAdapter} for the requested mode.
 *
 * In local mode this returns a {@link LocalStorageAdapter}. In HTTP
 * mode the caller must supply an authenticated `getToken`; the
 * factory will throw otherwise.
 */
export function createStorageAdapter(
  options: CreateStorageAdapterOptions,
): StorageAdapter {
  if (options.mode === "local") {
    return new LocalStorageAdapter();
  }
  if (!options.apiBaseUrl) {
    throw new StorageModeError(
      "HTTP mode requires a non-empty apiBaseUrl.",
    );
  }
  if (typeof options.getToken !== "function") {
    throw new StorageModeError(
      "HTTP mode requires a getToken() function that returns the " +
        "current access token.",
    );
  }
  return new HttpStorageAdapter({
    baseUrl: options.apiBaseUrl,
    getToken: options.getToken,
    fetchImpl: options.fetchImpl,
  });
}
