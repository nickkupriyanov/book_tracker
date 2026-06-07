"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PageProgressQuickUpdate,
  ReadingBooksList,
} from "@/features/page-progress";
import { ReadingCalendar } from "@/features/reading-calendar";
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
 * tag controls) lives on /library. The home page
 * only renders:
 *  - a header with the app title and an **Open library** link;
 *  - a focused active-book progress panel (when there are
 *    reading books);
 *  - a compact reading lane for switching the active book;
 *  - the Reading Calendar as a home-page memory surface;
 *  - a no-reading empty state with an **Open library** link
 *    (when the library has books but none are reading).
 *
 * No shelf search, status tabs, tag filter, sort menu, or
 * clear-filter control appear here — those belong to /library.
 */
export function ShelfClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  const readingBooks = useMemo(
    () => books.filter((b) => b.status === "reading"),
    [books]
  );

  const activeBook =
    readingBooks.find((b) => b.id === activeBookId) ?? readingBooks[0];

  useEffect(() => {
    if (readingBooks.length === 0) {
      if (activeBookId !== null) setActiveBookId(null);
      return;
    }
    if (!readingBooks.some((b) => b.id === activeBookId)) {
      setActiveBookId(readingBooks[0]?.id ?? null);
    }
  }, [activeBookId, readingBooks]);

  return (
    <PageContainer>
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
          {readingBooks.length > 0 && (
            <div className="mb-8 flex justify-end">
              <Button
                asChild
                variant="outline"
                size="sm"
                data-testid="open-library-link"
              >
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8 lg:order-1">
            {readingBooks.length === 0 || activeBook === undefined ? (
              <div
                data-testid="home-no-reading"
                className="flex min-h-[32vh] flex-col items-center justify-center gap-3 text-center"
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
            ) : (
              <>
                <PageProgressQuickUpdate book={activeBook} />
                <ReadingBooksList
                  books={readingBooks}
                  activeBookId={activeBook.id}
                  onSelectBook={setActiveBookId}
                />
              </>
            )}
          </div>
          <div
            data-testid="home-calendar-rail"
            className="lg:order-2 lg:self-start lg:sticky lg:top-6"
          >
            <ReadingCalendar books={books} />
          </div>
        </div>
        </>
      )}
    </PageContainer>
  );
}
