"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Palette } from "lucide-react";

import {
  APP_THEMES,
  getAppThemeDefinition,
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
 * Hydration: the trigger label and icon are stable across server and
 * client renders. The active checkmark only appears after `mounted` is
 * true, so the server output and the first client render match
 * regardless of the persisted theme. The aria-label and `aria-pressed`
 * derive from the resolved theme, which is always the default `paper`
 * until mount completes.
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
      >
        <ul role="listbox" aria-label="Themes" className="flex flex-col">
          {APP_THEMES.map((definition) => {
            const isActive = mounted && resolved === definition.id;
            return (
              <li key={definition.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-testid={`theme-option-${definition.id}`}
                  data-active={isActive ? "true" : "false"}
                  onClick={() => {
                    setTheme(definition.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                    isActive && "bg-accent text-accent-foreground",
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
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
