"use client";

import type { ReactNode } from "react";
import type { ReaderStatsRhythm } from "@/lib/reader-stats";

export interface ReadingRhythmSectionProps {
  rhythm: ReaderStatsRhythm;
}

/**
 * The reading-rhythm section of the Reader Portrait. Covers
 * the current streak, the number of active days, the total
 * logged pages, and the best day. When only legacy
 * `readingDays` exist (no `readingLogs.pagesRead`), the
 * page-based facts are replaced with gentle empty copy
 * (FR-7, FR-8, FR-9).
 */
export function ReadingRhythmSection({ rhythm }: ReadingRhythmSectionProps) {
  return (
    <section
      aria-label="Reading rhythm"
      data-testid="stats-rhythm"
      className="rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg text-foreground">Reading rhythm</h2>
        <span
          data-testid="stats-rhythm-streak"
          className="text-foreground font-serif text-base tabular-nums"
        >
          {rhythm.streakDays}
          <span className="text-muted-foreground ml-1 align-baseline text-xs font-sans">
            {rhythm.streakDays === 1 ? "day streak" : "day streak"}
          </span>
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <RhythmFact
          label="Active days"
          testId="stats-rhythm-active-days"
          primary={String(rhythm.activeDays)}
          empty={rhythm.activeDays === 0}
        />
        <RhythmFact
          label="Pages logged"
          testId="stats-rhythm-pages"
          primary={String(rhythm.loggedPages)}
          empty={rhythm.loggedPages === 0}
          emptyHint={
            rhythm.hasLegacyDaysOnly
              ? "Log a few pages and the page count appears here."
              : "Log pages as you read to see this fill in."
          }
        />
        <RhythmFact
          label="Best day"
          testId="stats-rhythm-best-day"
          primary={bestDayLabel(rhythm)}
          empty={rhythm.bestDay === null}
          emptyHint={
            rhythm.hasLegacyDaysOnly
              ? "Page totals are hidden until you log reading sessions."
              : "Your most-read day will land here."
          }
          wide
        />
      </dl>
    </section>
  );
}

interface RhythmFactProps {
  label: string;
  testId: string;
  primary: ReactNode;
  empty: boolean;
  emptyHint?: string;
  wide?: boolean;
}

function RhythmFact({
  label,
  testId,
  primary,
  empty,
  emptyHint,
  wide = false,
}: RhythmFactProps) {
  return (
    <div
      className={
        wide
          ? "bg-muted/40 rounded-lg border border-border/60 px-3 py-2 sm:col-span-2"
          : "bg-muted/40 rounded-lg border border-border/60 px-3 py-2"
      }
    >
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        data-testid={testId}
        className={
          empty
            ? "text-muted-foreground mt-1 text-sm italic"
            : "text-foreground mt-1 font-serif text-base tabular-nums"
        }
      >
        {empty && emptyHint !== undefined ? emptyHint : primary}
      </dd>
    </div>
  );
}

function bestDayLabel(rhythm: ReaderStatsRhythm): ReactNode {
  if (rhythm.bestDay === null) return "—";
  const { date, pagesRead } = rhythm.bestDay;
  return (
    <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
      <span>{date}</span>
      <span className="text-muted-foreground text-xs font-sans">
        {pagesRead} {pagesRead === 1 ? "page" : "pages"}
      </span>
    </span>
  );
}
