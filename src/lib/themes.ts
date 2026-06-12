/**
 * Theme catalog for Cozy Themes (spec 025).
 *
 * Four named moods. The catalog is static UI metadata: the only persisted
 * value is the selected theme id (a string). The provider, picker, and
 * Sonner adapter all read from this single source of truth.
 *
 * - "paper" is the default and is treated as a light color scheme.
 * - The remaining three are dark color schemes. They share a single
 *   `data-theme` selector slot that the Tailwind v4 `dark` variant matches,
 *   so existing `dark:` rules in shadcn components behave consistently.
 *
 * Domain types and `StorageAdapter` are intentionally unaware of this file.
 */

export const APP_THEME_IDS = [
  "paper",
  "espresso",
  "night-library",
  "soft-charcoal",
] as const;

export type AppTheme = (typeof APP_THEME_IDS)[number];

export type AppThemeColorScheme = "light" | "dark";

export interface AppThemeDefinition {
  readonly id: AppTheme;
  readonly label: string;
  readonly colorScheme: AppThemeColorScheme;
  /** Two decorative swatches shown in the popover. Decorative only. */
  readonly swatches: readonly [string, string];
}

export const DEFAULT_APP_THEME: AppTheme = "paper";

export const APP_THEMES: readonly AppThemeDefinition[] = [
  {
    id: "paper",
    label: "Paper",
    colorScheme: "light",
    swatches: ["#faf5ec", "#9a4f2b"],
  },
  {
    id: "espresso",
    label: "Warm Espresso",
    colorScheme: "dark",
    swatches: ["#1a120b", "#c97a4a"],
  },
  {
    id: "night-library",
    label: "Night Library",
    colorScheme: "dark",
    swatches: ["#0e1d18", "#c97a4a"],
  },
  {
    id: "soft-charcoal",
    label: "Soft Charcoal",
    colorScheme: "dark",
    swatches: ["#1d1b1a", "#c97a4a"],
  },
] as const;

const APP_THEME_ID_SET: ReadonlySet<string> = new Set(APP_THEME_IDS);

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && APP_THEME_ID_SET.has(value);
}

/**
 * Resolve a possibly-unknown string (e.g. from `next-themes` or storage)
 * to a known `AppTheme`. Falls back to the default for any value that is
 * not one of the four approved ids.
 */
export function resolveAppTheme(value: unknown): AppTheme {
  return isAppTheme(value) ? value : DEFAULT_APP_THEME;
}

export function getAppThemeDefinition(id: AppTheme): AppThemeDefinition {
  const match = APP_THEMES.find((theme) => theme.id === id);
  if (match === undefined) {
    throw new Error(`Unknown app theme id: ${id}`);
  }
  return match;
}
