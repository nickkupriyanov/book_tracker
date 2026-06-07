"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoverColorField } from "@/components/CoverColorField";
import { validateBookInput } from "@/lib/validation/book";
import type { BookInput, ReadingStatus } from "@/types/book";

export interface BookFormProps {
  initialValues: BookInput;
  submitLabel: string;
  /**
   * Called with the validated BookInput on submit. The form awaits
   * the returned promise; if it rejects, the form shows an inline
   * error and keeps its values.
   */
  onSubmit: (input: BookInput) => Promise<void>;
  /** Called after onSubmit resolves successfully. Typically closes the dialog. */
  onSuccess?: () => void;
}

/**
 * Shared form for both Add Book and Edit Book. Owns field state, errors,
 * submit-disabled logic, and validation. The parent decides what to do
 * with the validated input (addBook vs updateBook) and any side effects
 * (toast, setLastStatus, close dialog).
 */
export function BookForm({
  initialValues,
  submitLabel,
  onSubmit,
  onSuccess,
}: BookFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [author, setAuthor] = useState(initialValues.author);
  const [status, setStatus] = useState<ReadingStatus>(initialValues.status);
  const [rating, setRating] = useState<string>(
    initialValues.rating?.toString() ?? ""
  );
  const [coverUrl, setCoverUrl] = useState(initialValues.coverUrl ?? "");
  // Cover color (spec 013). Independent from coverUrl: the user
  // can set a color manually, the form may suggest one from the
  // cover image, and an empty / unset value stays absent from
  // the submitted BookInput.
  const [coverColor, setCoverColor] = useState(
    initialValues.coverColor ?? ""
  );
  const [tags, setTags] = useState(initialValues.tags.join(", "));
  // Reading dates (spec 012). Both optional, both validated by
  // `validateBookInput`. The native date input always emits a
  // YYYY-MM-DD string (or empty), so the validator is the
  // single source of truth on shape / cross-field rule.
  const [startedAt, setStartedAt] = useState(initialValues.startedAt ?? "");
  const [finishedAt, setFinishedAt] = useState(
    initialValues.finishedAt ?? ""
  );
  // Total page count (spec 015). Optional. Edited through
  // the shared BookForm; the currentPage lives on the
  // home quick-update block instead. Empty string = no
  // total pages; only included in the submitted BookInput
  // when provided.
  const [totalPages, setTotalPages] = useState(
    initialValues.totalPages?.toString() ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 && author.trim().length > 0 && !isSubmitting;

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setFormError(null);

    const input: BookInput = {
      title,
      author,
      status,
      ...(coverUrl ? { coverUrl } : {}),
      ...(coverColor ? { coverColor } : {}),
      ...(rating ? { rating: Number(rating) as 1 | 2 | 3 | 4 | 5 } : {}),
      ...(startedAt ? { startedAt } : {}),
      ...(finishedAt ? { finishedAt } : {}),
      ...(totalPages ? { totalPages: Number(totalPages) } : {}),
      tags: [tags],
    };

    const result = validateBookInput(input);
    if (!result.ok) {
      // The `currentPage > totalPages` cross-field rule
      // (spec 015 FR-5) fires on the `currentPage` field,
      // but the form doesn't expose `currentPage` — the
      // value is carried over from the book record. Re-route
      // the message to the `totalPages` field the user is
      // actually editing, so the error is visible.
      const fieldErrors = { ...result.errors };
      if (
        fieldErrors.currentPage !== undefined &&
        fieldErrors.totalPages === undefined
      ) {
        fieldErrors.totalPages = fieldErrors.currentPage;
        delete fieldErrors.currentPage;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    setErrors({});
    try {
      await onSubmit(result.value);
      onSuccess?.();
    } catch {
      setFormError("Couldn't save. Your browser storage is full or disabled.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="book-form-title">Title</Label>
        <Input
          id="book-form-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "book-form-title-error" : undefined}
        />
        {errors.title && (
          <p
            id="book-form-title-error"
            className="text-sm text-destructive"
          >
            {errors.title}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-author">Author</Label>
        <Input
          id="book-form-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          aria-invalid={errors.author ? true : undefined}
          aria-describedby={
            errors.author ? "book-form-author-error" : undefined
          }
        />
        {errors.author && (
          <p
            id="book-form-author-error"
            className="text-sm text-destructive"
          >
            {errors.author}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-status">Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ReadingStatus)}
        >
          <SelectTrigger id="book-form-status" data-testid="book-form-status-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="want">Want to read</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-rating">Rating</Label>
        <Select
          value={rating === "" ? "none" : rating}
          onValueChange={(v) => setRating(v === "none" ? "" : v)}
        >
          <SelectTrigger
            id="book-form-rating"
            data-testid="book-form-rating-trigger"
          >
            <SelectValue placeholder="Not rated" />
          </SelectTrigger>
          <SelectContent>
            {/* Radix reserves value="" for "no selection / show
                placeholder", so we use "none" as a sentinel and
                translate to/from "" in the form state above. */}
            <SelectItem value="none">Not rated</SelectItem>
            <SelectItem value="1">1 star</SelectItem>
            <SelectItem value="2">2 stars</SelectItem>
            <SelectItem value="3">3 stars</SelectItem>
            <SelectItem value="4">4 stars</SelectItem>
            <SelectItem value="5">5 stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-cover">Cover URL (optional)</Label>
        <Input
          id="book-form-cover"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          aria-invalid={errors.coverUrl ? true : undefined}
          aria-describedby={
            errors.coverUrl ? "book-form-cover-error" : undefined
          }
        />
        {errors.coverUrl && (
          <p
            id="book-form-cover-error"
            className="text-sm text-destructive"
          >
            {errors.coverUrl}
          </p>
        )}
      </div>

      <CoverColorField
        value={coverColor}
        onChange={setCoverColor}
        coverUrl={coverUrl}
        disabled={isSubmitting}
        {...(errors.coverColor !== undefined
          ? { error: errors.coverColor }
          : {})}
      />

      <div className="space-y-1.5">
        <Label htmlFor="book-form-tags">Tags (optional, comma-separated)</Label>
        <Input
          id="book-form-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          aria-invalid={errors.tags ? true : undefined}
          aria-describedby={errors.tags ? "book-form-tags-error" : undefined}
        />
        {errors.tags && (
          <p id="book-form-tags-error" className="text-sm text-destructive">
            {errors.tags}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-started">Started (optional)</Label>
        <Input
          id="book-form-started"
          type="date"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          aria-invalid={errors.startedAt ? true : undefined}
          aria-describedby={
            errors.startedAt ? "book-form-started-error" : undefined
          }
        />
        {errors.startedAt && (
          <p
            id="book-form-started-error"
            className="text-sm text-destructive"
          >
            {errors.startedAt}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-finished">Finished (optional)</Label>
        <Input
          id="book-form-finished"
          type="date"
          value={finishedAt}
          onChange={(e) => setFinishedAt(e.target.value)}
          aria-invalid={errors.finishedAt ? true : undefined}
          aria-describedby={
            errors.finishedAt ? "book-form-finished-error" : undefined
          }
        />
        {errors.finishedAt && (
          <p
            id="book-form-finished-error"
            className="text-sm text-destructive"
          >
            {errors.finishedAt}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="book-form-total-pages">Total pages (optional)</Label>
        <Input
          id="book-form-total-pages"
          data-testid="book-form-total-pages"
          type="number"
          inputMode="numeric"
          min={1}
          value={totalPages}
          onChange={(e) => setTotalPages(e.target.value)}
          placeholder="e.g. 420"
          aria-invalid={errors.totalPages ? true : undefined}
          aria-describedby={
            errors.totalPages ? "book-form-total-pages-error" : undefined
          }
        />
        {errors.totalPages && (
          <p
            id="book-form-total-pages-error"
            className="text-sm text-destructive"
          >
            {errors.totalPages}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!canSubmit}
          data-testid="book-form-submit"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
