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
});
