# Spec: Shelf List

> **Status:** Approved
> **Author:** nickkupriyanov
> **Created:** 2026-06-02
> **Spec ID:** 002-shelf-list
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

After a user adds their first book via the Add Book dialog, the shelf shows
only "You have N books" as a placeholder (spec 001 §4 T12 fallback). There
is no way to actually *see* the books — covers, titles, statuses — even when
the library is non-empty. The user is told they have books but cannot
interact with them.

## 2. Goal

The user sees their books as a visual grid on the shelf, with filter tabs
above the grid that let them narrow by status (All / Want to read / Reading
/ Read). Adding a book (via the existing Add Book flow) immediately adds a
new card to the grid.

## 3. Non-goals

- We do **not** edit, delete, or click-through to book details (separate
  specs).
- We do **not** search by title or author.
- We do **not** add sort controls. Newest-first is the only order; it
  matches the store's sort (spec 001 §6 T6).
- We do **not** paginate or virtualize. MVP assumes < 100 books.
- We do **not** support drag-and-drop reordering.
- We do **not** support bulk operations.
- We do **not** upload cover images. URLs only.

## 4. Users & scenarios

**Story.** Mia has added 3 books: *Piranesi* (Reading), *The Long Way to a
Small, Angry Planet* (Read), and *Project Hail Mary* (Want to read). She
opens the app and sees a 3-column grid of cards. Each card shows the cover
(or a cozy placeholder if no URL), the title in serif, the author in muted
text, a small status pill, and up to three tag chips. Above the grid, a
row of filter tabs reads "All (3) | Want to read (1) | Reading (1) | Read
(1)". She clicks "Reading" and the grid filters to one card. She clicks
"All" and sees all three again. She adds a new book; the new card appears
at the top-left of the grid.

## 5. UX

- **Grid layout.** Responsive: 2 columns on mobile, 3 on tablet, 4 on
  desktop (Tailwind `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`). Cards
  equal height, soft corners (`rounded-lg`), warm border.
- **Card content (top to bottom):**
  - Cover image at 2:3 aspect ratio (book-shaped). If no `coverUrl` or
    the image fails to load, show a placeholder block: muted background
    with a `BookOpen` lucide icon centered.
  - Title (serif font, 1 line, ellipsis on overflow).
  - Author (muted-foreground, 1 line, ellipsis on overflow).
  - Status pill (small, rounded-full): label text. Color-coded by
    `ReadingStatus`.
  - Tags (up to 3 small chips, "+N" if more). Quiet style, not loud.
- **Filter tabs.** Above the grid, horizontal row. Each tab shows a label
  and a count. Default selection: "All". Built on shadcn `Tabs`.
  - "All (N)" — total
  - "Want to read (N)" — count of `status === 'want'`
  - "Reading (N)" — count of `status === 'reading'`
  - "Read (N)" — count of `status === 'read'`
- **Empty filter result.** If the active filter has no books, render a
  small message in the grid area: "No books with this status." (no CTA —
  the user can just switch tabs).
- **No-filter result (zero books overall).** Unchanged: `EmptyShelf` from
  spec 001.
- **Loading.** Unchanged: "Loading your library…".
- **Cover load failure.** If `<img>` fires `onError`, swap `src` to a tiny
  transparent 1×1 data URL and reveal the placeholder div behind it. No
  console error, no flicker after first attempt.

## 6. Functional requirements

- FR-1. The shelf renders a grid of book cards when `books.length > 0`.
- FR-2. Each card shows: cover (or placeholder), title, author, status
  pill, tags (up to 3 + overflow).
- FR-3. Filter tabs above the grid let the user narrow by status; default
  is "All".
- FR-4. Each tab's label includes a count: total for "All", per-status for
  the others. Counts update reactively when books are added.
- FR-5. Clicking a tab updates the filter; the grid re-renders
  immediately (no submit, no async).
- FR-6. Books are sorted newest-first (matches store order — see spec 001
  §6 T6).
- FR-7. A cover image that fails to load is replaced by a placeholder
  (icon + muted background) without re-rendering the whole grid.
- FR-8. The Add Book flow (header button, dialog, save, toast) still works
  and the new card appears in the grid on save.

## 7. Data

No new types. Uses the existing `Book` and `ReadingStatus` from
`src/types/book.ts`. The shelf is a read-only consumer of the store:

```ts
const books = useBookLibrary((s) => s.books);  // already exists
```

The active filter is **UI state** (local `useState`), not store state. It
does not need to survive a page reload (per Q4 in §12).

## 8. Storage interface

No changes. The shelf is read-only on the adapter. (Adding books uses
`addBook`; editing and deleting will arrive in their own specs and may
extend the interface then.)

## 9. Edge cases & errors

- **0 books overall:** `EmptyShelf` (from spec 001) renders. No grid.
- **Filter with 0 results:** "No books with this status." message.
- **`coverUrl` missing:** placeholder shown by default.
- **`coverUrl` invalid (404, malformed, blocked):** `onError` swaps to
  placeholder.
- **Very long title or author:** CSS `truncate` (Tailwind) — 1 line, then
  ellipsis. Acceptable for an MVP; full text is in the future detail view.
- **Many tags (>3):** show first 3, then a "+N" chip.
- **Status badge for "Read":** muted+checkmark, *not* a new green color
  (per Q1).
- **Adding a book while a filter is active:** the new book only appears
  in the grid if it matches the active filter. If the user is on
  "Reading" and adds a "Want" book, the new card is *not* shown — but
  the tab counts update. (This is correct behavior; the user picked a
  filter.)

## 10. Acceptance criteria

- [ ] When `books.length > 0`, the shelf renders a grid of book cards.
- [ ] Each card shows cover/placeholder, title, author, status pill, tags.
- [ ] Filter tabs (All / Want to read / Reading / Read) appear above the
      grid when there are books.
- [ ] Each tab's label includes a count.
- [ ] Clicking a tab filters the grid; the default is "All".
- [ ] Filter with 0 matching books shows "No books with this status."
- [ ] Books appear in newest-first order.
- [ ] A cover image that fails to load is replaced by a placeholder.
- [ ] Adding a book via the existing Add Book flow makes the new card
      appear in the grid (or is correctly hidden if the filter excludes
      it).
- [ ] No raw HTML controls where shadcn/ui has an equivalent.
- [ ] Lint and tests pass; no new `any` introduced.

## 11. Out of scope (for this spec)

- Edit / delete / view book details.
- Search.
- Sort controls (newest-first is the only order).
- Pagination or virtualization.
- Drag-and-drop reordering.
- Bulk operations.
- Cover image upload.
- Persisting the active filter across reloads.

## 12. Decisions

Resolved 2026-06-02.

- **D1. Status pill for "Read".** Muted background with a checkmark icon.
  No sage/green — keeps the cozy palette intact. "Read" is a state, not a
  celebration.
- **D2. Tags.** Render as small `Badge`-style pills with a quiet variant.
  Up to 3 visible, "+N" overflow chip.
- **D3. Cover aspect ratio.** 2:3 (book-shaped). Reads as "book", not as
  a video thumbnail.
- **D4. Filter persistence.** Resets to "All" on page reload. Filter is
  UI state, not domain state. Avoids "where did my books go?" confusion
  after reload.
