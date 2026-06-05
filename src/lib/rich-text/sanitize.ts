const ALLOWED_SCHEMES = ["http:", "https:", "mailto:"] as const;

export function sanitizeHref(href: string): string | undefined {
  const hasAllowedScheme = ALLOWED_SCHEMES.some((s) =>
    href.toLowerCase().startsWith(s)
  );
  if (!hasAllowedScheme) return undefined;
  try {
    const url = new URL(href);
    if (ALLOWED_SCHEMES.includes(url.protocol as (typeof ALLOWED_SCHEMES)[number])) {
      return url.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}
