"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBookLibrary } from "@/state/book-library";
import { EditBookDialog } from "@/features/edit-book";
import { DeleteBookDialog } from "@/features/delete-book";
import { RatingSection } from "@/features/rating";
import { DetailHeader } from "./DetailHeader";
import { DetailMeta } from "./DetailMeta";
import { DetailNotFound } from "./DetailNotFound";
import { DetailLoading } from "./DetailLoading";
import type { Book } from "@/types/book";

export interface BookDetailProps {
  bookId: string;
}

/**
 * Orchestrator for the /book/[id] page. Reads the book from
 * `useBookLibrary` and renders:
 *   - <DetailLoading /> while the store is loading (FR-10).
 *   - <DetailNotFound /> when the book id is missing (FR-9).
 *   - <DetailHeader /> + <DetailMeta /> + Edit/Delete dialogs
 *     when the book is found (FR-3..FR-8).
 *
 * The page owns the dialog state (`editingBook`,
 * `deletingBook`). Edit and Delete live in the header; the
 * dialogs are the existing ones from specs 003 and 004 (no
 * modifications to those components per plan §4 BookDetail).
 *
 * Navigation on successful delete: we detect the deletion by
 * reading the store synchronously inside the
 * `onOpenChange(false)` handler. If the book is no longer in
 * `books` at that moment, the delete succeeded (or was
 * deleted externally), and we navigate to `/`. Cancel and
 * failure paths leave the book in place, so no navigation
 * fires (spec 005 §9 / FR-8).
 */
export function BookDetail({ bookId }: BookDetailProps) {
  const router = useRouter();
  const books = useBookLibrary((s) => s.books);
  const status = useBookLibrary((s) => s.status);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

  const book = books.find((b) => b.id === bookId) ?? null;

  function handleDeleteOpenChange(open: boolean): void {
    if (open) return;
    setDeletingBook(null);
    // Read the store synchronously: at this point the dialog has
    // already resolved its `deleteBook` call, so the store reflects
    // the post-delete state. If the book is gone, navigate to /.
    if (
      useBookLibrary.getState().books.find((b) => b.id === bookId) ===
      undefined
    ) {
      router.push("/");
    }
  }

  if (status === "loading") {
    return <DetailLoading />;
  }

  if (book === null) {
    return <DetailNotFound />;
  }

  return (
    <>
      <div className="space-y-6">
        <DetailHeader
          onEdit={() => setEditingBook(book)}
          onDelete={() => setDeletingBook(book)}
        />
        <DetailMeta book={book} />
        <RatingSection book={book} />
      </div>
      <EditBookDialog
        book={editingBook ?? book}
        open={editingBook !== null}
        onOpenChange={(open) => {
          if (!open) setEditingBook(null);
        }}
      />
      <DeleteBookDialog
        book={deletingBook ?? book}
        open={deletingBook !== null}
        onOpenChange={handleDeleteOpenChange}
      />
    </>
  );
}
