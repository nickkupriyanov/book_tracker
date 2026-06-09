import type { BookInput, ReadingLog, ReadingStatus } from "@/types/book";
import type { Quote, QuoteInput } from "@/types/quote";
import type { Review } from "@/types/review";
import type { JSONContent } from "@tiptap/core";

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
// YYYY-MM-DD — the only format we accept for startedAt and
// finishedAt. Spec 012 D2. Lexicographic sort of two such
// strings is chronological, which the cross-field check
// relies on.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * Validates an optional `YYYY-MM-DD` date. Empty / null /
 * undefined → "no date" (returns undefined, no error).
 * Format: must match `^\d{4}-\d{2}-\d{2}$`. Calendar
 * validity: round-trip through `Date` (forced UTC midnight
 * to avoid the local-midnight rollover) and confirm the
 * result is the same string. Spec 012 D2 / FR-2.
 */
function validateOptionalDate(
  raw: unknown,
  errors: Record<string, string>,
  field: "startedAt" | "finishedAt"
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "string") {
    errors[field] = `${field === "startedAt" ? "Start" : "Finish"} date must be a string.`;
    return undefined;
  }
  if (raw === "") {
    return undefined;
  }
  if (!DATE_PATTERN.test(raw)) {
    errors[field] = `${field === "startedAt" ? "Start" : "Finish"} date must be a YYYY-MM-DD date.`;
    return undefined;
  }
  // Forced-UTC parsing. `new Date("YYYY-MM-DD")` is parsed
  // as UTC per ECMA-262, but constructing with an explicit
  // `T00:00:00Z` makes the intent obvious and protects
  // against environments that treat the bare form as local.
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    errors[field] = `${field === "startedAt" ? "Start" : "Finish"} date must be a real calendar date.`;
    return undefined;
  }
  // Calendar-validity check: if the user typed "2026-02-30"
  // JS happily rolls it to "2026-03-02". Round-trip back and
  // compare to catch the rollover.
  if (d.toISOString().slice(0, 10) !== raw) {
    errors[field] = `${field === "startedAt" ? "Start" : "Finish"} date must be a real calendar date.`;
    return undefined;
  }
  return raw;
}

/**
 * Validates a single `YYYY-MM-DD` date string for use inside
 * a `ReadingLog.date` field. Returns the date string on
 * success, or pushes a contextual error to `errors[field]`
 * and returns `undefined` on failure. Spec 022 — same shape
 * and calendar-validity rules as `validateOptionalDate`,
 * but re-usable from the per-entry validator.
 */
function validateReadingDayString(
  raw: unknown,
  errors: Record<string, string>,
  field: string
): string | undefined {
  if (typeof raw !== "string") {
    errors[field] = "Reading day must be a YYYY-MM-DD date.";
    return undefined;
  }
  if (!DATE_PATTERN.test(raw)) {
    errors[field] = "Reading day must be a YYYY-MM-DD date.";
    return undefined;
  }
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    errors[field] = "Reading day must be a real calendar date.";
    return undefined;
  }
  if (d.toISOString().slice(0, 10) !== raw) {
    errors[field] = "Reading day must be a real calendar date.";
    return undefined;
  }
  return raw;
}

const LOG_PAGE_MIN = 1;

/**
 * Validates a single reading-log entry. Returns the normalised
 * {@link ReadingLog} on success, or pushes field-level errors
 * to `errors` prefixed with `prefix` (e.g. `"readingLogs.0.id"`).
 *
 * Spec 016 §7, FR-13.
 */
function validateReadingLog(
  raw: unknown,
  errors: Record<string, string>,
  prefix: string
): ReadingLog | undefined {
  if (!isObject(raw)) {
    errors[prefix] = "Reading log must be an object.";
    return undefined;
  }

  const id = raw["id"];
  if (typeof id !== "string" || id.length === 0) {
    errors[`${prefix}.id`] = "Reading log id is required.";
    return undefined;
  }

  const date = validateReadingDayString(raw["date"], errors, `${prefix}.date`);
  if (date === undefined) return undefined;

  const pagesRead = raw["pagesRead"];
  if (
    typeof pagesRead !== "number" ||
    !Number.isInteger(pagesRead) ||
    pagesRead < LOG_PAGE_MIN
  ) {
    errors[`${prefix}.pagesRead`] =
      "pagesRead must be a positive whole number.";
    return undefined;
  }

  const currentPageAfter = raw["currentPageAfter"];
  if (
    typeof currentPageAfter !== "number" ||
    !Number.isInteger(currentPageAfter) ||
    currentPageAfter < LOG_PAGE_MIN
  ) {
    errors[`${prefix}.currentPageAfter`] =
      "currentPageAfter must be a positive whole number.";
    return undefined;
  }

  const createdAt = raw["createdAt"];
  if (typeof createdAt !== "string" || createdAt.length === 0) {
    errors[`${prefix}.createdAt`] = "createdAt is required.";
    return undefined;
  }

  const updatedAt = raw["updatedAt"];
  if (typeof updatedAt !== "string" || updatedAt.length === 0) {
    errors[`${prefix}.updatedAt`] = "updatedAt is required.";
    return undefined;
  }

  return { id, date, pagesRead, currentPageAfter, createdAt, updatedAt };
}

