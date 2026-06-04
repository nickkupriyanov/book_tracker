# Spec: Detail View

> **Status:** Approved
> **Author:** nickkupriyanov
> **Created:** 2026-06-04
> **Spec ID:** 005-detail-view
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

A user can add, list, edit, and delete a book — but the shelf card
shows only a compressed view: title and author (truncated to fit),
status pill, and the first 3 tags with a "+N" overflow. There is
no way to see the full picture of a single book without
scrolling through the Edit dialog, and even there the layout is
form-shaped, not book-shaped.

Forward-looking: the user has hinted at upcoming features that
need their own real estate on a per-book basis — book
**rating**, **review** (long-form text), **quotes** (a list),
and **reading time**. A dialog modal will not hold all of that;
a separate page is the right shape, and it should be introduced
now so the future sections can be added incrementally without
restructuring.

## 2. Goal

Every book has a dedicated route at `/book/<id>` that shows its
full metadata and serves as the host page for future per-book
sections (rating, review, quotes, reading time). The page is
reachable from the shelf via the card title, supports Edit and
Delete, and degrades gracefully when the id is stale.

## 3. Non-goals

- We do **not** implement rating, review, quotes, or reading
  time in this spec. They are separate, future specs. The
  page's section structure is built to host them, but the
  sections themselves are not rendered.
- We do **not** add a `Book.updatedAt` field. The MVP has no
  use for it; it can be added with whichever future spec
  first needs it (likely review).
- We do **not** add a "Mark as Read" quick action. The user
  changes status through the existing Edit dialog (per spec
  003 §3 non-goals).
- We do **not** make the cover image, the tags, or the author
  separate clickable areas. Only the title is the link.
- We do **not** support deep-linking from outside the app
  (notifications, emails, another tab). The page reads from
  the in-memory store; a cold load on `/book/<id>` may show
  the not-found state briefly before `init()` resolves.
- We do **not** generate public links, OpenGraph tags, or
  anything that would make a per-book URL meaningful outside
  the local app. The route is bookmarkable by the user only.
- We do **not** add breadcrumbs, related books, or "you might
  also like". The "Back to shelf" link is the only
  navigation.

## 4. Users & scenarios

**Story.** Mia added *Piranesi* last week with 8 tags: fiction,
fantasy, house, labyrinth, ocean, statues, mystery, favourite.
On the shelf she sees the first 3 plus "+5". She wants the
full list. She clicks the title; the page navigates to
`/book/<id>`. The cover is large on the left, all 8 tags are
visible on the right under the title and author, and the date
she added it is shown as "Added on 1 June 2026".

**Story.** Andy realises *Project Hail Mary* was added with
the wrong author. He opens the detail page from the shelf,
clicks Edit in the header, fixes the author, saves. The
dialog closes; the page now shows the corrected author.

**Story.** Sara has the detail page open for a book she just
deleted in another tab. She clicks Delete in the header to
remove it here too. The Delete dialog opens. She confirms.
The dialog closes, and the page redirects her to the shelf
(`EmptyShelf` if it was the last one).

**Story.** Kim pastes a stale `/book/<id>` URL from a notes
app. The book was deleted last week. The page renders "Book
not found" with a "Back to shelf" link.

## 5. UX

- **Trigger from the shelf.** The card's title is a Next.js
  `<Link href={\`/book/${book.id}\`}>`. Subtle underline on
  hover (`hover:underline underline-offset-2`). No other
  part of the card is clickable — the cover, the tags, and
  the body do not act as links. The pencil and trash icons
  keep their existing positions and behaviour (spec 003,
  004).
- **Page header.** A small "← Back to shelf" link on the
  left, rendered as a shadcn `Button variant="ghost"
  size="sm"` with a `ChevronLeft` icon. On the right: an
  Edit button (with `Pencil` icon) and a Delete button (with
  `Trash2` icon, ghost variant with
  `hover:text-destructive` to match the card).
- **Page main.** Two-column layout on desktop (≥ md
  breakpoint): cover on the left (fixed `aspect-[2/3]`,
  `w-64` or `w-72`), meta column on the right. Single column
  on mobile: cover on top (`w-full max-w-xs mx-auto`), meta
  below. Vertical gap between cover and meta on mobile, no
  gap on desktop.
- **Meta column:**
  - **Title** as `h1`, `font-serif`, large.
  - **Author** as a paragraph, `text-muted-foreground`.
  - **Status** as the existing `StatusPill` component.
  - **Tags** as the existing `Badge variant="secondary"`,
    one per tag, wrapped. No truncation, no "+N" — all
    tags shown.
  - **Added on** formatted with
    `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`
    from the book's `createdAt`. Rendered below the tags
    as small, muted text. The `en-GB` locale is fixed for
    consistency with the rest of the English UI; honouring
    the browser locale is a future polish spec.
