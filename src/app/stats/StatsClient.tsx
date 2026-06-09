"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { buildReaderStats } from "@/lib/reader-stats";
import { useBookLibrary } from "@/state/book-library";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { AddBookDialog } from "@/features/add-book";
import { HeroPortrait } from "@/features/stats/HeroPortrait";
import { FavoriteTagsSection } from "@/features/stats/FavoriteTagsSection";
import { TopRatedSection } from "@/features/stats/TopRatedSection";
import { ReadingRhythmSection } from "@/features/stats/ReadingRhythmSection";
import { ShelfBalanceSection } from "@/features/stats/ShelfBalanceSection";

export interface StatsClientProps {
  /**
   * Optional "now" injected for tests. Production callers
   * should leave this unset so the streak anchors to real
   * local time.
   */
  now?: Date;
}

/**
 * The /stats route (spec 021). The store is initialised by
 * `RootClient` in the root layout, so this component just
 * reads the store and renders the appropriate state.
 *
 * States (T2):
 * - `loading` — quiet loading message inside the page container.
 * - `error` — friendly inline error.
 * - `ready` + empty library — a stats-specific empty portrait.
 * - `ready` + books — the Reader Portrait (T3): hero, favorite
 *   tags, top-rated, reading rhythm, shelf balance.
 */
export function StatsClient({ now }: StatsClientProps = {}) {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);

  const stats = useMemo(
    () => buildReaderStats(books, now ? { now } : {}),
    [books, now]
  );

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
          <StatsEmptyState />
        </div>
      )}

      {status === "ready" && books.length > 0 && (
        <div
          data-testid="stats-portrait"
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <HeroPortrait hero={stats.hero} />
          </div>
          <FavoriteTagsSection tags={stats.favoriteTags} />
          <TopRatedSection books={stats.topRated} />
          <ReadingRhythmSection rhythm={stats.rhythm} />
          <ShelfBalanceSection shelf={stats.shelf} />
        </div>
      )}
    </PageContainer>
  );
}

function StatsEmptyState() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div
        aria-hidden
        className="bg-muted flex size-20 items-center justify-center rounded-full"
      >
        <BookOpen className="text-muted-foreground size-9" />
      </div>

      <h2 className="font-serif text-2xl text-foreground">
        Your reader portrait is waiting
      </h2>

      <p className="text-muted-foreground max-w-sm text-sm">
        Add your first book and this page will begin filling with reading
        statistics, favorite tags, ratings, and shelf balance.
      </p>

      <Button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="add-first-book-button"
        className="mt-2"
      >
        Add your first book
      </Button>

      <AddBookDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
