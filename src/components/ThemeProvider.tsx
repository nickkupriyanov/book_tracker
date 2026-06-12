"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import {
  APP_THEME_IDS,
  DEFAULT_APP_THEME,
} from "@/lib/themes";

/**
 * Narrow client wrapper around `next-themes` for Cozy Themes (spec 025).
 *
 * Configuration:
 * - `attribute="data-theme"`: writes the active theme id (e.g. "espresso")
 *   to the `<html>` element. The CSS selectors in `globals.css` and the
 *   Tailwind v4 `dark` variant both read this attribute.
 * - `themes` is the closed list of approved ids — this prevents
 *   `next-themes` from accepting and persisting arbitrary values.
 * - `defaultTheme="paper"`: first-visit default matches the spec.
 * - `enableSystem={false}`: the spec explicitly excludes a System option
 *   in v1 (see spec §3 non-goals and §11 out of scope).
 * - `enableColorScheme={true}`: writes the matching `color-scheme: light`
 *   or `color-scheme: dark` to `<html>` so native form controls and
 *   scrollbars follow the theme. The three dark themes are classified
 *   as dark via the `data-theme` selectors, not via the generic
 *   `color-scheme: dark` attribute on `<html>` — that comes from
 *   `enableColorScheme` and the `value` mapping below.
 * - `disableTransitionOnChange`: prevents a flash of animated
 *   `transition-colors` on theme swap, which the spec's UI rules
 *   describe as motion discomfort.
 * - `storageKey="book-tracker-theme"`: isolates the theme preference
 *   from any other `next-themes` consumer in the same browser and
 *   signals ownership.
 */
export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      themes={[...APP_THEME_IDS]}
      defaultTheme={DEFAULT_APP_THEME}
      enableSystem={false}
      enableColorScheme
      disableTransitionOnChange
      storageKey="book-tracker-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
