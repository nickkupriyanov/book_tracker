"use client";

import { useMemo } from "react";
import { buildReaderStats } from "@/lib/reader-stats";
import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";
import { PageContainer } from "@/components/PageContainer";
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
 * - `ready` + empty library — the shared `EmptyShelf`.
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
          <EmptyShelf />
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