- **Section structure.** The page's main area is a vertical
  stack of `<DetailSection title="...">` blocks. In this
  spec, **no sections are rendered** — the meta column is
  the entire content. The `DetailSection` component is
  defined and exported for future specs to use (rating,
  review, quotes, reading time) without reworking the
  page.
- **Edit and Delete from the page.** Clicking Edit in the
  header opens the existing `EditBookDialog` as an overlay.
  Clicking Delete opens the existing `DeleteBookDialog`.
  Both dialogs are rendered as children of the page
  component; their open/close state is owned by the page.
- **Not found.** When the `id` from the URL is not in
  `useBookLibrary`'s `books` array, the page renders a
  centred message: "Book not found." with a "Back to
  shelf" button. The same loading layout pattern is used.
- **Loading.** When the store's status is `loading`
  (initial mount, before `init()` resolves), the page
  renders a small "Loading…" message in the centred
  layout pattern.

## 6. Functional requirements

- FR-1. Each `BookCard` renders the title as a `<Link>` to
  `/book/<book.id>`.
- FR-2. The route `/book/[id]` renders a dedicated detail
  page for the book with that `id`.
- FR-3. The page header has a "Back to shelf" link on the
  left and Edit + Delete buttons on the right.
- FR-4. The page main renders, at minimum: cover image
  (with fallback placeholder), title (`h1`, font-serif),
  author, `StatusPill`, all tags as `Badge`s, and
  "Added on <date>" formatted with `en-GB` locale.
- FR-5. Clicking Edit in the page header opens the existing
  `EditBookDialog` pre-filled with the current book.
- FR-6. Clicking Delete in the page header opens the
  existing `DeleteBookDialog` for the current book.
- FR-7. A successful Edit save closes the dialog and the
  page reflects the updated values without a manual
  reload.
- FR-8. A successful Delete closes the dialog and
  navigates the user to `/` (the shelf). If it was the
  last book, the shelf shows `EmptyShelf`.
- FR-9. If the `id` from the URL is not in the store's
  `books` array, the page renders a "Book not found" state
  with a "Back to shelf" button.
- FR-10. If the store's status is `loading` (initial
  mount), the page renders a loading state.

## 7. Data

No changes to the domain types in `src/types/book.ts`. The
detail page reads from the existing `useBookLibrary` store.
The `createdAt` ISO string is formatted on the client with
`Intl.DateTimeFormat("en-GB", { dateStyle: "long" })` — no
new dependencies.

The page's section structure is designed so that future
specs can introduce new fields on `Book` (e.g.
`rating?: 1..5`, `review?: string`,
`quotes: Quote[]`, `readingTimeMinutes?: number`) and add
new `<DetailSection>`s that read those fields, without
changing this spec's page layout. The validator in
`src/lib/validation/book.ts` will need to grow alongside
the new fields, but that is the concern of the future
specs, not this one.

## 8. Storage interface

No changes to `StorageAdapter`. The page uses the existing
`useBookLibrary` actions (`addBook`, `updateBook`,
`deleteBook`) through the same dialog components that
already exist (spec 003 and 004).

## 9. Edge cases & errors

- **Stale `id` in URL** (book deleted in another tab, or
  the user pasted a URL from a notes app). The page
  renders "Book not found" (FR-9).
- **Initial load on `/book/<id>`.** The store is `loading`
  until `init()` resolves from localStorage. The page
  renders a loading state (FR-10). If the book exists in
  localStorage, the page re-renders with the book; if not,
  it re-renders with the not-found state.
- **Edit success.** The dialog closes, the page's book
  data updates from the store, no manual reload.
- **Edit failure (storage).** The dialog stays open with
  the existing form-level error; the page does not change.
  Same behaviour as spec 003.
- **Delete success.** The dialog closes, the page
  navigates to `/`. If the deleted book was the last,
  the shelf shows `EmptyShelf` (existing behaviour).
- **Delete failure (storage).** The dialog stays open with
  the existing form-level error. The page does not
  navigate away. Same behaviour as spec 004.
- **Stale `id` on Delete click** (book already gone). The
  dialog opens, the user confirms, the adapter throws
  "not found", the dialog shows the form error, the page
  stays. The user can close the dialog manually.
- **Browser back / forward.** Next.js handles this for
  free: the previous page is the shelf, the next page (if
  any) is whatever the user navigated to after.
- **Direct URL load on a cold session.** The store is
  empty until `init()` runs; the not-found state shows
  briefly before the book is found. Acceptable for MVP —
  this is a local-first app, the user normally enters
  via the shelf.

## 10. Acceptance criteria

- [ ] Each `BookCard` title is wrapped in a `<Link>` to
      `/book/<book.id>`.
- [ ] The card title shows a subtle underline on hover;
      the rest of the card is not clickable.
