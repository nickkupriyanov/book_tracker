import type { BookInput, ReadingStatus } from "@/types/book";
import type { Quote } from "@/types/quote";

/**
 * Discriminated result type for validators.
 * On success, `value` carries the normalized data.
 * On failure, `errors` is a map of field name → human-readable message.
 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

const TITLE_MAX = 200;
const AUTHOR_MAX = 120;
const TAG_MAX_LENGTH = 24;
const TAGS_MAX_COUNT = 10;
const REVIEW_MAX = 10_000;
const QUOTE_TEXT_MAX = 2000;
const QUOTE_NOTE_MAX = 1000;
const QUOTES_MAX_COUNT = 200;
const PAGE_MIN = 1;
const PAGE_MAX = 99_999;

const READING_STATUSES: readonly ReadingStatus[] = ["want", "reading", "read"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isReadingStatus(value: unknown): value is ReadingStatus {
  return isString(value) && (READING_STATUSES as readonly string[]).includes(value);
}

function validateTitle(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (!isString(raw)) {
    errors.title = "Title is required.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    errors.title = "Title is required.";
    return undefined;
  }
  if (trimmed.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

function validateAuthor(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (!isString(raw)) {
    errors.author = "Author is required.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    errors.author = "Author is required.";
    return undefined;
  }
  if (trimmed.length > AUTHOR_MAX) {
    errors.author = `Author must be ${AUTHOR_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

function validateCoverUrl(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!isString(raw)) {
    errors.coverUrl = "Cover URL must be a string.";
    return undefined;
  }
  if (raw.length === 0) {
    return undefined;
  }
  if (!/^https?:\/\//.test(raw)) {
    errors.coverUrl = "Cover URL must start with http:// or https://.";
    return undefined;
  }
  return raw;
}

function validateTags(
  raw: unknown,
  errors: Record<string, string>
): string[] | undefined {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw) || !raw.every(isString)) {
    errors.tags = "Tags must be an array of strings.";
    return undefined;
  }

  const split: string[] = [];
  for (const item of raw) {
    for (const part of item.split(",")) {
      const normalized = part.trim().toLowerCase();
      if (normalized.length > 0) {
        split.push(normalized);
      }
    }
  }

  if (split.length > TAGS_MAX_COUNT) {
    errors.tags = `At most ${TAGS_MAX_COUNT} tags allowed.`;
    return undefined;
  }

  if (split.some((t) => t.length > TAG_MAX_LENGTH)) {
    errors.tags = `Each tag must be ${TAG_MAX_LENGTH} characters or fewer.`;
    return undefined;
  }

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const tag of split) {
    if (!seen.has(tag)) {
      seen.add(tag);
      deduped.push(tag);
    }
  }

  return deduped;
}

function validateStatus(
  raw: unknown,
  errors: Record<string, string>
): ReadingStatus | undefined {
  if (!isReadingStatus(raw)) {
    errors.status = "Status must be 'want', 'reading', or 'read'.";
    return undefined;
  }
  return raw;
}

function validateRating(
  raw: unknown,
  errors: Record<string, string>
): 1 | 2 | 3 | 4 | 5 | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 1 ||
    raw > 5
  ) {
    errors.rating = "Rating must be a whole number between 1 and 5.";
    return undefined;
  }
  return raw as 1 | 2 | 3 | 4 | 5;
}

function validateReview(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "string") {
    errors.review = "Review must be text.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > REVIEW_MAX) {
    errors.review = `Review must be ${REVIEW_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

function validateQuoteText(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (typeof raw !== "string") {
    errors.text = "Quote text is required.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    errors.text = "Quote text is required.";
    return undefined;
  }
  if (trimmed.length > QUOTE_TEXT_MAX) {
    errors.text = `Quote text must be ${QUOTE_TEXT_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

function validateQuotePage(
  raw: unknown,
  errors: Record<string, string>
): number | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < PAGE_MIN ||
    raw > PAGE_MAX
  ) {
    errors.page = `Page must be a whole number between ${PAGE_MIN} and ${PAGE_MAX}.`;
    return undefined;
  }
  return raw;
}

function validateQuoteNote(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "string") {
    errors.note = "Note must be text.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > QUOTE_NOTE_MAX) {
    errors.note = `Note must be ${QUOTE_NOTE_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed;
}

function validateQuote(
  raw: unknown,
  errors: Record<string, string>
): Quote | undefined {
  if (!isObject(raw)) {
    errors._quote = "Invalid quote shape.";
    return undefined;
  }
  const text = validateQuoteText(raw["text"], errors);
  const page = validateQuotePage(raw["page"], errors);
  const note = validateQuoteNote(raw["note"], errors);
  // `id` and `createdAt` are storage-side; we trust whatever's there
  // and pass it through unchanged. The `Quote` type requires both —
  // we copy them out of the raw input and re-attach on success.
  const id = raw["id"];
  const createdAt = raw["createdAt"];
  if (Object.keys(errors).length > 0) {
    // Any of text / page / note pushed an error — the whole quote is
    // rejected. The error messages are already on the map; we just
    // need to skip building the value object.
    return undefined;
  }
  if (typeof id !== "string" || typeof createdAt !== "string") {
    errors._quote = "Quote is missing id or createdAt.";
    return undefined;
  }
  return {
    id,
    createdAt,
    text: text as string,
    ...(page !== undefined ? { page } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

function validateQuotes(
  raw: unknown,
  errors: Record<string, string>
): Quote[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    errors.quotes = "Quotes must be an array.";
    return undefined;
  }
  if (raw.length > QUOTES_MAX_COUNT) {
    errors.quotes = `At most ${QUOTES_MAX_COUNT} quotes allowed.`;
    return undefined;
  }
  const out: Quote[] = [];
  for (let i = 0; i < raw.length; i++) {
    const itemErrors: Record<string, string> = {};
    const value = validateQuote(raw[i], itemErrors);
    if (value === undefined) {
      // Forward the per-item errors under a prefixed key so the UI
      // can show them next to the right card.
      for (const [k, v] of Object.entries(itemErrors)) {
        errors[`quotes.${i}.${k}`] = v;
      }
      return undefined;
    }
    out.push(value);
  }
  return out;
}

/**
 * Validates raw input for the Add Book form and returns either a normalized
 * {@link BookInput} or a map of field-level error messages.
 *
 * Pure: no React, no DOM, no `any`. Accepts `unknown` and narrows internally.
 * Collects all errors in one pass so the UI can render them at once.
 */
