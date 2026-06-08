# Tasks: Reader Profile Card

> **Status:** In Review
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Add reader profile model tests

- [x] **Files:** `tests/lib/reader-profile.test.ts`
- **Acceptance:** Tests cover read count, page totals, unique-date streaks,
  yesterday-as-active streaks, legacy `readingDays`, duplicate dates, and
  zero-activity output.
- **Notes:** Use an injected `now` date so streak tests are deterministic.

## T2. Implement reader profile model helper

- [x] **Files:** `src/lib/reader-profile.ts`
- **Acceptance:** Helper returns display-ready nickname, initials, status,
  read count, streak, and page total from `Book[]`.
- **Notes:** Ignore malformed optional legacy values defensively; do not use
  `any`.

## T3. Add profile card component tests

- [x] **Files:** `tests/features/reader-profile/ReaderProfileCard.test.tsx`
- **Acceptance:** Tests verify the card renders `Quiet Reader`, one muted
  status, and the labels `Read`, `Streak`, `Pages`.
- **Notes:** Keep this focused on render behavior; calculation coverage lives
  in helper tests.

## T4. Implement ReaderProfileCard UI

- [x] **Files:** `src/features/reader-profile/ReaderProfileCard.tsx`,
  `src/features/reader-profile/index.ts`
- **Acceptance:** Component renders the Bookmark warmth card with monogram
  avatar, cozy status copy, three stat columns, and a subtle decorative
  book/bookmark contour.
- **Notes:** Use existing Tailwind v4 tokens and shadcn rhythm; no new
  dependency and no glassmorphism.

## T5. Wire the card into the home rail

- [x] **Files:** `src/app/ShelfClient.tsx`, `tests/app/ShelfClient.test.tsx`
- **Acceptance:** Ready non-empty home renders the profile card above
  `ReadingCalendar`; loading, error, and empty-library states do not render
  it.
- **Notes:** Preserve the existing mobile/desktop rail order and all calendar
  behavior.

## T6. Polish and gates

- [x] **Files:** affected docs, implementation, and tests
- **Acceptance:** Re-read `spec.md`, confirm acceptance criteria are satisfied,
  run `npm run lint`, and run `npm run test`.
- **Notes:** Do not commit until the user explicitly approves after review.
