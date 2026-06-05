"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import type { Quote } from "@/types/quote";

const PREVIEW_MAX_CHARS = 120;

export interface DeleteQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  /**
   * Called when the user clicks Delete. Resolves on success (the
   * dialog then closes); rejects on storage failure (the dialog
   * catches and toasts, staying open).
   */
  onConfirm: () => Promise<void>;
}

/**
 * The Delete Quote confirmation dialog. A shadcn <AlertDialog>
 * mirroring the existing `DeleteBookDialog` (spec 004) — a
 * destructive action gets the AlertDialog treatment, not a plain
 * Dialog. Shows a 120-char preview of the quote text (with
 * ellipsis if longer) so the user can confirm the right one.
 *
 * On confirm, calls `props.onConfirm`. On rejection, toasts
 * "Couldn't delete quote. Try again." and keeps the dialog
 * open. No `useBookLibrary` access — the parent (`BookDetail`)
 * owns the store call and the navigation-on-success logic.
 */
export function DeleteQuoteDialog({
  open,
  onOpenChange,
  quote,
  onConfirm,
}: DeleteQuoteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete quote. Try again.");
      setIsDeleting(false);
    }
  }

  const preview =
    quote === null
      ? ""
      : quote.text.length > PREVIEW_MAX_CHARS
        ? `${quote.text.slice(0, PREVIEW_MAX_CHARS)}…`
        : quote.text;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-quote-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete quote?</AlertDialogTitle>
          <AlertDialogDescription>
            This quote will be removed from the book. This can&apos;t
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p
          className="text-foreground bg-muted/40 border border-border/40 rounded-md p-3 text-sm"
          data-testid="delete-quote-preview"
        >
          {preview}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            data-testid="delete-quote-cancel-button"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            // AlertDialogAction auto-closes the dialog on click; we
            // suppress that with preventDefault so we can keep it open
            // on storage failure and close manually on success —
            // mirrors the DeleteBookDialog pattern (spec 004).
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={isDeleting}
            className={buttonVariants({ variant: "destructive" })}
            data-testid="delete-quote-confirm-button"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
