import { describe, it, expect } from "vitest";
import {
  APP_THEMES,
  APP_THEME_IDS,
  DEFAULT_APP_THEME,
  THEME_STORAGE_KEY,
  buildThemeStorageScrubberScript,
  getAppThemeDefinition,
  isAppTheme,
  resolveAppTheme,
  type AppTheme,
  type AppThemeDefinition,
} from "./themes";

describe("themes catalog", () => {
  it("exposes exactly the four approved theme ids", () => {
    expect(APP_THEME_IDS).toEqual([
      "paper",
      "espresso",
      "night-library",
      "soft-charcoal",
    ]);
    expect(APP_THEMES.map((t) => t.id)).toEqual([...APP_THEME_IDS]);
  });

  it("uses 'paper' as the default theme", () => {
    expect(DEFAULT_APP_THEME).toBe("paper");
  });

  it("treats 'paper' as the only light color scheme", () => {
    const lightThemes = APP_THEMES.filter((t) => t.colorScheme === "light");
    expect(lightThemes.map((t) => t.id)).toEqual(["paper"]);
  });

  it("treats the other three themes as dark color schemes", () => {
    const darkIds = APP_THEMES.filter((t) => t.colorScheme === "dark").map(
      (t) => t.id,
    );
    expect(darkIds).toEqual(["espresso", "night-library", "soft-charcoal"]);
  });

  it("provides a human label and two swatches for every theme", () => {
    for (const theme of APP_THEMES) {
      expect(theme.label.length).toBeGreaterThan(0);
      expect(theme.swatches).toHaveLength(2);
      for (const swatch of theme.swatches) {
        expect(swatch).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("uses the approved display names", () => {
    const labels = Object.fromEntries(
      APP_THEMES.map((t) => [t.id, t.label]),
    ) as Record<AppTheme, string>;
    expect(labels).toEqual({
      paper: "Paper",
      espresso: "Warm Espresso",
      "night-library": "Night Library",
      "soft-charcoal": "Soft Charcoal",
    });
  });

  it("does not allow duplicates or unknown ids in the catalog", () => {
    const ids = APP_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(APP_THEME_IDS).toContain(id);
    }
  });
});

describe("isAppTheme", () => {
  it("accepts every catalog id", () => {
    for (const id of APP_THEME_IDS) {
      expect(isAppTheme(id)).toBe(true);
    }
  });

  it("rejects unknown and non-string values", () => {
    const rejected: unknown[] = [
      "",
      "light",
      "dark",
      "Paper",
      "NIGHT-LIBRARY",
      "espresso ",
      null,
      undefined,
      0,
      1,
      {},
      [],
    ];
    for (const value of rejected) {
      expect(isAppTheme(value)).toBe(false);
    }
  });
});

describe("resolveAppTheme", () => {
  it("returns known ids unchanged", () => {
    expect(resolveAppTheme("paper")).toBe("paper");
    expect(resolveAppTheme("espresso")).toBe("espresso");
    expect(resolveAppTheme("night-library")).toBe("night-library");
    expect(resolveAppTheme("soft-charcoal")).toBe("soft-charcoal");
  });

  it("falls back to 'paper' for unknown or malformed values", () => {
    const cases: unknown[] = [
      "system",
      "light",
      "dark",
      "",
      null,
      undefined,
      42,
      {},
      [],
    ];
    for (const value of cases) {
      expect(resolveAppTheme(value)).toBe("paper");
    }
  });
});

describe("getAppThemeDefinition", () => {
  it("returns the matching definition for a known id", () => {
    const paper = getAppThemeDefinition("paper");
    expect(paper.id).toBe("paper");
    expect(paper.label).toBe("Paper");
    expect(paper.colorScheme).toBe("light");
  });

  it("returns a non-empty swatch pair for every theme", () => {
    const ids: AppTheme[] = [
      "paper",
      "espresso",
      "night-library",
      "soft-charcoal",
    ];
    for (const id of ids) {
      const definition: AppThemeDefinition = getAppThemeDefinition(id);
      expect(definition.swatches[0]).not.toBe(definition.swatches[1]);
    }
  });
});

describe("THEME_STORAGE_KEY", () => {
  it("is a stable, namespaced key", () => {
    expect(THEME_STORAGE_KEY).toBe("book-tracker-theme");
  });
});

describe("buildThemeStorageScrubberScript", () => {
  function makeStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (k: string): string | null => map.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        map.set(k, v);
      },
      removeItem: (k: string): void => {
        map.delete(k);
      },
      _map: map,
    };
  }

  function runScript(script: string, storage: ReturnType<typeof makeStorage>): void {
    // The script uses `localStorage` directly; bind it to the stub.
    // eslint-disable-next-line no-new-func
    new Function("localStorage", script)(storage);
  }

  it("leaves a known persisted value untouched", () => {
    const storage = makeStorage();
    storage.setItem(THEME_STORAGE_KEY, "espresso");
    runScript(buildThemeStorageScrubberScript(), storage);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("espresso");
  });

  it("overwrites an unknown persisted value with the default theme", () => {
    const storage = makeStorage();
    storage.setItem(THEME_STORAGE_KEY, "solarized");
    runScript(buildThemeStorageScrubberScript(), storage);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe(DEFAULT_APP_THEME);
  });

  it("overwrites 'system' and other unapproved values with 'paper'", () => {
    const candidates = ["system", "light", "dark", "", "  espresso", "ESPRESSO"];
    for (const candidate of candidates) {
      const storage = makeStorage();
      storage.setItem(THEME_STORAGE_KEY, candidate);
      runScript(buildThemeStorageScrubberScript(), storage);
      expect(storage.getItem(THEME_STORAGE_KEY)).toBe(DEFAULT_APP_THEME);
    }
  });

  it("does nothing when no value is stored", () => {
    const storage = makeStorage();
    runScript(buildThemeStorageScrubberScript(), storage);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("swallows localStorage exceptions (e.g. disabled storage)", () => {
    const brokenStorage = {
      getItem: (): string | null => {
        throw new Error("blocked");
      },
      setItem: (): void => {
        throw new Error("blocked");
      },
      removeItem: (): void => {},
    };
    expect(() =>
      runScript(buildThemeStorageScrubberScript(), brokenStorage),
    ).not.toThrow();
  });

  it("uses the supplied key when called with an override", () => {
    const storage = makeStorage();
    storage.setItem("custom-key", "solarized");
    runScript(buildThemeStorageScrubberScript("custom-key"), storage);
    expect(storage.getItem("custom-key")).toBe(DEFAULT_APP_THEME);
    // Default key was not touched.
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
