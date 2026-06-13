"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Palette } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import {
  APP_THEMES,
  getAppThemeDefinition,
  isAppTheme,
  resolveAppTheme,
  type AppTheme,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Header palette control (spec 025 §5). A compact popover trigger adjacent
 * to "Add book" with one row per approved theme. Each row shows two
 * decorative swatches, the theme name, and a checkmark for the active
 * theme. Selecting a row applies the theme and closes the popover.
 *
 * Keyboard navigation: the four options are rendered as a Radix
 * `RadioGroup`, which gives us proper Roving Tabindex and
 * ArrowUp/ArrowDown/Home/End navigation. The group is the
 * semantically correct primitive for "pick one of N" (ARIA listbox
 * is for non-fixed collections; a finite set of mutually-exclusive
 * choices is a radio group).
 *
 * Commit semantics: Radix RadioGroup fires `onValueChange` both on
 * keyboard focus change (ArrowUp/ArrowDown/Home/End) and on
 * pointer click or Enter/Space. If we applied the theme in
 * `onValueChange`, ArrowDown would immediately switch the theme
 * and close the popover — the user could never reach the third or
 * fourth option. The contract is:
 *
 * - ArrowUp / ArrowDown / Home / End → only move focus.
 * - Enter / Space / click → commit (apply theme, close popover).
 *
 * `onValueChange` is therefore a no-op for application; the
 * `onKeyDown` handler on each `RadioGroupItem` listens for Enter
 * and Space, and `onClick` covers pointer selection. The group's
 * `value` is still bound to the active theme so `data-state`
 * (and the visible checkmark) stays in sync after a commit.
 *
 * Hydration: the trigger label and icon are stable across server and
 * client renders. The active checkmark only appears after `mounted`
 * is true, so the server output and the first client render match
 * regardless of the persisted theme. The `aria-label` derives from
 * the resolved theme, which is always the default `paper` until
 * mount completes.
 */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolved: AppTheme = resolveAppTheme(theme);
  const activeDefinition = getAppThemeDefinition(resolved);

  const triggerLabel = mounted
    ? `Theme: ${activeDefinition.label}`
    : "Change theme";

  function commit(next: string): void {
    if (!isAppTheme(next)) return;
    setTheme(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        data-testid="header-theme-picker"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
        >
          <Palette className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-1"
        data-testid="theme-picker-popover"
        onKeyDown={(event) => {
          // Radix RadioGroupItem intercepts Enter on its own
          // keydown handler (it calls preventDefault to avoid
          // accidental form submits) and ignores any consumer
          // onKeyDown prop, so the native click-on-Enter behaviour
          // is suppressed. We catch Enter / Space at the popover
          // content level and commit the focused item by reading
          // data-theme-id from the currently focused element.
          if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") {
            return;
          }
          const target = event.target as HTMLElement | null;
          const themeId = target?.getAttribute("data-theme-id") ?? null;
          if (themeId !== null) {
            event.preventDefault();
            commit(themeId);
          }
        }}
      >
        {/*
          onValueChange is intentionally a no-op. We only bind `value`
          so the indicator's data-state=checked stays in sync. The
          actual commit happens on click (pointer), or on Enter /
          Space caught by the wrapping popover content's onKeyDown
          above. See the JSDoc on this component for the full
          rationale.
        */}
        <RadioGroupPrimitive.Root
          aria-label="Themes"
          value={mounted ? resolved : undefined}
          onValueChange={NOOP}
          className="flex flex-col"
        >
          {APP_THEMES.map((definition) => {
            const isActive = mounted && resolved === definition.id;
            return (
              <RadioGroupPrimitive.Item
                key={definition.id}
                value={definition.id}
                data-theme-id={definition.id}
                data-testid={`theme-option-${definition.id}`}
                data-active={isActive ? "true" : "false"}
                onClick={() => commit(definition.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                  "data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="flex shrink-0 items-center gap-0.5"
                >
                  <span
                    className="block size-4 rounded-full border border-border"
                    style={{ backgroundColor: definition.swatches[0] }}
                  />
                  <span
                    className="block size-4 -ml-1.5 rounded-full border border-border"
                    style={{ backgroundColor: definition.swatches[1] }}
                  />
                </span>
                <span className="flex-1 font-medium">
                  {definition.label}
                </span>
                <RadioGroupPrimitive.Indicator
                  aria-hidden
                  className="flex size-4 items-center justify-center text-primary"
                >
                  <Check className="size-4" />
                </RadioGroupPrimitive.Indicator>
              </RadioGroupPrimitive.Item>
            );
          })}
        </RadioGroupPrimitive.Root>
      </PopoverContent>
    </Popover>
  );
}

const NOOP = (): void => {};
