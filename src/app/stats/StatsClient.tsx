"use client";

import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";
import { PageContainer } from "@/components/PageContainer";

/**
 * The /stats route (spec 021). The store is initialised by
 * `RootClient` in the root layout, so this component just
 * reads the store and renders the appropriate state.
 *
 * States (T2):
 * - `loading` — quiet loading message inside the page container.
 * - `error` — friendly inline error.
 * - `ready` + empty library — the shared `EmptyShelf`.
 * - `ready` + books — a portrait wrapper slot. The actual
 *   five-zone Reader Portrait is composed in T3.
 */
export function StatsClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Statistics</h1>
      </header>

      {status === "loading" && (
        <p
          data-testid="stats-loading"
          className="text-muted-foreground"
        >
          Loading your library…
        </p>
      )}

      {status === "error" && (
        <p
          data-testid="stats-error"
          className="text-destructive"
          role="alert"
        >
          Couldn&apos;t load your library. Try reloading the page.
        </p>
      )}

      {status === "ready" && books.length === 0 && (
        <div data-testid="stats-empty">
          <EmptyShelf />
        </div>
      )}

      {status === "ready" && books.length > 0 && (
        <div
          data-testid="stats-portrait"
          className="grid gap-6 md:grid-cols-2"
        />
      )}
    </PageContainer>
  );
}
