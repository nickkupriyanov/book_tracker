"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AddBookDialog } from "@/features/add-book";
import {
  PageProgressQuickUpdate,
  ReadingBooksList,
} from "@/features/page-progress";
import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

/**
 * The focused home page (spec 015). The store is initialised
 * by `RootClient` in the root layout, so this component just
 * reads the store and renders the appropriate state (loading
 * / empty / no-reading / reading-ready). No useEffect for
 * init here.
 *
 * The home page is a daily-habit surface for "what am I
 * reading now?" — the full shelf (search, filters, sort,
 * tag controls, calendar) lives on /library. The home page
 * only renders:
 *  - a header with the app title and an **Open library** link;
 *  - a compact quick page update block (when there are
 *    reading books);
 *  - the reading-only book list (when there are reading
 *    books);
 *  - a no-reading empty state with an **Open library** link
 *    (when the library has books but none are reading).
 *
 * No shelf search, status tabs, tag filter, sort menu, or
 * clear-filter control appear here — those belong to /library.
 */
export function ShelfClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const [dialogOpen, setDialogOpen] = useState(false);

  const readingBooks = useMemo(
    () => books.filter((b) => b.status === "reading"),
    [books]
  );

  return (
    <PageContainer>
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-foreground">Book Tracker</h1>
        {status === "ready" && (
          <Button
            asChild
            variant="outline"
            size="sm"
            data-testid="open-library-link"
          >
            <Link href="/library" className="inline-flex items-center gap-1">
              Open library
              <ArrowRight className="size-4" />
            </Link>
          </Button>
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

      {status === "ready" && books.length > 0 && readingBooks.length === 0 && (
        <div
          data-testid="home-no-reading"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
        >
          <p className="font-serif text-xl text-foreground">
            No books in progress
          </p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Nothing in your shelf is marked as reading. Browse your
            library to start a book again.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link
              href="/library"
              className="inline-flex items-center gap-1"
            >
              Open library
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}

      {status === "ready" && readingBooks.length > 0 && (
        <div className="space-y-8">
          <PageProgressQuickUpdate books={readingBooks} />
          <ReadingBooksList books={readingBooks} />
        </div>
      )}

      <AddBookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  );
}
