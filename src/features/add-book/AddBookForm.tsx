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
import { toast } from "sonner";
import { validateBookInput } from "@/lib/validation/book";
import { useBookLibrary } from "@/state/book-library";
import { setLastStatus } from "./last-status";
import type { BookInput, ReadingStatus } from "@/types/book";

export interface AddBookFormProps {
  initialStatus: ReadingStatus;
  onSuccess: () => void;
}

export function AddBookForm({ initialStatus, onSuccess }: AddBookFormProps) {
  const addBook = useBookLibrary((s) => s.addBook);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<ReadingStatus>(initialStatus);
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState("");
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
      await addBook(result.value);
      setLastStatus(result.value.status);
      toast.success(`Added "${result.value.title}"`);
      onSuccess();
    } catch {
      setFormError("Couldn't save. Your browser storage is full or disabled.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="add-book-title">Title</Label>
        <Input
          id="add-book-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "add-book-title-error" : undefined}
        />
        {errors.title && (
          <p
            id="add-book-title-error"
            className="text-sm text-destructive"
          >
            {errors.title}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-book-author">Author</Label>
        <Input
          id="add-book-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          aria-invalid={errors.author ? true : undefined}
          aria-describedby={
            errors.author ? "add-book-author-error" : undefined
          }
        />
        {errors.author && (
          <p
            id="add-book-author-error"
            className="text-sm text-destructive"
          >
            {errors.author}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-book-status">Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ReadingStatus)}
        >
          <SelectTrigger
            id="add-book-status"
            data-testid="add-book-status-trigger"
          >
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
        <Label htmlFor="add-book-cover">Cover URL (optional)</Label>
        <Input
          id="add-book-cover"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          aria-invalid={errors.coverUrl ? true : undefined}
          aria-describedby={
            errors.coverUrl ? "add-book-cover-error" : undefined
          }
        />
        {errors.coverUrl && (
          <p
            id="add-book-cover-error"
            className="text-sm text-destructive"
          >
            {errors.coverUrl}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-book-tags">
          Tags (optional, comma-separated)
        </Label>
        <Input
          id="add-book-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          aria-invalid={errors.tags ? true : undefined}
          aria-describedby={errors.tags ? "add-book-tags-error" : undefined}
        />
        {errors.tags && (
          <p
            id="add-book-tags-error"
            className="text-sm text-destructive"
          >
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
          data-testid="add-book-submit"
        >
          Add book
        </Button>
      </div>
    </form>
  );
}