export function validateBookInput(input: unknown): ValidationResult<BookInput> {
  if (!isObject(input)) {
    return { ok: false, errors: { _form: "Invalid input shape." } };
  }

  // Shared errors map: each field validator pushes its message here so we can
  // report all errors in one pass. The mutation is bounded — `errors` is
  // local to this call and never escapes, so each validator is still pure
  // ("same input → same output"). This is the standard pattern for form
  // validators (Joi, Yup, Zod all do something equivalent internally).
  //
  // Refactor trigger: if a second consumer wants to run validators in
  // parallel (e.g. `Promise.all`), or if we need to compose validators as
  // standalone units, switch each to `Result<T, string>` and merge here.
  const errors: Record<string, string> = {};

  const title = validateTitle(input["title"], errors);
  const author = validateAuthor(input["author"], errors);
  const coverUrl = validateCoverUrl(input["coverUrl"], errors);
  const tags = validateTags(input["tags"], errors);
  const status = validateStatus(input["status"], errors);
  const rating = validateRating(input["rating"], errors);
  const review = validateReview(input["review"], errors);
  const quotes = validateQuotes(input["quotes"], errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  // Invariant: when `errors` is empty, every validator returned a value.
  // TypeScript can't track this, so we throw on the (impossible) violation
  // instead of `as`-casting and erasing the type relationship.
  if (
    title === undefined ||
    author === undefined ||
    status === undefined ||
    tags === undefined
  ) {
    throw new Error("Validator invariant violated: errors empty but values missing.");
  }

  const value: BookInput = {
    title,
    author,
    status,
    tags,
    ...(coverUrl !== undefined ? { coverUrl } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(review !== undefined ? { review } : {}),
    ...(quotes !== undefined ? { quotes } : {}),
  };
  return { ok: true, value };
}
