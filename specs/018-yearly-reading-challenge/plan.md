# Plan: Yearly Reading Challenge

> **Status:** In Review
> **Spec:** `./spec.md` (read this first)
> **Author:** Codex
> **Created:** 2026-06-08

---

## 1. Architecture summary

This feature adds a persisted current-year challenge setting alongside the
existing local-first book library. Books remain the source for completed
progress, while a small `AnnualReadingChallenge` setting stores only the
target. The UI renders a compact `YearlyChallengeCard` in the existing home
rail. Calculations stay in a pure helper so date filtering, progress, pace
copy, and edge cases can be tested without React.

## 2. Module / file layout

- `src/types/challenge.ts` - `AnnualReadingChallenge` and input type.
- `src/lib/yearly-reading-challenge.ts` - pure model builder and validation
  helpers for counting/progress.
- `src/storage/storage-adapter.ts` - challenge load/save method signatures.
- `src/storage/local-storage-adapter.ts` - localStorage implementation under a
  separate `book-tracker:` key.
- `src/state/book-library.ts` - challenge state, init loading, and save action.
- `src/features/yearly-challenge/YearlyChallengeCard.tsx` - right-rail UI.
- `src/features/yearly-challenge/index.ts` - feature export.
- `src/app/ShelfClient.tsx` - render the card between profile and calendar.
- `tests/lib/yearly-reading-challenge.test.ts` - pure model coverage.
- `tests/storage/local-storage-adapter.test.ts` - challenge persistence
  coverage.
- `tests/state/useBookLibrary.test.ts` - store init/save challenge coverage.
- `tests/features/yearly-challenge/YearlyChallengeCard.test.tsx` - UI behavior.
- `tests/app/ShelfClient.test.tsx` - placement and home state coverage.

## 3. Data flow

1. `RootClient` initializes `useBookLibrary` with `LocalStorageAdapter`.
2. Store init loads books and the current local year's challenge setting.
3. `ShelfClient` reads `books`, library `status`, challenge state, and the
   save action from the store.
4. In the ready non-empty home state, `ShelfClient` renders
   `YearlyChallengeCard` between `ReaderProfileCard` and `ReadingCalendar`.
5. The card derives display values from `books`, the saved challenge, and the
   current local year through the pure helper.
6. When the user saves a target, the card validates the input, calls the store
   save action, the adapter persists it, and the store updates the card.
7. On save failure, the card keeps the previous saved value and displays an
   inline error.

## 4. Component breakdown

- **YearlyChallengeCard**
  - **Props:** `books: Book[]`, `challenge: AnnualReadingChallenge | null`,
    `isSaving: boolean`, `error: string | null`,
    `onSaveTarget(targetBooks: number): Promise<void>`, optional `now?: Date`.
  - **State:** local draft target string, validation message, edit/setup mode.
  - **Behavior:** renders setup, progress, validation, save failure, remaining,
    pace, and completed states.
  - **Tests:** setup render, valid save, invalid input, partial progress,
    completed progress, exceeded target, and save failure.

- **Challenge model helper**
  - **Input:** `Book[]`, `AnnualReadingChallenge | null`, optional `now`.
  - **Output:** current year, completed count, target, progress percent,
    remaining count, completion state, pace label, and undated-read count.
  - **Behavior:** counts only `read` books with valid `finishedAt` in the
    current local year and caps visual progress at 100%.
  - **Tests:** current-year filtering, previous/future years, invalid dates,
    missing `finishedAt`, status mismatches, no target, met/exceeded target,
    and pace copy.

## 5. Storage adapter changes

Add challenge methods to `StorageAdapter`:

```ts
getAnnualReadingChallenge(year: number): Promise<AnnualReadingChallenge | null>;
saveAnnualReadingChallenge(
  input: Omit<AnnualReadingChallenge, "updatedAt">
): Promise<AnnualReadingChallenge>;
```

`LocalStorageAdapter` stores challenge settings separately from books, keyed by
year. It returns `null` for missing, corrupt, or malformed stored challenge
data. `saveAnnualReadingChallenge` stamps `updatedAt` with the current ISO
timestamp and persists the target without mutating books.

## 6. Decisions & trade-offs

- Chose a persisted target over a fixed constant because the user explicitly
  wants a real configurable annual challenge.
- Chose current-year only over year switching to keep the MVP small and avoid
  archive UI.
- Chose `status === "read"` plus valid current-year `finishedAt` because it is
  the most honest yearly count in the existing data model.
- Chose not to count read books without `finishedAt` because guessing the year
  would make progress misleading.
- Chose inline editing over a dialog because the right-rail card is compact
  and the setting has only one field.
- Chose soft pace copy over exact deltas to respect the cozy, non-dashboard UI
  principle.

## 7. Risks

- Store init now loads two localStorage-backed resources; failures should not
  leave partial UI in a confusing state.
- The storage interface grows for a user setting rather than a book entity; the
  method names should stay narrow to avoid creating a generic settings system
  too early.
- Date logic can drift around local year boundaries; tests should inject `now`
  and use local `YYYY-MM-DD` parsing.
- Inline editing in a narrow rail can get cramped; use compact controls and
  keep copy short.
- Users with many old `read` books missing `finishedAt` may see lower progress
  than expected; optional helper copy can explain that finish dates are needed.

## 8. Rollout

- Behind a flag? No.
- Migration needed? No. Existing books remain unchanged and missing challenge
  storage means no saved goal.
- Manual QA steps:
  - Visit `/` with a non-empty library and no saved challenge; verify setup
    state appears between profile and calendar.
  - Save a valid target and reload; verify the target persists.
  - Try invalid targets: empty, `0`, negative, decimal, and letters.
  - Seed books across statuses and finish years; verify only current-year
    `read` books count.
  - Verify read books without `finishedAt` do not count.
  - Verify met and exceeded goals show completed state and capped progress.
  - Simulate storage save failure and verify accessible error copy appears.
  - Check mobile and desktop widths for overlap and right-rail order.
  - Run `npm run lint`.
  - Run `npm run test`.
