"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validateQuote } from "@/lib/validation/book";
import type { QuoteInput } from "@/types/quote";

export interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Undefined = Add mode. Provided = Edit mode (pre-fills the form). */
  initialValue?: QuoteInput;
  /**
   * Called with a normalised {@link QuoteInput} when the user clicks
   * Save. Resolves on success; rejects on storage failure (the
   * dialog catches and toasts).
   */
  onSave: (input: QuoteInput) => Promise<void>;
}

interface FormState {
  text: string;
  page: string; // raw input value; empty string means "no page"
  note: string;
}

/**
 * The Add / Edit Quote dialog. Three fields:
 *   1. `text` — a 6-row `<Textarea>`, autofocused on open, required.
 *   2. `page` — an `<Input type="number">`, optional integer 1..99999.
 *   3. `note` — a 3-row `<Textarea>`, optional, 1..1000 chars.
 *
 * On Save, runs {@link validateQuote} locally. On validation success,
 * hands the normalised payload to `props.onSave` and closes the
 * dialog. On `props.onSave` rejection (storage failure), toasts
 * "Couldn't save quote. Try again." and stays open with the user's
 * input preserved.
 *
 * Form state resets whenever `open` or `initialValue` changes, so
 * opening for a different quote (or switching from Add to Edit)
 * always shows the right initial values.
 */
export function QuoteDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
}: QuoteDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialToForm(initialValue));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Reset the form when the dialog opens or the target quote changes.
  // This handles "open Add then close then open Edit for a different
  // quote" — the second open should not show stale Add-mode fields.
  useEffect(() => {
    if (open) {
      setForm(initialToForm(initialValue));
      setErrors({});
      setIsSaving(false);
      // Defer focus to next tick so the dialog content has mounted.
      // Without this, the focus call runs before the textarea is in
      // the DOM and is silently dropped.
      queueMicrotask(() => textRef.current?.focus());
    }
  }, [open, initialValue]);

  const isEdit = initialValue !== undefined;

  function handleSubmit(): void {
    const candidate: QuoteInput = {
      text: form.text,
      ...(form.page.trim() !== "" ? { page: parsePageOrNaN(form.page) } : {}),
      ...(form.note.trim() !== "" ? { note: form.note } : {}),
    };
    const localErrors: Record<string, string> = {};
    const value = validateQuote(candidate, localErrors);
    if (value === undefined) {
      setErrors(localErrors);
      return;
    }
    setErrors({});
    setIsSaving(true);
    void (async () => {
      try {
        await onSave(value);
        onOpenChange(false);
      } catch {
        toast.error("Couldn't save quote. Try again.");
      } finally {
        setIsSaving(false);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit quote" : "Add quote"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this passage from the book."
              : "Save a passage you want to remember."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Textarea
              ref={textRef}
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              disabled={isSaving}
              rows={6}
              placeholder="Type the passage…"
              aria-label="Quote"
              aria-invalid={errors.text ? true : undefined}
              aria-describedby={errors.text ? "quote-error-text" : undefined}
              data-testid="quote-text-input"
            />
            {errors.text && (
              <p
                id="quote-error-text"
                role="alert"
                className="text-destructive mt-1 text-sm"
                data-testid="quote-error-text"
              >
                {errors.text}
              </p>
            )}
          </div>
          <div>
            <Input
              type="number"
              value={form.page}
              onChange={(e) => setForm((f) => ({ ...f, page: e.target.value }))}
              disabled={isSaving}
              min={1}
              max={99999}
              placeholder="Page (optional)"
              aria-label="Page (optional)"
              aria-invalid={errors.page ? true : undefined}
              aria-describedby={errors.page ? "quote-error-page" : undefined}
              data-testid="quote-page-input"
            />
            {errors.page && (
              <p
                id="quote-error-page"
                role="alert"
                className="text-destructive mt-1 text-sm"
                data-testid="quote-error-page"
              >
                {errors.page}
              </p>
            )}
          </div>
          <div>
            <Textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              disabled={isSaving}
              rows={3}
              placeholder="Note (optional)"
              aria-label="Note (optional)"
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={errors.note ? "quote-error-note" : undefined}
              data-testid="quote-note-input"
            />
            {errors.note && (
              <p
                id="quote-error-note"
                role="alert"
                className="text-destructive mt-1 text-sm"
                data-testid="quote-error-note"
              >
                {errors.note}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid="quote-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            data-testid="quote-save-button"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialToForm(initial: QuoteInput | undefined): FormState {
  if (initial === undefined) {
    return { text: "", page: "", note: "" };
  }
  return {
    text: initial.text,
    page: initial.page !== undefined ? String(initial.page) : "",
    note: initial.note ?? "",
  };
}

/**
 * Parse the raw `<input type="number">` string into a number for the
 * validator. The validator only accepts a proper integer 1..99999;
 * this function does NOT pre-validate (so error messages stay in one
 * place — the validator). Returns `NaN` for non-numeric strings,
 * which the validator will reject with the same message as `"42abc"`.
 */
function parsePageOrNaN(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return NaN;
  const n = Number(trimmed);
  return n;
}
