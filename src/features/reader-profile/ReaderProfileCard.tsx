"use client";

import { useMemo } from "react";
import { buildReaderProfile } from "@/lib/reader-profile";
import type { Book } from "@/types/book";

export interface ReaderProfileCardProps {
  /** Current library — same `Book[]` rendered by the home rail. */
  books: Book[];
  /**
   * Optional "now" injected for tests. Production should leave
   * this unset so the streak anchors to real local time.
   */
  now?: Date;
}

/**
 * Cozy auto-generated reader profile card (spec 017). Visual
 * direction is **Bookmark warmth** — paper tones, soft borders,
 * generous spacing, a monogram avatar, a muted role-style status,
 * and three quiet stats: Read, Streak, Pages.
 *
 * The card derives everything from `books` via the pure profile
 * helper. It does not persist anything, does not talk to the
 * store, and does not change the library.
 */
export function ReaderProfileCard({ books, now }: ReaderProfileCardProps) {
  const profile = useMemo(
    () => buildReaderProfile(books, now ? { now } : {}),
    [books, now]
  );

  return (
    <section
      aria-label="Reader profile"
      data-testid="reader-profile-card"
      className="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-4 text-card-foreground shadow-sm"
    >
      <BookmarkContour />

      <div className="relative flex items-center gap-3">
        <div
          aria-hidden
          data-testid="reader-profile-monogram"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-serif text-base text-primary-foreground"
        >
          {profile.initials}
        </div>
        <div className="min-w-0">
          <p
            className="font-serif text-base leading-tight text-foreground"
            data-testid="reader-profile-nickname"
          >
            {profile.nickname}
          </p>
          <p
            data-testid="reader-profile-status"
            className="text-muted-foreground text-xs leading-tight"
          >
            {profile.status}
          </p>
        </div>
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        <ProfileStat
          label="Read"
          value={profile.readCount}
          testId="reader-profile-stat-read"
        />
        <ProfileStat
          label="Streak"
          value={profile.streakDays}
          testId="reader-profile-stat-streak"
        />
        <ProfileStat
          label="Pages"
          value={profile.totalPages}
          testId="reader-profile-stat-pages"
        />
      </dl>
    </section>
  );
}

interface ProfileStatProps {
  label: string;
  value: number;
  testId: string;
}

function ProfileStat({ label, value, testId }: ProfileStatProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <dt className="text-muted-foreground order-2 mt-1 text-xs">{label}</dt>
      <dd
        data-testid={testId}
        className="order-1 font-serif text-xl leading-none text-foreground tabular-nums"
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A subtle library-slip ribbon tucked behind the card. Decorative
 * only — `aria-hidden` keeps it out of the accessibility tree, and
 * `pointer-events-none` keeps it from intercepting clicks. Low
 * opacity so it reads as paper texture, not a graphic.
 *
 * Position is offset inward from the top-right corner (spec 020
 * FR-6) so the contour reads as tucked into the card rather than
 * hanging off its right edge.
 */
function BookmarkContour() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 80"
      className="pointer-events-none absolute -top-1 right-3 h-20 w-10 text-primary/15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 2h28v68l-14-10-14 10z" />
    </svg>
  );
}
