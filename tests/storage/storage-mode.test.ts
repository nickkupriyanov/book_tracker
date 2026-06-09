import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  STORAGE_MODES,
  createStorageAdapter,
  requireHttpApiBaseUrl,
  resolveStorageMode,
  StorageModeError,
} from "@/storage/storage-mode";

describe("resolveStorageMode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to local mode when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", undefined);
    expect(resolveStorageMode()).toBe("local");
  });

  it("defaults to local mode when env is empty", () => {
    expect(resolveStorageMode({ storageMode: "" })).toBe("local");
  });

  it("accepts explicit local mode", () => {
    expect(resolveStorageMode({ storageMode: "local" })).toBe("local");
  });

  it("accepts explicit http mode", () => {
    expect(resolveStorageMode({ storageMode: "http" })).toBe("http");
  });

  it("throws on unknown values", () => {
    expect(() => resolveStorageMode({ storageMode: "sqlite" })).toThrow(
      StorageModeError,
    );
  });

  it("exposes the canonical mode list", () => {
    expect(STORAGE_MODES).toEqual(["local", "http"]);
  });
});

describe("requireHttpApiBaseUrl", () => {
  it("returns null in local mode regardless of env", () => {
    expect(requireHttpApiBaseUrl("local", { apiBaseUrl: null })).toBeNull();
  });

  it("returns null in local mode even when a URL is configured", () => {
    expect(
      requireHttpApiBaseUrl("local", {
        apiBaseUrl: "http://127.0.0.1:8000",
      }),
    ).toBeNull();
  });

  it("throws when HTTP mode has no URL", () => {
    expect(() => requireHttpApiBaseUrl("http", { apiBaseUrl: null })).toThrow(
      StorageModeError,
    );
  });

  it("returns the URL when HTTP mode is configured", () => {
    expect(
      requireHttpApiBaseUrl("http", {
        apiBaseUrl: "http://127.0.0.1:8000",
      }),
    ).toBe("http://127.0.0.1:8000");
  });
});

describe("createStorageAdapter", () => {
  it("returns a LocalStorageAdapter in local mode", () => {
    const adapter = createStorageAdapter({ mode: "local", apiBaseUrl: null });
    expect(adapter.constructor.name).toBe("LocalStorageAdapter");
  });

  it("returns an HttpStorageAdapter in HTTP mode with a token provider", () => {
    const adapter = createStorageAdapter({
      mode: "http",
      apiBaseUrl: "http://127.0.0.1:8000",
      getToken: () => "token",
    });
    expect(adapter.constructor.name).toBe("HttpStorageAdapter");
  });

  it("throws when HTTP mode has no apiBaseUrl", () => {
    expect(() =>
      createStorageAdapter({
        mode: "http",
        apiBaseUrl: null,
        getToken: () => "token",
      }),
    ).toThrow(StorageModeError);
  });

  it("throws when HTTP mode has no getToken", () => {
    expect(() =>
      createStorageAdapter({
        mode: "http",
        apiBaseUrl: "http://127.0.0.1:8000",
      }),
    ).toThrow(StorageModeError);
  });
});
