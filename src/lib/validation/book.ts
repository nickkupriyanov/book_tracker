import type { BookInput, ReadingStatus } from "@/types/book";

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
  };
  return { ok: true, value };
}