/**
 * Validates `readingLogs`. Returns the normalised array on
 * success, `undefined` on failure (or when absent/empty).
 *
 * Normalisation rules:
 * - Duplicate dates are collapsed to one entry, summing
 *   `pagesRead` and keeping the highest `currentPageAfter`
 *   and the latest `updatedAt`.
 * - Sorted chronologically by date.
 *
 * Spec 016 §7, §9 edge cases.
 */
function validateReadingLogs(
  raw: unknown,
  errors: Record<string, string>
): ReadingLog[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    errors.readingLogs = "Reading logs must be an array.";
    return undefined;
  }
  if (raw.length === 0) {
    return undefined;
  }

  const validated: ReadingLog[] = [];
  for (let i = 0; i < raw.length; i++) {
    const log = validateReadingLog(raw[i], errors, `readingLogs.${i}`);
    if (log === undefined) return undefined;
    validated.push(log);
  }

  // Group by date and aggregate.
  const byDate = new Map<string, ReadingLog[]>();
  for (const log of validated) {
    const group = byDate.get(log.date) ?? [];
    group.push(log);
    byDate.set(log.date, group);
  }

  const merged: ReadingLog[] = [];
  for (const [date, group] of byDate) {
    const first = group[0] as ReadingLog;
    const totalPages = group.reduce((sum, l) => sum + l.pagesRead, 0);
    const maxPagesAfter = Math.max(
      ...group.map((l) => l.currentPageAfter)
    );
    const latestUpdated = group
      .map((l) => l.updatedAt)
      .sort()
      .reverse()[0] as string;
    merged.push({
      id: first.id,
      date,
      pagesRead: totalPages,
      currentPageAfter: maxPagesAfter,
      createdAt: first.createdAt,
      updatedAt: latestUpdated,
    });
  }

  // Sort chronologically by date.
  merged.sort((a, b) => a.date.localeCompare(b.date));

  return merged;
}

// `#RGB` or `#RRGGBB`. Lowercase the hex digits in the
// normalised value so the cover-color helpers don't have to
// compare against mixed-case strings. Spec 013 §5.1 D5.
const COVER_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Validates `coverColor`. Returns the trimmed, lowercased
 * hex string on success, or `undefined` on failure (with
 * an inline error on `coverColor`).
 *
 * - `undefined` / `null` / `""` (after trim) → `undefined`
 *   (no colour, no error). The spec normalises empty input
 *   to absent.
 * - Non-string → error.
 * - Anything that doesn't match `#RGB` or `#RRGGBB` → error.
 *
 * Spec 013 §7 (FR-3), §8.2.
 */
function validateCoverColor(
  raw: unknown,
  errors: Record<string, string>
): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== "string") {
    errors.coverColor = "Cover color must be a hex string like #B85B45.";
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (!COVER_COLOR_PATTERN.test(trimmed)) {
    errors.coverColor = "Cover color must be a hex string like #B85B45.";
    return undefined;
  }
  return trimmed.toLowerCase();
}

/**
 * Validates an optional page number. `undefined` / `null`
 * means "no page" (returns undefined, no error). Otherwise
 * must be a positive whole number within `PAGE_MIN..PAGE_MAX`
 * (spec 015 FR-3 / FR-4).
 */
function validateOptionalPage(
  raw: unknown,
  errors: Record<string, string>,
  field: "currentPage" | "totalPages"
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
    errors[field] = `${field === "currentPage" ? "Current" : "Total"} page must be a whole number between ${PAGE_MIN} and ${PAGE_MAX}.`;
    return undefined;
  }
  return raw;
}

function isProseMirrorDoc(value: unknown): value is JSONContent {
  if (!isObject(value)) return false;
  if (value["type"] !== "doc") return false;
  if (!Array.isArray(value["content"])) return false;
  return true;
}

