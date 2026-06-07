"use client";

import { useState } from "react";
import { AddBookButton, AddBookDialog } from "@/features/add-book";
import { ShelfList } from "@/features/shelf-list";
import { ReadingCalendar } from "@/features/reading-calendar";
import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";

/**
 * The shelf page. The store is initialised by `RootClient` in
 * the root layout, so this component just reads the store and
 * renders the appropriate state (loading / empty / list /
 * error). No useEffect for init here.
 *
 * When the library is ready and has at least one book, the
 * Reading Calendar is rendered above the shelf (spec 013
 * §6.1 / FR-10). The calendar is display-only — editing
 * happens on the book detail page.
 */
export function ShelfClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main
      className="mx-auto max-w-3xl px-4 py-8"
      data-testid="page-container"
    >
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
        <>
          <div data-testid="home-calendar-rail">
            <ReadingCalendar books={books} />
          </div>
          <div data-testid="home-shelf-area">
            <ShelfList books={books} />
          </div>
        </>
      )}

      <AddBookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </main>
  );
}
