"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookForm } from "@/components/BookForm";
import { useBookLibrary } from "@/state/book-library";
import { toast } from "sonner";
import type { Book, BookInput } from "@/types/book";

export interface EditBookDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The Edit Book dialog. Renders a shared <BookForm> pre-filled with
 * the book's current values. On save, calls updateBook and toasts
 * "Updated '<title>'". Does NOT call setLastStatus — editing is not
 * the same as adding, and last-status is for the Add flow only
 * (per spec 002 D2).
 */
export function EditBookDialog({
  book,
  open,
  onOpenChange,
}: EditBookDialogProps) {
  const updateBook = useBookLibrary((s) => s.updateBook);

  const initialValues: BookInput = {
    title: book.title,
    author: book.author,
    status: book.status,
    ...(book.coverUrl !== undefined ? { coverUrl: book.coverUrl } : {}),
    ...(book.coverColor !== undefined ? { coverColor: book.coverColor } : {}),
    ...(book.startedAt !== undefined ? { startedAt: book.startedAt } : {}),
    ...(book.finishedAt !== undefined ? { finishedAt: book.finishedAt } : {}),
    tags: book.tags,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
          <DialogDescription>
            Update the details of this book.
          </DialogDescription>
        </DialogHeader>
        <BookForm
          key={book.id}
          initialValues={initialValues}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            const updated = await updateBook(book.id, input);
            toast.success(`Updated "${updated.title}"`);
          }}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