export function validateReview(
  raw: unknown,
  errors: Record<string, string>
): Review | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return undefined;
    if (trimmed.length > REVIEW_MAX) {
      errors.review = `Review must be ${REVIEW_MAX} characters or fewer.`;
      return undefined;
    }
    return { format: "plain", body: trimmed };
  }
  if (!isObject(raw)) {
    errors.review = "Review shape is invalid.";
    return undefined;
  }
  if (raw["format"] === "plain") {
    if (typeof raw["body"] !== "string") {
      errors.review = "Plain review body must be a string.";
      return undefined;
    }
    const trimmed = raw["body"].trim();
    if (trimmed.length === 0) return undefined;
    if (trimmed.length > REVIEW_MAX) {
      errors.review = `Review must be ${REVIEW_MAX} characters or fewer.`;
      return undefined;
    }
    return { format: "plain", body: trimmed };
  }
  if (raw["format"] === "rich") {
    if (!isProseMirrorDoc(raw["body"])) {
      errors.review = "Rich review body is not a valid ProseMirror document.";
      return undefined;
    }
    return { format: "rich", body: raw["body"] as JSONContent };
  }
  errors.review = "Review format must be 'plain' or 'rich'.";
  return undefined;
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

/**
 * Validates a single id-less quote payload (the form shape returned by
 * the Add / Edit Quote dialog). Returns the normalised {@link QuoteInput}
 * on success, or `undefined` on failure (errors pushed to `errors`).
 *
 * Unlike {@link validateBookQuote}, this helper does not require `id`
 * and `createdAt` — those are added by the storage layer (or by
 * `BookDetail.handleSaveQuote`) once the form payload is committed.
 *
 * Public so the dialog can validate the user's draft before handing it
 * off to `onSave`. Pure, `unknown`-in-narrowed-out: no React, no DOM.
 */
export function validateQuote(
  raw: unknown,
  errors: Record<string, string>
): QuoteInput | undefined {
  if (!isObject(raw)) {
    errors._quote = "Invalid quote shape.";
    return undefined;
  }
  const text = validateQuoteText(raw["text"], errors);
  const page = validateQuotePage(raw["page"], errors);
  const note = validateQuoteNote(raw["note"], errors);
  if (Object.keys(errors).length > 0) {
    // Any of text / page / note pushed an error — the whole quote is
    // rejected. The error messages are already on the map; we just
    // need to skip building the value object.
    return undefined;
  }
  return {
    text: text as string,
    ...(page !== undefined ? { page } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

function validateBookQuote(
  raw: unknown,
  errors: Record<string, string>
): Quote | undefined {
  if (!isObject(raw)) {
    errors._quote = "Invalid quote shape.";
    return undefined;
  }
  // `id` and `createdAt` are storage-side; we trust whatever's there
  // and pass it through unchanged. The `Quote` type requires both.
  const id = raw["id"];
  const createdAt = raw["createdAt"];
  const text = validateQuoteText(raw["text"], errors);
  const page = validateQuotePage(raw["page"], errors);
  const note = validateQuoteNote(raw["note"], errors);
  if (Object.keys(errors).length > 0) {
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
    const value = validateBookQuote(raw[i], itemErrors);
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
  const startedAt = validateOptionalDate(input["startedAt"], errors, "startedAt");
  const finishedAt = validateOptionalDate(
    input["finishedAt"],
    errors,
    "finishedAt"
  );
  const readingLogs = validateReadingLogs(input["readingLogs"], errors);
  const coverColor = validateCoverColor(input["coverColor"], errors);
  const currentPage = validateOptionalPage(
    input["currentPage"],
    errors,
    "currentPage"
  );
  const totalPages = validateOptionalPage(
    input["totalPages"],
    errors,
    "totalPages"
  );

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  // Cross-field rule (spec 012 D4): if both dates are set,
  // startedAt must be <= finishedAt. Lexicographic
  // comparison of YYYY-MM-DD strings is chronological,
  // so a simple `>` works. The error rides on `finishedAt`
  // — the field the user is most likely to want to fix.
  if (
    startedAt !== undefined &&
    finishedAt !== undefined &&
    startedAt > finishedAt
  ) {
    errors.finishedAt = "Finish date must be on or after the start date.";
    return { ok: false, errors };
  }

  // Cross-field rule (spec 015 FR-5): if both page numbers
  // are set, currentPage must be <= totalPages. The error
  // rides on `currentPage` — that's the field the user just
  // typed and the one they're most likely to want to fix.
  if (
    currentPage !== undefined &&
    totalPages !== undefined &&
    currentPage > totalPages
  ) {
    errors.currentPage = `Current page must be ${totalPages} or fewer.`;
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
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(finishedAt !== undefined ? { finishedAt } : {}),
    ...(readingLogs !== undefined ? { readingLogs } : {}),
    ...(coverColor !== undefined ? { coverColor } : {}),
    ...(currentPage !== undefined ? { currentPage } : {}),
    ...(totalPages !== undefined ? { totalPages } : {}),
  };
  return { ok: true, value };
}
