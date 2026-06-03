"use client";

import { Button } from "@/components/ui/button";

interface AddBookButtonProps {
  onClick: () => void;
}

/**
 * Primary CTA on the shelf page. Stateless wrapper over the shadcn
 * Button — the parent owns the dialog open state (so {@link EmptyShelf}
 * can open the same dialog with its own CTA).
 */
export function AddBookButton({ onClick }: AddBookButtonProps) {
  return (
    <Button onClick={onClick} data-testid="add-book-button">
      Add book
    </Button>
  );
}
