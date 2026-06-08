# Spec: Yearly Reading Challenge

> **Status:** In Review
> **Author:** Codex
> **Created:** 2026-06-08
> **Spec ID:** 018-yearly-reading-challenge
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

The home page right rail already makes reading history feel visible through
the reader profile and Reading Calendar, but it does not give the reader a
simple annual goal to return to. The user wants a cozy yearly challenge card
in the right rail that tracks progress toward a configurable book goal without
turning the app into a cold analytics dashboard.

## 2. Goal

Add a warm, compact right-rail yearly reading challenge card for the current
local year, with an inline editable target and progress derived from completed
books.

## 3. Non-goals

- Do not add backend storage, auth, accounts, sync, or multi-device behavior.
- Do not add social challenge sharing, friends, leaderboards, badges, or
  public profiles.
- Do not add year switching, challenge archives, or historical goal editing.
- Do not count pages, reading days, streaks, or percentages as separate
  challenge targets.
- Do not redesign the home page, reader profile card, Reading Calendar, or
  library page.
- Do not auto-fill missing finish dates or mutate books when rendering the
  challenge.

## 4. Users & scenarios

This is for the single local MVP reader who opens the home page and wants a
gentle sense of progress through the year.

- As a reader starting a yearly challenge, the user can set a target number of
  books directly in the right rail and see the card become active.
- As a returning reader, the user sees how many books they finished this year,
  how many remain, and a soft sense of pace.
- As a reader who already met the goal, the user sees a calm completed state
  and can still adjust the target.
- As a reader with old or incomplete records, books marked `read` without a
  finish date are not counted toward the year, so the progress remains honest.

## 5. UX

The card should feel like a warm library slip or annual bookmark, not a KPI
tile. It lives in the existing home right rail with compact spacing, soft
paper/card tones, a serif heading, and a clear but quiet progress bar.

Placement:

- Desktop: in the right rail, recommended order is reader profile, challenge,
  Reading Calendar.
- Mobile: in the same vertical rail flow before the calendar, without
  overlapping or pushing controls into cramped layouts.

Key states:

- Loading/error/empty-library home states: do not render the challenge card.
- No saved goal for the current year: show setup state with compact numeric
  target input and save button.
- Saved goal with zero progress: show `0 / target`, an encouraging empty
  message, and editable target control.
- Partial progress: show completed count, target count, progress bar, remaining
  books, and soft pace copy.
- Goal met or exceeded: show completed copy while keeping the target editable.
- Invalid input: show an accessible inline validation message and do not save.
- Save failure: keep the last saved target visible and show an accessible
  inline error.

All visible copy remains English to match the current app UI.

## 6. Functional requirements

- FR-1. In the ready non-empty home state, the app renders a yearly reading
  challenge card in the home right rail.
- FR-2. The card uses the user's current local calendar year as the challenge
  year.
- FR-3. The card lets the user set a positive whole-number target for the
  current year inline inside the card.
- FR-4. The card persists the current year's target through the storage
  abstraction, not by reading or writing `localStorage` directly from UI code.
- FR-5. The card displays completed books for the current year by counting
  books where `status === "read"` and `finishedAt` is a valid `YYYY-MM-DD`
  date in the current local year.
- FR-6. Books with `status === "read"` and no valid `finishedAt` are not
  counted toward the challenge.
- FR-7. Books with `finishedAt` in the current year but status other than
  `read` are not counted toward the challenge.
- FR-8. The card displays progress as `completed / target` once a target is
  saved.
- FR-9. The card displays a progress bar capped visually at 100% even when the
  completed count exceeds the target.
- FR-10. The card displays remaining books when progress is below target.
- FR-11. The card displays a calm completed state when `completed >= target`.
- FR-12. The card displays soft pace copy such as `Ahead of pace`, `On pace`,
  or `A little behind`, without exact dashboard-style deltas.
- FR-13. The target input accepts only positive whole numbers and rejects
  empty, non-numeric, decimal, negative, or zero values.
- FR-14. When saving the target fails, the UI keeps the last saved target and
  exposes an accessible error message.
- FR-15. The card does not render during loading, error, or empty-library home
  states.
- FR-16. The feature does not change add, edit, delete, reading progress,
  reading log, reader profile, or calendar behavior.
- FR-17. The card remains readable and non-overlapping on mobile and desktop
  widths.

## 7. Data

The feature reads existing `Book` values from `src/types/book.ts`, especially:

- `status`
- `finishedAt`

Add a small challenge settings type outside the `Book` entity:

```ts
export interface AnnualReadingChallenge {
  year: number;
  targetBooks: number;
  updatedAt: string;
}
```

`targetBooks` is a positive whole number. The MVP stores one setting per year
locally through the storage adapter. No existing `Book` records are migrated or
changed.

## 8. Storage interface

This feature requires new `StorageAdapter` methods:

```ts
getAnnualReadingChallenge(year: number): Promise<AnnualReadingChallenge | null>;
saveAnnualReadingChallenge(
  input: Omit<AnnualReadingChallenge, "updatedAt">
): Promise<AnnualReadingChallenge>;
```

`LocalStorageAdapter` stores challenge settings under a separate
`book-tracker:` key from books so book data remains unchanged. Corrupt or
malformed challenge storage is treated as no saved challenge.

## 9. Edge cases & errors

- No saved target for the current year: show setup form, not an error.
- Target input is empty, `0`, negative, decimal, or non-numeric: show inline
  validation and do not call save.
- Target is lower than already completed books: save is allowed and the card
  shows the goal as completed/exceeded.
- Completed count exceeds target: progress bar remains visually capped at
  100%.
- `finishedAt` is missing, malformed, impossible, or outside the current year:
  the book does not count.
- `finishedAt` is in the current year but status is not `read`: the book does
  not count.
- LocalStorage is full, disabled, or throws during save: keep prior state and
  show an accessible error.
- Corrupt challenge storage: treat as no saved challenge and allow the user to
  save a new target.
- Year changes while the app is open: the helper derives from the injected or
  current `now`; a page refresh or store init loads the current year's setting.

## 10. Acceptance criteria

- [ ] Ready non-empty home page renders the challenge card in the right rail.
- [ ] The card appears between the reader profile and Reading Calendar.
- [ ] With no saved current-year target, the card shows an inline setup state.
- [ ] Saving a valid target persists it and re-renders progress.
- [ ] Invalid targets show an inline accessible validation error and are not
  saved.
- [ ] Completed count includes only `read` books finished in the current local
  year.
- [ ] Read books without valid `finishedAt` are not counted.
- [ ] Books finished this year but not marked `read` are not counted.
- [ ] Progress displays `completed / target`, remaining books below target,
  and completed copy at or above target.
- [ ] Progress bar is visually capped at 100%.
- [ ] Soft pace copy appears without precise dashboard deltas.
- [ ] Save failures preserve the last saved target and show an accessible
  error.
- [ ] Loading, error, and empty-library states do not render the card.
- [ ] Existing profile, calendar, library, and page-progress behavior is
  unchanged.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.

## 11. Out of scope (for this spec)

- Multiple simultaneous challenges.
- Challenge archive pages or year switching.
- Monthly goals or page goals.
- Sharing, exports, social features, notifications, or reminders.
- Backend persistence or migration work.
- Automatic cleanup or backfilling of missing finish dates.

## 12. Open questions

None. The approved direction is a configurable current-year book goal, edited
inline in a cozy right-rail card, counting only books marked `read` with a
valid `finishedAt` date in the current local year.
