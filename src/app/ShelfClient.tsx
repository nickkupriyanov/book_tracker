"use client";

import { useEffect, useState } from "react";
import { AddBookButton, AddBookDialog } from "@/features/add-book";
import { ShelfList } from "@/features/shelf-list";
import { useBookLibrary } from "@/state/book-library";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { EmptyShelf } from "@/components/EmptyShelf";

/**
 * The shelf page. Server-rendered as a shell; on the client, initializes
 * the Zustand store with a LocalStorageAdapter and renders the appropriate
 * state (loading / empty / list / error).
 */
export function ShelfClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Init the store once on mount. Idempotent: StrictMode double-invoke
    // and HMR re-runs are no-ops once the first one succeeds.
    useBookLibrary.getState().init(new LocalStorageAdapter());
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-foreground">Book Tracker</h1>
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
    </main>
  );
}
