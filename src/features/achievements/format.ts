/**
 * Tiny ISO-timestamp formatter used by the achievement cards
 * (spec 024 §5). Keeps the visual layer free of `Intl` and
 * timezone glue while still producing stable, locale-neutral
 * dates for the v1 UI.
 *
 * Input must be a valid ISO 8601 string; invalid input falls
 * back to the raw string so we never render a misleading
 * date. The home preview and the full collection both rely
 * on this helper for their displayed unlock dates.
 */
export function formatUnlockDate(iso: string): string {
  if (typeof iso !== "string" || iso === "") return iso;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
