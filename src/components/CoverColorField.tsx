"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractDominantCoverColor } from "@/lib/cover-color";

export interface CoverColorFieldProps {
  /** Current value, e.g. `#b85b45` or empty string. */
  value: string;
  onChange: (next: string) => void;
  /**
   * Cover URL — when set, the "Use cover color" button attempts
   * best-effort extraction. The button is disabled when this is
   * empty.
   */
  coverUrl: string;
  /** Inline error to render under the input. */
  error?: string;
  /** Disables both the input and the auto-fill button. */
  disabled?: boolean;
}

/**
 * Cover color input for the shared <BookForm>. Three affordances:
 *   1. A small swatch that previews the current value.
 *   2. A hex text input (`#RGB` / `#RRGGBB`).
 *   3. A "Use cover color" button that runs
 *      {@link extractDominantCoverColor} against `coverUrl` when
 *      clicked. The click is the explicit user action that
 *      permits overwriting a manual color (spec 013 D6, §6.5).
 *
 * Failure mode for auto-extraction is deliberately quiet: a
 * non-blocking error string surfaces next to the button so the
 * user knows it didn't work, but the form stays usable and the
 * manual entry path remains available (spec 013 §6.6).
 */
export function CoverColorField({
  value,
  onChange,
  coverUrl,
  error,
  disabled,
}: CoverColorFieldProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const swatchStyle =
    value.trim().length > 0
      ? { backgroundColor: value }
      : { backgroundColor: "transparent" };

  async function handleUseCoverColor(): Promise<void> {
    if (coverUrl.trim().length === 0) return;
    setIsExtracting(true);
    setExtractError(null);
    try {
      const color = await extractDominantCoverColor(coverUrl);
      if (color === null) {
        setExtractError("Couldn't read a color from that cover.");
        return;
      }
      onChange(color);
    } catch {
      setExtractError("Couldn't read a color from that cover.");
    } finally {
      setIsExtracting(false);
    }
  }

  const canExtract =
    coverUrl.trim().length > 0 && !isExtracting && !disabled;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="book-form-cover-color">Cover color (optional)</Label>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          data-testid="cover-color-swatch"
          className="border-border inline-block h-6 w-6 rounded-md border"
          style={swatchStyle}
        />
        <Input
          id="book-form-cover-color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#B85B45"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? "book-form-cover-color-error" : undefined
          }
          data-testid="book-form-cover-color"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCoverColor}
          disabled={!canExtract}
          data-testid="book-form-use-cover-color"
        >
          {isExtracting ? "Reading…" : "Use cover color"}
        </Button>
      </div>
      {error && (
        <p
          id="book-form-cover-color-error"
          className="text-destructive text-sm"
          data-testid="book-form-cover-color-error"
        >
          {error}
        </p>
      )}
      {extractError !== null && (
        <p
          className="text-muted-foreground text-sm"
          data-testid="book-form-cover-color-extract-error"
        >
          {extractError}
        </p>
      )}
    </div>
  );
}
