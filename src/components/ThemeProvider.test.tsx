import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "./ThemeProvider";
import { APP_THEME_IDS, DEFAULT_APP_THEME } from "@/lib/themes";

function captureChild(child: React.ReactNode): string {
  return renderToStaticMarkup(
    <ThemeProvider>{child}</ThemeProvider>,
  );
}

describe("ThemeProvider", () => {
  it("renders its children", () => {
    expect(captureChild(<span>hello</span>)).toContain("hello");
  });

  it("exports only the four approved theme ids and 'paper' as default", () => {
    expect(APP_THEME_IDS).toEqual([
      "paper",
      "espresso",
      "night-library",
      "soft-charcoal",
    ]);
    expect(DEFAULT_APP_THEME).toBe("paper");
  });

  it("does not include 'system' in the allowed theme list", () => {
    // Spec 025 §3 and §11 explicitly exclude a System option. If
    // 'system' ever sneaks into APP_THEME_IDS the next-themes
    // provider would accept and persist it, breaking the contract.
    expect(APP_THEME_IDS).not.toContain("system");
  });

  it("rejects extra ad-hoc ids by type-guard (re-asserted here for visibility)", () => {
    // This is a compile-time guarantee from the AppTheme union, but
    // we re-state it for readers scanning the test file.
    const allIds: readonly string[] = APP_THEME_IDS;
    expect(allIds.length).toBe(4);
  });
});
