# Plan: Cozy Themes

> **Status:** Draft
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-12

---

## 1. Architecture summary

Cozy Themes is a presentation-only feature built on the already installed
`next-themes` package. A root provider applies one of four named theme IDs as a
`data-theme` attribute on `<html>` and persists the user's choice. Tailwind v4
continues to expose the existing semantic utilities through `@theme`; each
theme selector overrides the underlying CSS custom properties. A shared typed
catalog supplies names, light/dark classification, and popover swatches. The
header control consumes that catalog and `useTheme`, while domain state,
`StorageAdapter`, local mode, and HTTP mode remain unchanged.

## 2. Module / file layout

- `src/lib/themes.ts` - typed theme IDs, definitions, validation, default ID,
  and light/dark classification helpers.
- `src/components/ThemeProvider.tsx` - narrow client wrapper around the
  `next-themes` provider with the approved attribute, theme list, and default.
- `src/components/ThemePicker.tsx` - accessible palette trigger and popover.
- `src/components/ui/popover.tsx` - shadcn/Radix popover primitive if the repo
  does not already expose one.
- `src/app/layout.tsx` - root provider wiring and hydration-safe `<html>` setup.
- `src/app/globals.css` - four semantic token sets, dark-variant selector, and
  native `color-scheme` declarations.
- `src/components/AppHeader.tsx` - place the picker beside `Add book` on desktop
  and mobile.
- `src/components/ui/sonner.tsx` - map named app themes to Sonner light/dark
  appearance instead of passing unsupported names through.
- Focused tests cover theme metadata, picker behavior, provider integration,
  persistence-facing configuration, and header responsiveness contracts.

## 3. Data flow

### Initial render

1. The root layout renders stable `Paper`-compatible server markup and wraps
   client content in `ThemeProvider`.
2. The inline behavior supplied by `next-themes` reads its saved key before
   hydration and writes the valid `data-theme` value to `<html>`.
3. CSS selectors override the shared semantic tokens before the page paints.
4. The picker defers current-theme-dependent output until mounted, avoiding a
   server/client mismatch.

### Theme selection

1. The reader opens `ThemePicker` from the global header.
2. The picker renders definitions from the typed catalog and marks the resolved
   active theme.
3. Selecting a row calls `setTheme(theme.id)` and closes the popover.
4. `next-themes` updates `<html data-theme>`, stores the ID, and every semantic
   utility re-renders through CSS without changing React domain state.
5. Sonner maps the resolved app theme to `light` or `dark` for future and open
   toast surfaces.

### Invalid or unavailable persistence

The supported theme list constrains normal provider output. Theme parsing and
picker fallback use `paper` for an absent or unknown value. If browser storage
cannot persist, the selected attribute still controls the current document;
no error enters book-library state.

## 4. Component breakdown

- **ThemeProvider**
  - **Props:** `{ children: ReactNode }`.
  - **State:** delegated to `next-themes`.
  - **Behavior:** configures `attribute="data-theme"`, all four theme IDs,
    `defaultTheme="paper"`, `enableSystem={false}`, and safe transition behavior.
  - **Tests:** root configuration yields the approved default and supported
    list without accessing `StorageAdapter`.

- **ThemePicker**
  - **Props:** none.
  - **State:** popover open state and mounted state; active theme is derived
    from `useTheme` and validated through the catalog helper.
  - **Behavior:** renders one icon trigger and four option rows with swatches,
    labels, active checkmark, immediate selection, and popover dismissal.
  - **Tests:** all options, fallback selection, `setTheme` calls, active state,
    close-on-select, accessible labels, and keyboard behavior provided by the
    popover primitive.

- **Popover primitive**
  - **Props:** standard shadcn wrappers around Radix popover root, trigger,
    content, and anchor where needed.
  - **State:** owned by Radix or controlled by `ThemePicker`.
  - **Behavior:** handles portal placement, dismissal, focus trapping rules,
    Escape, and focus return using existing semantic tokens.
  - **Tests:** rely on Radix behavior; add focused integration assertions only
    for picker open/close and focus-visible application.

## 5. Storage adapter changes

No changes to `StorageAdapter`, Zustand stores, localStorage book keys, HTTP
requests, backend routes, or database models. `next-themes` owns one isolated
browser preference key for the selected theme.

## 6. Decisions & trade-offs

- Chose four named moods over a light/dark toggle because all three dark
  directions fit the product and shared tokens keep maintenance bounded.
- Chose `next-themes` over a custom context because it is already installed,
  Sonner already integrates with it, and it handles pre-hydration restoration.
- Chose `data-theme` over class names because named themes map directly to
  readable CSS selectors without encoding one theme as the generic `dark`.
- Chose one shared dark variant for three themes because existing shadcn
  components contain useful `dark:` rules that should behave consistently.
- Chose `Paper` as the fixed first-visit default to preserve the current visual
  contract and avoid surprising existing users.
- Chose a compact popover over persistent segmented controls because theme
  selection is occasional and should not make the header feel like settings.
- Chose browser-local persistence over `StorageAdapter` because appearance is
  not book-domain data and must work identically before local/HTTP initialization.
- Chose semantic token overrides over component-specific dark classes so new
  components inherit all themes by default.

## 7. Risks

- Tailwind's default `dark:` selector may not recognize three custom theme IDs.
  Define one explicit custom variant matching all approved dark selectors and
  verify existing shadcn `dark:` rules.
- Theme-specific labels can cause hydration mismatches. Render a stable trigger
  until mounted and place `suppressHydrationWarning` only on the root element
  changed by `next-themes`.
- Some direct colors may bypass semantic tokens. Audit the reading calendar,
  cover-color content, destructive variants, overlays, and `text-white` uses;
  change only colors that represent application chrome rather than user data.
- Four palettes increase visual QA surface. Verify representative shared
  components and every special-color surface rather than duplicating bespoke
  theme rules per page.
- A header button can introduce mobile overflow. Keep it icon-sized, preserve
  the full-width `Add book` behavior where required, and test narrow layouts.
- Low-contrast warm palettes can look cozy but fail accessibility. Check normal
  text, muted text, borders, focus rings, and primary/destructive combinations
  against WCAG AA targets before acceptance.

## 8. Rollout

- Behind a flag? No. `Paper` makes the first render backward-compatible.
- Migration needed? No domain or backend migration. Existing users without a
  saved theme remain on `Paper`.
- Dependency changes? None; use installed `next-themes` and existing Radix
  primitives.
- Manual QA:
  - Visit with no saved preference and confirm `Paper` matches the current UI.
  - Select each theme, navigate every route, reload, and confirm persistence
    without a light flash or hydration warning.
  - Verify header, popover, forms, dialogs, destructive confirmation, toast,
    rich-text editor/display, statistics, achievements, and reading calendar.
  - Test keyboard open/navigation/selection/Escape and focus return.
  - Test narrow mobile width with open and closed navigation.
  - Test both `NEXT_PUBLIC_STORAGE_MODE=local` and `http` to confirm theme
    behavior is independent of adapter initialization and authentication.
  - Run `npm run lint`, `npm run test`, and `npm run build`.
