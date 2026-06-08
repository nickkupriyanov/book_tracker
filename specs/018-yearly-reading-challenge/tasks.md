# Tasks: Yearly Reading Challenge

> **Status:** In Review
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Add challenge domain type

- **Files:** `src/types/challenge.ts`
- **Acceptance:** Type exports define `AnnualReadingChallenge` and the save
  input without using `any`.
- **Notes:** Keep this separate from `Book`; no book schema migration.

## T2. Add pure challenge model tests

- **Files:** `tests/lib/yearly-reading-challenge.test.ts`
- **Acceptance:** Tests cover no target, valid current-year reads, previous and
  future years, missing/invalid `finishedAt`, status mismatches, partial
  progress, met/exceeded target, capped progress, remaining count, and pace
  labels.
- **Notes:** Inject `now` for deterministic local-year tests.

## T3. Implement challenge model helper

- **Files:** `src/lib/yearly-reading-challenge.ts`
- **Acceptance:** Helper returns display-ready challenge model from `Book[]`,
  optional challenge settings, and injected/current `now`.
- **Notes:** Parse local `YYYY-MM-DD` dates defensively; do not mutate books.

## T4. Extend storage adapter tests

- **Files:** `tests/storage/local-storage-adapter.test.ts`
- **Acceptance:** Tests cover missing challenge, saving/loading by year,
  separate book/challenge storage, malformed challenge storage returning
  `null`, and save failure behavior where feasible.
- **Notes:** Keep challenge storage under a separate `book-tracker:` key.

## T5. Implement storage adapter challenge methods

- **Files:** `src/storage/storage-adapter.ts`,
  `src/storage/local-storage-adapter.ts`
- **Acceptance:** `StorageAdapter` exposes challenge load/save methods and
  `LocalStorageAdapter` persists current-year targets with `updatedAt`.
- **Notes:** Treat corrupt challenge storage as no saved challenge.

## T6. Extend store tests

- **Files:** `tests/state/useBookLibrary.test.ts`
- **Acceptance:** Tests cover init loading current-year challenge, save action
  updating challenge state, save errors preserving prior state, and no
  regressions to book load/add/update/delete.
- **Notes:** Keep adapter reference private and avoid exposing persistence
  details to components.

## T7. Implement store challenge state

- **Files:** `src/state/book-library.ts`
- **Acceptance:** Store exposes current challenge, challenge save status/error,
  and an async action to save the current-year target through the adapter.
- **Notes:** Derive current year locally during init/save; no year switcher.

## T8. Add challenge card component tests

- **Files:** `tests/features/yearly-challenge/YearlyChallengeCard.test.tsx`
- **Acceptance:** Tests cover setup state, valid target save, invalid target
  validation, partial progress, completed/exceeded progress, pace copy, and
  save error rendering.
- **Notes:** Calculation details stay in helper tests.

## T9. Implement YearlyChallengeCard UI

- **Files:** `src/features/yearly-challenge/YearlyChallengeCard.tsx`,
  `src/features/yearly-challenge/index.ts`
- **Acceptance:** Component renders the cozy library-slip card with inline
  target editing, progress, remaining/completed copy, soft pace label,
  validation state, saving state, and accessible error output.
- **Notes:** Use existing shadcn/ui controls and Tailwind tokens; no
  glassmorphism and no new dependency.

## T10. Wire the card into the home rail

- **Files:** `src/app/ShelfClient.tsx`, `tests/app/ShelfClient.test.tsx`
- **Acceptance:** Ready non-empty home renders reader profile, yearly
  challenge, and Reading Calendar in that order; loading, error, and
  empty-library states do not render the card.
- **Notes:** Preserve existing page-progress, no-reading, and calendar
  behavior.

## T11. Polish and gates

- **Files:** affected spec, plan, tasks, implementation, and tests
- **Acceptance:** Re-read `spec.md`, confirm acceptance criteria are satisfied,
  verify mobile/desktop layout manually, run `npm run lint`, and run
  `npm run test`.
- **Notes:** Do not commit until the user explicitly approves after review.
