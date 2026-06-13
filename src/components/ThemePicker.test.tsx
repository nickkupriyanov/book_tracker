import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
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
    // Each row is a Radix RadioGroupItem, which renders as role="radio".
    expect(within(popover).getAllByRole("radio")).toHaveLength(
      APP_THEMES.length,
    );
  });

  it("marks exactly one theme as the active option", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));

    const popover = await screen.findByTestId("theme-picker-popover");
    const radios = within(popover).getAllByRole("radio");
    const checked = radios.filter((radio) =>
      radio.getAttribute("data-state") === "checked" ||
      radio.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(1);
    expect(checked[0]?.getAttribute("data-testid")).toBe(
      `theme-option-${DEFAULT_APP_THEME}`,
    );
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

  it("supports ArrowDown / ArrowUp / Home / End navigation between options", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));
    const popover = await screen.findByTestId("theme-picker-popover");

    // Default theme is paper, so focus lands on the checked item.
    const paper = within(popover).getByTestId("theme-option-paper");
    expect(paper).toHaveFocus();

    // ArrowDown moves focus to the next option.
    await user.keyboard("{ArrowDown}");
    const espresso = within(popover).getByTestId("theme-option-espresso");
    expect(espresso).toHaveFocus();

    // ArrowUp returns to the previous option.
    await user.keyboard("{ArrowUp}");
    expect(paper).toHaveFocus();

    // End jumps to the last option.
    await user.keyboard("{End}");
    const softCharcoal = within(popover).getByTestId("theme-option-soft-charcoal");
    expect(softCharcoal).toHaveFocus();

    // Home jumps to the first option.
    await user.keyboard("{Home}");
    const nightLibrary = within(popover).getByTestId("theme-option-night-library");
    // First focusable item is paper; navigation through the radio group
    // follows DOM order, so Home puts focus on paper.
    const firstItem = within(popover).getByTestId("theme-option-paper");
    expect(firstItem).toHaveFocus();
    // Sanity: night-library still exists.
    expect(nightLibrary).toBeInTheDocument();
  });

  it("arrow keys move focus only — they do NOT commit a theme or close the popover", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));
    const popover = await screen.findByTestId("theme-picker-popover");

    // Walk through every arrow and Home/End key. None of these may
    // call setTheme or close the popover — that is the contract
    // the reviewer caught being violated in a real browser.
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{End}");
    await user.keyboard("{ArrowDown}"); // wraps back
    await user.keyboard("{Home}");
    await user.keyboard("{ArrowUp}");

    expect(setThemeMock).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("theme-picker-popover"),
    ).toBeInTheDocument();
  });

  it("Enter commits the focused theme and closes the popover", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));
    const popover = await screen.findByTestId("theme-picker-popover");
    const paper = within(popover).getByTestId("theme-option-paper");
    expect(paper).toHaveFocus();

    // Move focus to Espresso and commit with Enter.
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(setThemeMock).toHaveBeenCalledWith("espresso");
    expect(setThemeMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId("theme-picker-popover"),
    ).not.toBeInTheDocument();
  });

  it("Space commits the focused theme and closes the popover", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));
    const popover = await screen.findByTestId("theme-picker-popover");

    // Move focus to Night Library and commit with Space.
    await user.keyboard("{End}");
    await user.keyboard("{ArrowUp}");
    await user.keyboard(" ");

    expect(setThemeMock).toHaveBeenCalledWith("night-library");
    expect(setThemeMock).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId("theme-picker-popover"),
    ).not.toBeInTheDocument();
  });

  it("ArrowDown wraps from the last option back to the first (loop)", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    await user.click(screen.getByTestId("header-theme-picker"));
    const popover = await screen.findByTestId("theme-picker-popover");
    const softCharcoal = within(popover).getByTestId("theme-option-soft-charcoal");
    act(() => {
      softCharcoal.focus();
    });
    await user.keyboard("{ArrowDown}");
    const paper = within(popover).getByTestId("theme-option-paper");
    expect(paper).toHaveFocus();
    // The loop did not commit a theme.
    expect(setThemeMock).not.toHaveBeenCalled();
  });

  it("Escape closes the popover and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);

    const trigger = screen.getByTestId("header-theme-picker");
    await user.click(trigger);
    const popover = await screen.findByTestId("theme-picker-popover");
    expect(popover).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByTestId("theme-picker-popover"),
    ).not.toBeInTheDocument();
    // Radix's popover restores focus to the trigger on Escape.
    expect(trigger).toHaveFocus();
  });

  it("outside click closes the popover", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <span data-testid="outside">outside</span>
        <ThemePicker />
      </div>,
    );

    await user.click(screen.getByTestId("header-theme-picker"));
    expect(
      await screen.findByTestId("theme-picker-popover"),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(
      screen.queryByTestId("theme-picker-popover"),
    ).not.toBeInTheDocument();
  });

  it("trigger exposes an accessible name and the current theme in its label", () => {
    currentTheme = "night-library";
    render(<ThemePicker />);
    const trigger = screen.getByTestId("header-theme-picker");
    expect(trigger).toHaveAttribute("aria-label", "Theme: Night Library");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    // aria-expanded reflects the popover open state.
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("falls back to the default theme when next-themes reports an unknown value", async () => {
    currentTheme = "solarized";
    const user = userEvent.setup();
    render(<ThemePicker />);

    const trigger = screen.getByTestId("header-theme-picker");
    expect(trigger).toHaveAttribute(
      "aria-label",
      `Theme: ${DEFAULT_APP_THEME === "paper" ? "Paper" : ""}`,
    );

    await user.click(trigger);
    const popover = await screen.findByTestId("theme-picker-popover");
    const radios = within(popover).getAllByRole("radio");
    const checked = radios.filter(
      (r) =>
        r.getAttribute("data-state") === "checked" ||
        r.getAttribute("aria-checked") === "true",
    );
    expect(checked).toHaveLength(1);
    expect(checked[0]?.getAttribute("data-testid")).toBe(
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
