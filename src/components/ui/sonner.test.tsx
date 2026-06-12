import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { APP_THEMES, DEFAULT_APP_THEME } from "@/lib/themes";

const setThemeMock = vi.fn();
let currentTheme: string | undefined = DEFAULT_APP_THEME;

// Capture the `theme` prop we hand to sonner across renders.
const sonnerCalls: Array<{ theme: unknown }> = [];

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: setThemeMock,
  }),
}));

vi.mock("sonner", () => ({
  Toaster: (props: { theme?: unknown }) => {
    sonnerCalls.push({ theme: props.theme });
    return null;
  },
}));

// Import after mocks are wired.
import { Toaster } from "./sonner";

describe("Toaster (sonner) — theme mapping", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    currentTheme = DEFAULT_APP_THEME;
    sonnerCalls.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes 'light' to Sonner when the app theme is 'paper'", () => {
    currentTheme = "paper";
    render(<Toaster />);
    // First render defers to "light" until mount; the post-mount
    // render also resolves to "light" for paper.
    const themes = sonnerCalls.map((c) => c.theme);
    expect(themes.length).toBeGreaterThan(0);
    expect(themes[themes.length - 1]).toBe("light");
  });

  it("passes 'dark' to Sonner for every dark app theme", () => {
    const darkIds = APP_THEMES.filter((t) => t.colorScheme === "dark").map(
      (t) => t.id,
    );
    expect(darkIds).toEqual(["espresso", "night-library", "soft-charcoal"]);
    for (const id of darkIds) {
      sonnerCalls.length = 0;
      currentTheme = id;
      render(<Toaster />);
      const themes = sonnerCalls.map((c) => c.theme);
      expect(themes.length, `sonner should render for ${id}`).toBeGreaterThan(0);
      expect(themes[themes.length - 1], `app theme ${id} → sonner 'dark'`).toBe(
        "dark",
      );
    }
  });

  it("falls back to 'light' for unknown theme values without throwing", () => {
    currentTheme = "solarized";
    expect(() => render(<Toaster />)).not.toThrow();
    const themes = sonnerCalls.map((c) => c.theme);
    expect(themes[themes.length - 1]).toBe("light");
  });
});

import { render } from "@testing-library/react";
