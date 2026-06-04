"use client";

import Link from "next/link";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DetailHeaderProps {
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * The header of the detail page. Two halves:
 *  - Left: a "Back to shelf" link to `/`, styled as a shadcn
 *    ghost Button with a ChevronLeft icon.
 *  - Right: an Edit button and a Delete button (icon-only,
 *    ghost variant, `hover:text-destructive` on the trash).
 *
 * Purely presentational — no store, no dialogs. The parent
 * (BookDetail) owns the state and the dialogs.
 */
export function DetailHeader({ onEdit, onDelete }: DetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        asChild
        variant="ghost"
        size="sm"
        data-testid="detail-back-to-shelf"
      >
        <Link href="/">
          <ChevronLeft className="size-4" />
          Back to shelf
        </Link>
      </Button>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label="Edit book"
          data-testid="detail-edit"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label="Delete book"
          data-testid="detail-delete"
          className="hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
