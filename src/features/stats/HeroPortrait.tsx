"use client";

import type { ReaderStatsHero } from "@/lib/reader-stats";

export interface HeroPortraitProps {
  hero: ReaderStatsHero;
}

/**
 * The top hero section of the Reader Portrait. Five quiet
 * facts: read count, logged pages, average rating, current
 * streak, and the top tag. Empty cells render gentle prompts
 * (FR-3, FR-11). Copy is in English (FR-12).
 */
export function HeroPortrait({ hero }: HeroPortraitProps) {
  return (
    <section
      aria-label="Reader portrait"
      data-testid="stats-hero"
      className="rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
    >
      <h2 className="font-serif text-lg text-foreground">Your reading portrait</h2>
      <p
        data-testid="stats-hero-subtitle"
        className="text-muted-foreground mt-1 text-sm"
      >
        {heroSummary(hero)}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <HeroMetric
          label="Read"
          testId="stats-hero-read"
          primary={String(hero.readCount)}
          empty={hero.readCount === 0}
        />
        <HeroMetric
          label="Pages"
          testId="stats-hero-pages"
          primary={String(hero.loggedPages)}
          empty={hero.loggedPages === 0}
        />
        <HeroMetric
          label="Avg. rating"
          testId="stats-hero-avg-rating"
          primary={hero.averageRating !== null ? hero.averageRating.toFixed(1) : "—"}
          empty={hero.averageRating === null}
        />
        <HeroMetric
          label="Streak"
          testId="stats-hero-streak"
          primary={String(hero.streakDays)}
          suffix={hero.streakDays === 1 ? "day" : "days"}
          empty={hero.streakDays === 0}
        />
        <HeroMetric
          label="Top tag"
          testId="stats-hero-top-tag"
          primary={hero.topTag ?? "—"}
          empty={hero.topTag === null}
        />
      </dl>

      {hero.hasSparseData && (
        <p
          data-testid="stats-hero-prompt"
          className="text-muted-foreground mt-4 text-xs italic"
        >
          Rate a few books and add tags to enrich this portrait.
        </p>
      )}
    </section>
  );
}

interface HeroMetricProps {
  label: string;
  testId: string;
  primary: string;
  suffix?: string;
  empty: boolean;
}

function HeroMetric({ label, testId, primary, suffix, empty }: HeroMetricProps) {
  return (
    <div className="flex flex-col text-center">
      <dt className="text-muted-foreground order-2 mt-1 text-xs">{label}</dt>
      <dd
        data-testid={testId}
        className="order-1 font-serif text-2xl leading-none tabular-nums text-foreground"
      >
        {primary}
        {suffix !== undefined && !empty && (
          <span className="text-muted-foreground ml-1 align-baseline text-xs font-sans">
            {suffix}
          </span>
        )}
      </dd>
    </div>
  );
}

function heroSummary(hero: ReaderStatsHero): string {
  if (hero.readCount === 0 && hero.loggedPages === 0) {
    return "A quiet shelf — your portrait will fill out as you read.";
  }
  if (hero.topTag !== null) {
    return `Lately, ${hero.topTag} keeps finding its way onto your shelf.`;
  }
  if (hero.readCount > 0) {
    return `${hero.readCount} ${hero.readCount === 1 ? "book" : "books"} finished, and a few more in progress.`;
  }
  return "A few pages turned; the picture is starting to form.";
}
