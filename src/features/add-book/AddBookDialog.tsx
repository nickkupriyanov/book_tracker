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
import { getLastStatus, setLastStatus } from "./last-status";
import { toast } from "sonner";
import type { BookInput, ReadingStatus } from "@/types/book";

export interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The Add Book dialog. Owns the Add-specific side effects
 * (toast, setLastStatus) — the form itself is shared with Edit Book
 * (see spec 002 D2 / spec 003 D2).
 */
export function AddBookDialog({ open, onOpenChange }: AddBookDialogProps) {
  const initialStatus: ReadingStatus = getLastStatus();
  const addBook = useBookLibrary((s) => s.addBook);

  const initialValues: BookInput = {
    title: "",
    author: "",
    status: initialStatus,
    tags: [],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a book</DialogTitle>
          <DialogDescription>
            Track a new book in your library.
          </DialogDescription>
        </DialogHeader>
        <BookForm
          initialValues={initialValues}
          submitLabel="Add book"
          onSubmit={async (input) => {
            const book = await addBook(input);
            setLastStatus(book.status);
            toast.success(`Added "${book.title}"`);
          }}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
