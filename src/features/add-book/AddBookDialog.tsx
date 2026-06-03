"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddBookForm } from "./AddBookForm";
import { getLastStatus } from "./last-status";
import type { ReadingStatus } from "@/types/book";

export interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The Add Book dialog. Reads `lastUsedStatus` (D2) on each open via
 * `AddBookForm`'s `initialStatus` prop, so the dialog remembers the
 * last status the user picked across opens.
 */
export function AddBookDialog({ open, onOpenChange }: AddBookDialogProps) {
  const initialStatus: ReadingStatus = getLastStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a book</DialogTitle>
          <DialogDescription>
            Track a new book in your library.
          </DialogDescription>
        </DialogHeader>
        <AddBookForm
          initialStatus={initialStatus}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
