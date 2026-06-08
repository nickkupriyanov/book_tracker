# Tasks: Reading Progress Widget

> **Status:** Draft
> **Spec:** `./spec.md`
> **Plan:** `./plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when its
acceptance line is satisfied and `npm run lint && npm run test` passes.

---

## T1. Create and verify rendering model helpers

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`
- **Acceptance:** The component derives percent, pages-left, progress text,
  today-pages text, and quick-action target pages without changing persisted
  behavior.
- **Notes:** Keep helpers local unless extraction clearly improves readability.
- **Status:** [x] Done — extracted `calculatePercent`,
  `calculateQuickActionTarget`, `calculatePagesLeft`, and
  `calculateTodayPagesRead` as top-level pure functions. Persisted behaviour
  unchanged. Remaining helpers added in T2/T4/T6 alongside the JSX that
  consumes them (keeps lint clean between tasks).

## T2. Redesign visual layout

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`
- **Acceptance:** `Where are you?` presents cover/title/author, secondary
  right-side `Open book`, progress-first summary, and bookmark-like progress
  line on desktop and mobile without overlap.
- **Notes:** Keep the existing warm palette and avoid dashboard-like stat cards.
- **Status:** [x] Done — book summary now stacks on mobile and lays
  cover/title/author next to an `outline` "Open book" button on wider
  viewports; the progress summary is its own block above the controls and
  hosts the `Reading progress` label, page fraction, `N% completed`, and a
  `h-1` bookmark-like progress line. The add-total prompt is preserved when
  `totalPages` is missing.

## T3. Rename typed-save CTA and preserve behavior

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** The submit button reads `Update progress`, and existing typed
  save validation, storage failure, draft retention, and reading-log delta tests
  still pass.
- **Notes:** Reuse the current typed save path.
- **Status:** [x] Done — CTA label changed; typed save still flows through
  the same validator/store path. Added an explicit test for the label in T7.

## T4. Implement instant `+10 pages` and `+25 pages`

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Clicking each quick action immediately saves the next page,
  creates/aggregates positive reading-log deltas, treats missing `currentPage`
  as `0`, and caps at `totalPages` when present.
- **Notes:** Disable quick actions while a save is in flight.
- **Status:** [x] Done — extracted `persistCurrentPage` as the shared save
  path. Both quick actions call `calculateQuickActionTarget` (treats missing
  `currentPage` as 0, caps at `totalPages`) and reuse the same
  validator/store/log path as the typed save. Buttons disable on
  `isSaving || isFinishing`.

## T5. Implement `Finished`

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Clicking `Finished` marks the book read, sets
  `currentPage = totalPages` when total pages are known, and preserves page
  fields when total pages are unknown.
- **Notes:** Replace or adapt the existing reached-end-only mark-as-read action.
- **Status:** [x] Done — replaced the reached-end-only `Mark as read` button
  with an always-visible `Finished` button (testid `page-progress-finished`).
  When `totalPages` is known the candidate snap to `currentPage = totalPages`
  is fed through the same validator/reading-log path, so a positive delta log
  is recorded. When `totalPages` is unknown, only `status = "read"` is sent
  and the existing page fields are preserved. The four behaviours are
  covered by tests.

## T6. Add pages-left and today motivation line

- **Files:** `src/features/page-progress/PageProgressQuickUpdate.tsx`,
  `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Known total-page books show pages left, books with today's
  reading log show `You read N pages today`, and no time estimate appears.
- **Notes:** Use the same local date basis as existing reading-log creation.
- **Status:** [x] Done — `pagesLeft` is rendered under the bookmark line as
  `M pages left` (clamped at 0) and the `You read N pages today` line is
  shown only when today's reading log has a positive `pagesRead` sum. Both
  reuse `todayLocalDate()` so the date basis matches spec 016.

## T7. Update progress-widget tests

- **Files:** `tests/features/page-progress/PageProgressQuickUpdate.test.tsx`
- **Acceptance:** Tests cover progress fraction/percentage, accessible
  progressbar attributes, `Open book` link, missing-total behavior, quick
  actions, `Finished`, today motivation, and existing error paths.
- **Notes:** Prefer user-visible assertions plus existing `data-testid`s where
  stable selectors already exist.
- **Status:** [x] Done — added a `progress widget (spec 019)` describe block
  with 13 new tests covering the CTA label, `N% completed`, the accessible
  progressbar (`role`, `aria-label`, `aria-valuemin/max/now`), pages-left
  presence/absence and clamping, today's motivation line presence/absence,
  and the four quick-action behaviours (`+10` save, `+25` save, missing
  `currentPage`, cap at `totalPages`). The `makeReadingBook` helper now
  forwards `readingLogs` so today's log can be seeded directly. Test count
  grew from 19 to 33; all 804 tests in the suite pass.

## T8. Run verification gates

- **Files:** affected implementation and tests
- **Acceptance:** `npm run lint` and `npm run test` pass.
- **Notes:** Re-read `spec.md` acceptance criteria before marking this task
  done.
- **Status:** [x] Done — `npm run lint` clean, `npm run test` 804/804
  passing, `npx tsc --noEmit` clean, `npm run build` successful.