- [ ] Visiting `/book/<id>` for an existing book renders
      the detail page with cover, title, author, status,
      all tags, and "Added on <date>".
- [ ] The page header has a "Back to shelf" link on the
      left and Edit + Delete buttons on the right.
- [ ] Clicking Edit opens the existing `EditBookDialog`
      with the current book pre-filled; saving updates
      the page without reload.
- [ ] Clicking Delete opens the existing
      `DeleteBookDialog`; confirming removes the book and
      navigates to `/`.
- [ ] Visiting `/book/<id>` for a missing book renders
      "Book not found" with a "Back to shelf" button.
- [ ] On initial mount with `status === 'loading'`, the
      page renders a loading state.
- [ ] Layout is responsive: cover and meta side-by-side
      on desktop, stacked on mobile.
- [ ] The page's main area is structured as a stack of
      `<DetailSection>` blocks; in this spec zero sections
      are rendered, but the component exists and is
      exported for future specs.
- [ ] No raw HTML controls where shadcn has an
      equivalent.
- [ ] Lint and tests pass; no new `any` introduced.
- [ ] No new npm dependencies.

## 11. Out of scope (for this spec)

- Book rating (1–5 or similar) — separate spec.
- Book review (long-form text) — separate spec.
- Book quotes (list of `{ text, page?, addedAt }`) —
  separate spec.
- Reading time tracking — separate spec.
- `Book.updatedAt` field.
- "Mark as Read" quick action.
- Edit-in-place / inline editing on the detail page.
- Shareable / public URLs, OpenGraph, social previews.
- Cold-load deep-linking from external sources.
- Breadcrumbs, related books, "you might also like".
- Sections that summarise shelf-level stats per book
  (e.g. "you read this in 3 days" — that needs a
  different data shape).
- Locale-aware date formatting (uses `en-GB` fixed).

## 12. Decisions

Resolved 2026-06-04.

- **D1. Route-based detail view (`/book/[id]`), not a
  dialog.** Forward-looking: rating, review, quotes, and
  reading time need their own space; a dialog becomes
  cramped fast. A route also gives us shareable URLs
  (within the user's own bookmarks) and natural browser
  back/forward. The constitution prefers "cozy, not
  clever"; a calm, scrollable page fits that better than
  nested modals.
- **D2. Title on the card = `<Link>` to `/book/<id>`.**
  Not an info icon, not a clickable cover. The title is
  the most natural clickable element on a card; users
  expect "click the title to learn more" from any list
  view on the web. Subtle underline on hover, not
  aggressive. The pencil and trash icons keep their
  positions and behaviour.
- **D3. Edit + Delete buttons live in the page header.**
  Keeps the action surface aligned with where the user
  came from (the card) and makes the page the single
  host for everything book-related. Clicking Edit closes
  the detail context and opens the Edit dialog
  (precedence is not needed: there is only one dialog
  slot on this page).
- **D4. Book not found → centred message + back link.**
  Not a Next.js 404, not a redirect. The user gets a
  clear "this does not exist" signal and a single way
  out. Easier to reason about than a 404 page that loads
  a different layout.
- **D5. No new `Book` fields, no migrations.** Rating,
  review, quotes, and reading time are separate specs
  that will each introduce their own optional fields and
  their own validator changes. This spec's job is to lay
  the section structure.
- **D6. Spec 003 / 004 precedence rule does NOT apply to
  the detail page.** The detail page has at most one
  `editing` and one `deleting` slot, but there is no
  `viewing` dialog to conflict with — the page IS the
  view. Precedence matters on the shelf; on the detail
  page it is trivially satisfied.
- **D7. Section-based layout via `<DetailSection
  title>`.** The page's main is a vertical stack of
  section blocks. Each future spec (rating, review,
  quotes, reading time) adds a new section by importing
  its component and dropping it in. No layout rework,
  no state machine changes, no new dialogs. The section
  component is defined and exported in this spec even
  though zero sections are rendered yet.
- **D8. The detail page uses `useBookLibrary` directly
  (no separate data hook).** Same pattern as
  `ShelfList`. The page reads `books` reactively from
  the store; on Edit success the store updates and the
  page re-renders automatically. On Delete success the
  page navigates to `/`, which unmounts it.
- **D9. Edit and Delete dialogs are rendered as
  children of the page, not in `ShelfList`.** The page
  owns the `editingBook` and `deletingBook` state. This
  keeps the page self-contained and removes any coupling
  to `ShelfList` — the page works even if the shelf is
  replaced (e.g. by a future `/search` route).
- **D10. Locale-formatted date with
  `Intl.DateTimeFormat("en-GB", { dateStyle: "long" })`.**
  No new dependency (the runtime ships it). `en-GB` is
  fixed for consistency with the rest of the English UI;
  honouring the user's browser locale is a future polish
  spec. SSR-safe: Node ships `Intl`; the formatter is
  deterministic across server and client.
