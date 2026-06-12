import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { APP_THEMES, DEFAULT_APP_THEME } from "@/lib/themes";

// next-themes calls into the DOM (window.matchMedia, document.documentElement)
// so we stub it before importing the component.
const setThemeMock = vi.fn();
let currentTheme: string | undefined = "paper";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: setThemeMock,
  }),
}));

import { ThemePicker } from "./ThemePicker";

describe("ThemePicker", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    currentTheme = "paper";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an icon trigger in the header with an accessible label that reflects the active theme after mount", () => {
    render(<ThemePicker />);
    const trigger = screen.getByTestId("header-theme-picker");
    expect(trigger).toBeInTheDocument();
    // After mount the label derives from the resolved theme. next-themes
    // is mocked to "paper", so the label is "Theme: Paper". The pre-mount
    // fallback ("Change theme") is exercised by the manual QA pass and
    // by the fact that the same code path resolves to "Theme: Paper" via
    // resolveAppTheme — see themes.test.ts.
    expect(trigger).toHaveAttribute("aria-label", "Theme: Paper");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("opens a popover with one row per approved theme", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));

    const popover = await screen.findByTestId("theme-picker-popover");
    for (const theme of APP_THEMES) {
      const option = within(popover).getByTestId(
        `theme-option-${theme.id}`,
      );
      expect(option).toBeInTheDocument();
      expect(within(popover).getByText(theme.label)).toBeInTheDocument();
    }
    expect(
      within(popover).getAllByRole("option"),
    ).toHaveLength(APP_THEMES.length);
  });

  it("marks exactly one theme as the active option", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));

    const popover = await screen.findByTestId("theme-picker-popover");
    const activeOptions = within(popover).getAllByRole("option", {
      selected: true,
    });
    expect(activeOptions).toHaveLength(1);
    const activeId = activeOptions[0]?.getAttribute("data-testid");
    expect(activeId).toBe(`theme-option-${DEFAULT_APP_THEME}`);
  });

  it("decorates each row with two swatches", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));

    const popover = await screen.findByTestId("theme-picker-popover");
    for (const theme of APP_THEMES) {
      const option = within(popover).getByTestId(
        `theme-option-${theme.id}`,
      );
      // The first aria-hidden span inside the option is the swatch
      // wrapper; its children are the two color circles.
      const swatchWrapper = option.querySelector(
        'span[aria-hidden]',
      ) as HTMLElement;
      const swatches = swatchWrapper.querySelectorAll("span");
      expect(swatches).toHaveLength(2);
      for (let i = 0; i < theme.swatches.length; i += 1) {
        const swatch = swatches[i] as HTMLElement;
        expect(swatch.style.backgroundColor).toBe(
          `rgb(${hexToRgb(theme.swatches[i] as string)})`,
        );
      }
    }
  });

  it("calls setTheme with the selected id and closes the popover on select", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));
    const popover = await screen.findByTestId("theme-picker-popover");
    await user.click(within(popover).getByTestId("theme-option-espresso"));

    expect(setThemeMock).toHaveBeenCalledWith("espresso");
    expect(
      screen.queryByTestId("theme-picker-popover"),
    ).not.toBeInTheDocument();
  });

  it("falls back to the default theme when next-themes reports an unknown value", async () => {
    currentTheme = "solarized";
    const user = userEvent.setup();
    render(<ThemePicker />);

    const trigger = screen.getByTestId("header-theme-picker");
    expect(trigger).toHaveAttribute("aria-label", `Theme: ${DEFAULT_APP_THEME === "paper" ? "Paper" : ""}`);

    await user.click(trigger);
    const popover = await screen.findByTestId("theme-picker-popover");
    const activeOptions = within(popover).getAllByRole("option", {
      selected: true,
    });
    expect(activeOptions).toHaveLength(1);
    expect(activeOptions[0]?.getAttribute("data-testid")).toBe(
      `theme-option-${DEFAULT_APP_THEME}`,
    );
  });
});

function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
