"use client";

import { useState } from "react";
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
import { useBookLibrary } from "@/state/book-library";
import { toast } from "sonner";
import type { Book } from "@/types/book";

export interface DeleteBookDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The Delete Book confirmation dialog. A shadcn <AlertDialog> that
 * asks the user to confirm the destructive action. On confirm, calls
 * <useBookLibrary.deleteBook>, toasts "Deleted '<title>'", and closes
 * via the parent's onOpenChange. On storage failure, shows a form
 * error and keeps the dialog open.
 *
 * Does NOT call setLastStatus — delete has no relationship to the Add
 * flow's last-status (preserved from spec 002 D2 and spec 003).
 */
export function DeleteBookDialog({
  book,
  open,
  onOpenChange,
}: DeleteBookDialogProps) {
  const deleteBook = useBookLibrary((s) => s.deleteBook);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteBook(book.id);
      toast.success(`Deleted "${book.title}"`);
      onOpenChange(false);
    } catch {
      setError("Couldn't delete. Try again.");
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete "${book.title}"?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {book.author} will be removed from your library. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error !== null && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            // AlertDialogAction auto-closes the dialog on click; we
            // suppress that with preventDefault so we can keep it open
            // on storage failure and close manually on success.
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={isDeleting}
            className={buttonVariants({ variant: "destructive" })}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
