import type { Book } from "@/types/book";

/**
 * Warm brownish hex color used by the Reading Calendar when a book
 * has no `coverColor` and during auto-extraction fallbacks. Chosen
 * to fit the Ink Shelf visual direction (spec 013 D7) — it reads
 * as "warm reading-room wood" rather than as a neutral default.
 */
export const READING_CALENDAR_FALLBACK_COLOR = "#8a6f4d";

// `#RGB` or `#RRGGBB`, case-insensitive. Same pattern the validator
// uses (spec 013 §8.2). Duplicated here so the helpers stay
// self-contained — the validator is a form-boundary concern, and the
// helpers are called from the calendar render path with already-stored
// values.
const COVER_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Normalises an arbitrary value to a canonical hex color string.
 * Returns `undefined` for "no color" inputs (undefined, null, "",
 * whitespace-only) and for invalid hex strings. Trims and
 * lowercases valid values so downstream comparisons and
 * CSS-string interpolation don't have to worry about case.
 *
 * `unknown` in → narrowed out, so this is safe to call from
 * the calendar render path on legacy / corrupted records (spec
 * 013 §10 "Invalid persisted shape").
 */
export function normalizeCoverColor(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (!COVER_COLOR_PATTERN.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

/**
 * Strict form of {@link normalizeCoverColor} for callers that
 * already know they have a string. Used for shape checks.
 */
export function isCoverColor(value: string): boolean {
  return COVER_COLOR_PATTERN.test(value);
}

/**
 * Returns the calendar color for a book: its normalised
 * `coverColor` when set, otherwise {@link READING_CALENDAR_FALLBACK_COLOR}.
 * Defensive against invalid `coverColor` values so a corrupted
 * record never breaks the calendar grid.
 */
export function colorForBook(book: Book): string {
  const normalized = normalizeCoverColor(book.coverColor);
  return normalized ?? READING_CALENDAR_FALLBACK_COLOR;
}

/**
 * Pure dominant-color extraction. Takes raw RGBA pixel data
 * (e.g. from `canvas.getImageData(...).data`) and returns the
 * most common opaque color, quantized to 4 bits per channel so
 * near-identical pixels (JPEG artifacts, antialiasing) cluster
 * into a single bucket. Returns `null` for an empty or
 * fully-transparent image.
 *
 * Extracted from the async wrapper so it can be tested without
 * a real Image / canvas in jsdom.
 */
export function dominantColorFromImageData(
  data: Uint8ClampedArray
): string | null {
  if (data.length < 4) return null;
  // Quantize each channel to 4 bits (16 buckets per channel).
  // Use a Map<number, number> keyed on the quantized triple so
  // similar colors group together.
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 128) continue; // skip transparent / near-transparent
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const key =
      ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestKey: number | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  if (bestKey === null) return null;
  const r = ((bestKey >> 8) & 0x0f) << 4;
  const g = ((bestKey >> 4) & 0x0f) << 4;
  const b = (bestKey & 0x0f) << 4;
  return (
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Best-effort dominant color extraction from a cover image URL.
 * Returns `null` for any failure: image load error (CORS, 404,
 * invalid URL), no canvas support, no 2D context, decoding
 * errors. Never throws.
 *
 * Spec 013 D6: this is a suggested fill, not a source of truth.
 * It must never overwrite a manual `coverColor` (the form layer
 * owns that rule) and must never block saving a book (the form
 * layer awaits this without try/catch wrapping — a rejection
 * here would crash the form).
 */
export async function extractDominantCoverColor(
  url: string
): Promise<string | null> {
  try {
    return await new Promise<string | null>((resolve) => {
      // Some test environments / bundlers don't expose Image on
      // globalThis. Guard so the function stays best-effort even
      // in those cases.
      const ImageCtor = (globalThis as { Image?: typeof Image }).Image;
      if (ImageCtor === undefined) {
        resolve(null);
        return;
      }
      const img = new ImageCtor();
      img.crossOrigin = "anonymous";
      img.onload = (): void => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext("2d");
          if (ctx === null) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, 32, 32);
          const data = ctx.getImageData(0, 0, 32, 32).data;
          resolve(dominantColorFromImageData(data));
        } catch {
          resolve(null);
        }
      };
      img.onerror = (): void => {
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}
