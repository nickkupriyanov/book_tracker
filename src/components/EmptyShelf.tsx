"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddBookDialog } from "@/features/add-book";

/**
 * Centered empty-state shown when the library has no books.
 * Owns its own AddBookDialog open state — the parent just renders
 * this component when the shelf is empty.
 */
export function EmptyShelf() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div
        aria-hidden
        className="bg-muted flex size-20 items-center justify-center rounded-full"
      >
        <BookOpen className="text-muted-foreground size-9" />
      </div>

      <h2 className="font-serif text-2xl text-foreground">Your shelf is empty</h2>

      <p className="text-muted-foreground max-w-sm text-sm">
        Add your first book to start tracking what you read.
      </p>

      <Button
        onClick={() => setOpen(true)}
        data-testid="add-first-book-button"
        className="mt-2"
      >
        Add your first book
      </Button>

      <AddBookDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
