"use client";

import { useState } from "react";
import { AddBookButton, AddBookDialog } from "@/features/add-book";
import { ShelfList } from "@/features/shelf-list";
import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";
import { PageContainer } from "@/components/PageContainer";

/**
 * The /library full-shelf route (spec 015 → spec 016). The
 * store is initialised by `RootClient` in the root layout,
 * so this component just reads the store and renders the
 * appropriate state (loading / empty / list / error). No
 * useEffect for init here.
 *
 * The library page is the "everything else" surface: the full
 * ShelfList (search, status tabs, sort, tags, clear filters,
 * add/edit/delete). The Reading Calendar lives only on the
 * home page (spec 016).
 */
export function LibraryClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageContainer>
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-foreground">Your library</h1>
        {status === "ready" && books.length > 0 && (
          <AddBookButton onClick={() => setDialogOpen(true)} />
        )}
      </header>

      {status === "loading" && (
        <p className="text-muted-foreground">Loading your library…</p>
      )}

      {status === "error" && (
        <p className="text-destructive" role="alert">
          Couldn&apos;t load your library. Try reloading the page.
        </p>
      )}

      {status === "ready" && books.length === 0 && <EmptyShelf />}

      {status === "ready" && books.length > 0 && (
        <ShelfList books={books} />
      )}

      <AddBookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  );
}
