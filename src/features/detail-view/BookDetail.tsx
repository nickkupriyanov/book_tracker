"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBookLibrary } from "@/state/book-library";
import { EditBookDialog } from "@/features/edit-book";
import { DeleteBookDialog } from "@/features/delete-book";
import { RatingSection } from "@/features/rating";
import { ReviewSection } from "@/features/review";
import {
  QuotesSection,
  QuoteDialog,
  DeleteQuoteDialog,
} from "@/features/quotes";
import { validateBookInput } from "@/lib/validation/book";
import { PageContainer } from "@/components/PageContainer";
import { DetailHeader } from "./DetailHeader";
import { DetailMeta } from "./DetailMeta";
import { DetailNotFound } from "./DetailNotFound";
import { DetailLoading } from "./DetailLoading";
import { ReadingDaysSection } from "./ReadingDaysSection";
import type { Book } from "@/types/book";
import type { Quote, QuoteInput } from "@/types/quote";

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
 *   - <RatingSection /> (spec 006)
 *   - <ReviewSection /> (spec 007)
 *   - <QuotesSection /> + Add/Edit + Delete quote dialogs
 *     (spec 009)
 *
 * The page owns the dialog state for all four dialogs. The
 * quote dialog state lives here (per spec 009 D9) and the
 * dialogs themselves are rendered as siblings of the section
 * — mirroring the existing Edit/Delete book dialog pattern.
 *
 * Navigation on successful book delete: we detect the deletion
 * by reading the store synchronously inside the
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
  const updateBook = useBookLibrary((s) => s.updateBook);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  // Quote dialog state (spec 009 D9). Two flags because Add vs Edit
  // are not distinguishable from the form payload alone — an empty
  // `{ text: "", page: undefined, note: undefined }` is a valid Add
  // payload, not the same as "no payload" (Edit). The dialog
  // determines its mode from `initialValue !== undefined`, so:
  //   - isAddingQuote=true, editingQuote=null → open, Add mode
  //   - isAddingQuote=false, editingQuote=<input> → open, Edit mode
  //   - both null/false → closed
  const [editingQuote, setEditingQuote] = useState<QuoteInput | null>(null);
  const [isAddingQuote, setIsAddingQuote] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);

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

  // --- Quote handlers (spec 009 T6) -----------------------------

  function handleAddQuote(): void {
    setEditingQuote(null);
    setIsAddingQuote(true);
  }

  function handleEditQuote(quote: Quote): void {
    setIsAddingQuote(false);
    setEditingQuote({
      text: quote.text,
      ...(quote.page !== undefined ? { page: quote.page } : {}),
      ...(quote.note !== undefined ? { note: quote.note } : {}),
    });
  }

  function handleDeleteQuote(quote: Quote): void {
    setDeletingQuote(quote);
  }

  /**
   * Save a new or edited quote. Upgrades the id-less form payload
   * to a full {@link Quote} by stamping `id` and `createdAt`,
   * prepends it to the book's quotes, and persists via
   * `updateBook`. The 200-quote cap is enforced defensively here
   * (in addition to the per-quote validator in the dialog) — if
   * we'd somehow exceed it we toast and throw, which keeps the
   * dialog open via its own catch.
   */
  async function handleSaveQuote(input: QuoteInput): Promise<void> {
    if (book === null) return;
    const newQuote: Quote = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const next = [newQuote, ...(book.quotes ?? [])];
    const result = validateBookInput({ ...book, quotes: next });
    if (!result.ok) {
      toast.error("Couldn't save quote. Try again.");
      throw new Error("validation failed");
    }
    await updateBook(book.id, { ...book, quotes: next });
    // No explicit setEditingQuote(null) — the dialog calls
    // onOpenChange(false) after the awaited promise resolves,
    // which clears it via the wrapper below.
  }

  /**
   * Confirm the delete of a single quote. Filters it out of the
   * book's quotes and persists. On success the dialog closes via
   * its own onOpenChange; on failure the dialog toasts and stays
   * open (it has its own try/catch).
   */
  async function handleConfirmDeleteQuote(): Promise<void> {
    if (book === null || deletingQuote === null) return;
    const next = (book.quotes ?? []).filter(
      (q) => q.id !== deletingQuote.id
    );
    await updateBook(book.id, { ...book, quotes: next });
  }

  if (status === "loading") {
    return (
      <PageContainer>
        <DetailLoading />
      </PageContainer>
    );
  }

  if (book === null) {
    return (
      <PageContainer>
        <DetailNotFound />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer>
        <div className="space-y-6">
          <DetailHeader
            onEdit={() => setEditingBook(book)}
            onDelete={() => setDeletingBook(book)}
          />
          <DetailMeta book={book} />
          <RatingSection book={book} />
          <ReviewSection book={book} />
          <QuotesSection
            book={book}
            onAdd={handleAddQuote}
            onEdit={handleEditQuote}
            onDelete={handleDeleteQuote}
          />
          <ReadingDaysSection book={book} />
        </div>
      </PageContainer>
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
      <QuoteDialog
        open={editingQuote !== null || isAddingQuote}
        initialValue={editingQuote ?? undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditingQuote(null);
            setIsAddingQuote(false);
          }
        }}
        onSave={handleSaveQuote}
      />
      <DeleteQuoteDialog
        open={deletingQuote !== null}
        quote={deletingQuote}
        onOpenChange={(open) => {
          if (!open) setDeletingQuote(null);
        }}
        onConfirm={handleConfirmDeleteQuote}
      />
    </>
  );
}
