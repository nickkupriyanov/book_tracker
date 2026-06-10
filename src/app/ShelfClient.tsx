"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  PageProgressQuickUpdate,
  ReadingBooksList,
} from "@/features/page-progress";
import { ReadingCalendar } from "@/features/reading-calendar";
import { ReaderProfileCard } from "@/features/reader-profile";
import { YearlyChallengeCard } from "@/features/yearly-challenge";
import { AchievementsPreview } from "@/features/achievements";
import { useBookLibrary } from "@/state/book-library";
import { EmptyShelf } from "@/components/EmptyShelf";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

/**
 * The focused home page (spec 015, spec 020 §5.2). The store
 * is initialised by `RootClient` in the root layout, so this
 * component just reads the store and renders the appropriate
 * state (loading / empty / no-reading / reading-ready). No
 * useEffect for init here.
 *
 * The home page is a daily-habit surface for "what am I
 * reading now?" — the full shelf (search, filters, sort,
 * tag controls) lives on /library. The home page only
 * renders:
 *  - the focused active-book progress panel (when there are
 *    reading books);
 *  - a compact reading lane for switching the active book;
 *  - a no-reading empty state with informational copy
 *    (when the library has books but none are reading);
 *  - a yearly reading challenge card in the right rail
 *    (spec 018) — between the reader profile and the
 *    Reading Calendar — when the library is non-empty and
 *    the store is in the ready state.
 *
 * No shelf search, status tabs, tag filter, sort menu, or
 * clear-filter control appear here — those belong to
 * /library. No "Open library" CTA either (spec 020 FR-4 /
 * FR-5): the header already has navigation, so a duplicate
 * CTA on the home page is removed. Adding a book is still
 * reachable globally via the header's "Add book"
 * button.
 */
export function ShelfClient() {
  const status = useBookLibrary((s) => s.status);
  const books = useBookLibrary((s) => s.books);
  const challenge = useBookLibrary((s) => s.challenge);
  const isSavingChallenge = useBookLibrary((s) => s.isSavingChallenge);
  const challengeError = useBookLibrary((s) => s.challengeError);
  const saveChallenge = useBookLibrary((s) => s.saveChallenge);
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

  const handleSaveTarget = useCallback(
    async (targetBooks: number) => {
      await saveChallenge({
        year: new Date().getFullYear(),
        targetBooks,
      });
    },
    [saveChallenge]
  );

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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div
            data-testid="home-rail"
            className="contents lg:order-2 lg:col-start-2 lg:row-start-1 lg:block lg:self-start lg:sticky lg:top-6 lg:space-y-6"
          >
            <div data-testid="home-profile-slot" className="order-1">
              <ReaderProfileCard books={books} />
            </div>
            <div
              data-testid="home-achievements-slot"
              className="order-2"
            >
              <AchievementsPreview />
            </div>
            <div
              data-testid="home-calendar-rail"
              className="contents lg:block lg:space-y-6"
            >
              <div className="order-3">
                <YearlyChallengeCard
                  books={books}
                  challenge={challenge}
                  isSaving={isSavingChallenge}
                  error={challengeError}
                  onSaveTarget={handleSaveTarget}
                />
              </div>
              <div className="order-4">
                <ReadingCalendar books={books} />
              </div>
            </div>
          </div>
          <div className="order-2 space-y-6 lg:order-1 lg:col-start-1 lg:row-start-1 lg:space-y-8">
            {readingBooks.length === 0 || activeBook === undefined ? (
              <div
                data-testid="home-no-reading"
                className="flex min-h-[32vh] flex-col items-center justify-center gap-3 text-center"
              >
                <p className="font-serif text-xl text-foreground">
                  No books in progress
                </p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Nothing in your shelf is marked as reading. Open the
                  library to mark one as reading, or add a new one.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-1">
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
        </div>
      )}
    </PageContainer>
  );
}
