# Spec: Cozy Themes

> **Status:** Draft
> **Author:** Codex
> **Created:** 2026-06-12
> **Spec ID:** 025-cozy-themes
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

Book Tracker has a warm light palette, but it does not adapt to evening reading
or let readers choose an atmosphere that feels personal. A single generic dark
mode would improve comfort, but it would discard three distinct cozy directions
that fit the product: warm brown, deep library green, and soft charcoal.

## 2. Goal

Let readers choose and retain one of four calm, book-inspired interface themes
without changing the application's structure or content.

## 3. Non-goals

- No user-created themes, color pickers, or editable theme tokens.
- No automatic system theme or time-of-day switching in v1.
- No per-page, per-book, or per-storage-mode theme settings.
- No changes to user-selected book cover colors.
- No redesign of page layouts or component structure beyond the theme control.
- No server-side persistence or account synchronization of theme preference.

## 4. Users & scenarios

This feature serves local-mode and HTTP-mode readers equally because theme
selection is a browser preference independent of book storage.

- A first-time reader sees the existing light `Paper` theme.
- A reader opens the palette control in the header and chooses `Warm Espresso`,
  `Night Library`, or `Soft Charcoal`.
- The selected theme applies immediately across pages, dialogs, forms, toasts,
  the review editor, statistics, and the reading calendar.
- The reader reloads or returns later in the same browser and sees the saved
  theme before the application becomes interactive.
- A keyboard or screen-reader user can identify, open, navigate, and operate
  the theme control.

## 5. UX

The four themes are named moods rather than a light/dark binary:

1. `Paper` preserves the current warm cream background, white cards, dark brown
   text, and terracotta primary accent.
2. `Warm Espresso` uses a brown-black background, cocoa surfaces, warm ivory
   text, and a brighter terracotta accent.
3. `Night Library` uses a deep green-black background, dark green surfaces,
   aged-paper text, and a terracotta accent.
4. `Soft Charcoal` uses a neutral warm graphite background, charcoal surfaces,
   ivory text, and a terracotta accent.

The global header contains one compact palette button adjacent to `Add book`.
It opens a shadcn-style popover with four rows. Each row includes two decorative
color swatches, the theme name, and an active-state checkmark. Selecting a row
applies the theme immediately and closes the popover.

The control remains compact on mobile and does not move into the navigation
menu. Its trigger has a stable accessible label and visible focus treatment.
The popover supports normal keyboard navigation, Escape dismissal, outside-click
dismissal, and focus return to the trigger.

Theme changes use restrained color transitions only when they do not introduce
motion discomfort. There is no animation sequence, blur, or glassmorphism.

## 6. Functional requirements

- FR-1. The application defines exactly four supported theme IDs: `paper`,
  `espresso`, `night-library`, and `soft-charcoal`.
- FR-2. `Paper` preserves the current light appearance and is the default when
  no valid saved preference exists.
- FR-3. The user can open a palette popover from the global header and see all
  four themes with their approved names, swatches, and active state.
- FR-4. Selecting a theme applies its semantic color tokens to the complete
  application without a page reload.
- FR-5. The selected theme is persisted in browser storage by the theme
  provider and restored on later visits in the same browser.
- FR-6. Theme restoration happens early enough to prevent an incorrect light
  theme flash for readers who selected a dark theme.
- FR-7. An unknown or malformed saved theme falls back to `Paper`.
- FR-8. `Warm Espresso`, `Night Library`, and `Soft Charcoal` are treated as
  dark color schemes for native controls and components using Tailwind's
  `dark:` variant.
- FR-9. Sonner toasts use light styling for `Paper` and dark styling for all
  three dark themes.
- FR-10. The theme control is keyboard operable and exposes its purpose,
  current selection, and selectable options to assistive technology.
- FR-11. Theme selection behaves identically in local and HTTP storage modes
  and does not depend on `StorageAdapter`.
- FR-12. User-selected cover colors and reading-calendar book colors remain
  unchanged; surrounding text and surfaces retain readable contrast.
- FR-13. The theme control does not cause a hydration mismatch or render
  theme-dependent labels before the client theme is known.

## 7. Data

Add a UI-only theme type and metadata catalog:

```ts
export type AppTheme =
  | "paper"
  | "espresso"
  | "night-library"
  | "soft-charcoal";

export interface AppThemeDefinition {
  id: AppTheme;
  label: string;
  colorScheme: "light" | "dark";
  swatches: readonly [string, string];
}
```

The catalog is static application code. The provider persists only the selected
theme ID under its browser-storage key. No domain entity, backend model,
migration, or book payload changes.

## 8. Storage interface

No changes to `StorageAdapter`. Theme preference is presentation state managed
by `next-themes`; feature components and Zustand book stores remain unaware of
it. The preference is not synchronized between browsers or HTTP-mode users.

## 9. Edge cases & errors

- Browser storage unavailable: theme changes still apply for the current page;
  persistence failure does not affect book features.
- Unknown stored ID: fall back to `Paper` and expose no broken option.
- JavaScript disabled or hydration not complete: server output remains usable
  in `Paper`; the palette trigger does not display stale theme-dependent text.
- Theme changed while a dialog or toast is open: the open surface adopts the
  new tokens without remounting or losing user input.
- Custom dark-mode rules in shadcn components: all three dark theme selectors
  activate the same `dark:` behavior.
- Reading-calendar cells with custom cover colors: preserve those colors and
  verify legibility of labels, empty cells, borders, and legend content.
- Destructive actions: destructive backgrounds and foregrounds remain readable
  in all four themes.
- Mobile header: the palette trigger and `Add book` remain usable without
  horizontal overflow.

## 10. Acceptance criteria

- [ ] The palette popover lists `Paper`, `Warm Espresso`, `Night Library`, and
  `Soft Charcoal` with swatches and one active checkmark.
- [ ] `Paper` matches the existing light palette and is used on first visit.
- [ ] Each dark theme has a visibly distinct cozy palette with readable text,
  surfaces, borders, inputs, focus rings, and destructive states.
- [ ] Selecting a theme updates the whole application immediately and closes
  the popover.
- [ ] Reloading preserves the selected theme without a visible light flash.
- [ ] Invalid saved preferences fall back to `Paper`.
- [ ] The trigger and popover work with keyboard, Escape, focus return, and
  screen-reader semantics.
- [ ] Header layout remains usable without horizontal scrolling on mobile.
- [ ] Dialogs, forms, toasts, rich text, statistics, achievements, and the
  reading calendar are visually verified in every theme.
- [ ] Local and HTTP storage modes require no theme-specific integration.
- [ ] `npm run lint`, `npm run test`, and `npm run build` pass.

## 11. Out of scope (for this spec)

- A fifth `System` option or OS preference listener.
- Theme scheduling, sunrise/sunset behavior, or automatic evening mode.
- Theme synchronization through the backend or export/import.
- Additional typography, density, layout, or accessibility preference panels.
- A public theme API for plugins or third-party theme packs.

## 12. Open questions

None. The four palettes, `Paper` default, palette-popover interaction, and
browser-local persistence are approved for v1.
