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
  const [coverUrl, setCoverUrl] = useState(initialValues.coverUrl ?? "");
  const [tags, setTags] = useState(initialValues.tags.join(", "));
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
      tags: [tags],
    };

    const result = validateBookInput(input);
    if (!result.ok) {
      setErrors(result.errors);
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
