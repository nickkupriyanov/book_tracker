# Tasks: Cozy Themes

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## [x] T1. Define the typed theme catalog

- **Files:** `src/lib/themes.ts`, focused unit tests
- **Acceptance:** The catalog exposes exactly the four approved IDs, labels,
  light/dark classification, two swatches per theme, `paper` as the default,
  and a typed fallback for unknown values with no `any`.
- **Notes:** Keep palette metadata static and UI-only; do not add theme data to
  book types or `StorageAdapter`.

## [x] T2. Add provider and semantic token palettes

- **Files:** `src/components/ThemeProvider.tsx`, `src/app/layout.tsx`,
  `src/app/globals.css`, focused provider tests
- **Acceptance:** The root supports all four named `data-theme` values,
  defaults to `paper`, disables system selection, restores a saved dark theme
  before paint, and activates existing `dark:` variants for all three dark
  themes without hydration warnings.
- **Notes:** Preserve current token values exactly for `Paper`. Define complete
  semantic token overrides and native `color-scheme` per theme.

## [x] T3. Add the shadcn popover primitive

- **Files:** `src/components/ui/popover.tsx`
- **Acceptance:** The project exposes typed shadcn-style popover wrappers with
  semantic background, foreground, border, shadow, focus, portal, Escape,
  outside-click, and focus-return behavior.
- **Notes:** Use the installed Radix primitives; add no dependency unless the
  existing package exports cannot provide the required primitive.

## [x] T4. Build the palette picker

- **Files:** `src/components/ThemePicker.tsx`, focused component tests
- **Acceptance:** Tests confirm the icon trigger opens a four-row list, each row
  shows its label and swatches, exactly one theme is active, selecting a row
  calls `setTheme`, closes the popover, and unknown provider state falls back
  safely to `Paper`.
- **Notes:** Keep current-theme-dependent markup hydration-safe. Decorative
  swatches and icons must not create redundant screen-reader output.

## [x] T5. Integrate the picker into the responsive header

- **Files:** `src/components/AppHeader.tsx`, relevant header tests
- **Acceptance:** The palette trigger sits adjacent to `Add book`, remains
  available with mobile navigation open or closed, and does not cause horizontal
  overflow or reduce the primary action below a usable size at narrow widths.
- **Notes:** Preserve current navigation, route-active state, dialog behavior,
  and loading-disabled `Add book` contract.

## [x] T6. Map named themes to toast appearance

- **Files:** `src/components/ui/sonner.tsx`, focused tests
- **Acceptance:** Sonner receives `light` for `Paper`, `dark` for all three dark
  themes, and a safe fallback during mount or unknown theme state.
- **Notes:** Do not cast arbitrary app theme names to Sonner's theme type.

## [x] T7. Audit special colors and contrast

- **Files:** affected UI/CSS files and focused tests where behavior changes
- **Acceptance:** Calendar cells and legend, user cover colors, overlays,
  destructive controls, editor content, muted copy, borders, focus rings, and
  primary actions remain legible in all themes; user-authored colors are not
  rewritten.
- **Notes:** Prefer semantic tokens. Keep direct black/white only where it is
  intentionally contrast against arbitrary user colors or modal backdrops.

## [x] T8. Complete accessibility and visual QA

- **Files:** theme components and tests; spec documents only when recording
  accepted completion
- **Acceptance:** Keyboard open/navigation/selection/Escape, outside dismissal,
  focus return, accessible labels, mobile header, every route, dialogs, forms,
  toast, rich text, statistics, achievements, and calendar are manually checked
  across all four themes in local and HTTP modes.
- **Notes:** Confirm theme changes do not lose open dialog input and no page
  shows a light flash, hydration warning, glassmorphism, or unintended motion.

## [x] T9. Run final verification and acceptance pass

- **Files:** `specs/025-cozy-themes/spec.md`,
  `specs/025-cozy-themes/plan.md`, `specs/025-cozy-themes/tasks.md`, affected
  implementation and tests
- **Acceptance:** Every spec criterion is reviewed and `npm run lint`,
  `npm run test`, and `npm run build` pass.
- **Notes:** Mark task and spec checkboxes only after acceptance is met. Stop for
  user review and ask `commit?`; do not commit without explicit approval.
