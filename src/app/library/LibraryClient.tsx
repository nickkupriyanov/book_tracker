"use client";

import { ShelfList } from "@/features/shelf-list";
import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";
import { PageContainer } from "@/components/PageContainer";

/**
 * The /library full-shelf route (spec 015 → spec 016, spec 020
 * §5.4). The store is initialised by `RootClient` in the root
 * layout, so this component just reads the store and renders
 * the appropriate state (loading / empty / list / error). No
 * useEffect for init here.
 *
 * The library page is the "everything else" surface: the full
 * ShelfList (search, status tabs, sort, tags, clear filters,
 * add/edit/delete). The Reading Calendar lives only on the
 * home page (spec 016). The page-local "Add book" button was
 * removed in spec 020 FR-12 because the global header now
 * hosts the add-book CTA; the empty shelf still offers its
 * own "Add your first book" affordance.
 */
export function LibraryClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Your library</h1>
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
    </PageContainer>
  );
}
