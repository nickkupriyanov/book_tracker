"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Palette } from "lucide-react";

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
 * Keyboard navigation uses an explicit menuitemradio pattern:
 * ArrowUp / ArrowDown / Home / End only move DOM focus, while
 * Enter / Space / click commit the focused theme and close the
 * popover. Radix RadioGroup was deliberately avoided here because
 * its arrow-key selection semantics fire value changes while moving
 * focus, which made ArrowDown apply a theme and close the picker.
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
  const optionRefs = useRef(new Map<AppTheme, HTMLButtonElement>());

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolved: AppTheme = resolveAppTheme(theme);
  const activeDefinition = getAppThemeDefinition(resolved);

  const triggerLabel = mounted
    ? `Theme: ${activeDefinition.label}`
    : "Change theme";

  useEffect(() => {
    if (!open || !mounted) return;
    optionRefs.current.get(resolved)?.focus();
  }, [mounted, open, resolved]);

  function commit(next: string): void {
    if (!isAppTheme(next)) return;
    setTheme(next);
    setOpen(false);
  }

  function focusTheme(id: AppTheme): void {
    optionRefs.current.get(id)?.focus();
  }

  function focusByOffset(current: AppTheme, offset: number): void {
    const currentIndex = APP_THEMES.findIndex((item) => item.id === current);
    const nextIndex =
      (currentIndex + offset + APP_THEMES.length) % APP_THEMES.length;
    focusTheme(APP_THEMES[nextIndex]?.id ?? activeDefinition.id);
  }

  function setOptionRef(id: AppTheme, element: HTMLButtonElement | null): void {
    if (element === null) {
      optionRefs.current.delete(id);
      return;
    }
    optionRefs.current.set(id, element);
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
          const target = event.target as HTMLElement | null;
          const themeId = target?.getAttribute("data-theme-id");
          if (!isAppTheme(themeId)) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusByOffset(themeId, 1);
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            focusByOffset(themeId, -1);
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            focusTheme(APP_THEMES[0]?.id ?? activeDefinition.id);
            return;
          }
          if (event.key === "End") {
            event.preventDefault();
            focusTheme(
              APP_THEMES[APP_THEMES.length - 1]?.id ?? activeDefinition.id,
            );
            return;
          }
          if (
            event.key === "Enter" ||
            event.key === " " ||
            event.key === "Spacebar"
          ) {
            event.preventDefault();
            commit(themeId);
          }
        }}
      >
        <div
          role="menu"
          aria-label="Themes"
          className="flex flex-col"
        >
          {APP_THEMES.map((definition) => {
            const isActive = mounted && resolved === definition.id;
            return (
              <button
                key={definition.id}
                ref={(element) => setOptionRef(definition.id, element)}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                data-theme-id={definition.id}
                data-testid={`theme-option-${definition.id}`}
                data-active={isActive ? "true" : "false"}
                data-state={isActive ? "checked" : "unchecked"}
                tabIndex={isActive ? 0 : -1}
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
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 items-center justify-center text-primary",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                >
                  <Check className="size-4" />
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
