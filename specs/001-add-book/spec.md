# Spec: Add Book

> **Status:** Approved
> **Author:** nickkupriyanov
> **Created:** 2026-06-02
> **Spec ID:** 001-add-book
> **Constitution version:** 2026-06-02 (see `.specify/memory/constitution.md`)

---

## 1. Problem

A reader finishes a book, picks up the next one, browses a friend's shelf. They
need a way to **capture a book into their personal library** in under ten seconds
without leaving the cozy vibe of the app. Today there is no way to add a book at
all — the app is empty.

## 2. Goal

The user can add a book (title, author, status, optional cover URL and tags) to
their library, see it appear in the shelf, and have it persist across reloads.

## 3. Non-goals

- We do **not** search external book databases (Google Books, OpenLibrary, etc.).
  The user types what they know. (Future spec may add lookup.)
- We do **not** edit or delete a book in this spec. (Future spec.)
- We do **not** add bulk import, OCR of covers, or any AI features.
- We do **not** validate ISBNs, normalize titles, or auto-fetch cover images.

## 4. Users & scenarios

**Story.** Mia is reading *Piranesi* by Susanna Clarke. She opens the app,
clicks "Add book", types the title and author, picks "Reading" from the status
dropdown, and saves. The book appears at the top of her shelf. She closes the
tab, comes back tomorrow — the book is still there.

## 5. UX

- The shelf page has a single primary action: **"Add book"** (button, top-right
  of the shelf area).
- Clicking opens a shadcn/ui `Dialog` with a form:
  - Title *(required, 1–200 chars)*
  - Author *(required, 1–120 chars)*
  - Status *(radio / select: Want to read, Reading, Read)*
  - Cover URL *(optional, valid http(s) URL)*
  - Tags *(optional, free text, comma-separated, max 10 tags, each ≤ 24 chars)*
- Submit button is disabled until required fields are valid.
- On save: dialog closes, book appears at the top of the shelf, brief toast
  "Added *Title*".
- States:
  - **Empty shelf first run:** a friendly illustration + a centered "Add your
    first book" CTA. (Empty-state component reused from a future Empty spec.)
  - **Loading:** skeleton row while reading initial books from storage.
  - **Error saving:** inline form error + retry. Never lose the user's input.

## 6. Functional requirements

- FR-1. The user can open the "Add book" dialog from the shelf.
- FR-2. The dialog validates: title and author are non-empty (after trim) and
  within length limits; cover URL is a valid http(s) URL if provided; tags are
  ≤ 10 and each ≤ 24 chars.
- FR-3. On valid submit, a new `Book` is created with a generated `id` (UUID v4),
  `createdAt` (ISO timestamp), and the user-provided fields.
- FR-4. The new book is persisted via the `StorageAdapter` (initial impl:
  `LocalStorageAdapter`).
- FR-5. After save, the dialog closes and the new book appears at the top of
  the shelf (sorted by `createdAt` desc).
- FR-6. The book persists across a full page reload.
- FR-7. If storage write fails, the form shows an inline error and keeps the
  user's input intact.

## 7. Data

Domain type (lives in `src/types/book.ts`):

```ts
type ReadingStatus = 'want' | 'reading' | 'read';

interface Book {
  id: string;            // UUID v4
  title: string;
  author: string;
  status: ReadingStatus;
  coverUrl?: string;     // optional, validated http(s)
  tags: string[];        // 0..10, each ≤ 24 chars
  createdAt: string;     // ISO 8601
  // Future: updatedAt, finishedAt, rating, notes — NOT in this spec.
}
```

No migration needed — this is the first feature that writes data.

## 8. Storage interface

No new methods. This spec uses the existing `StorageAdapter`:

```ts
interface StorageAdapter {
  listBooks(): Promise<Book[]>;
  addBook(input: Omit<Book, 'id' | 'createdAt'>): Promise<Book>;
  // updateBook, removeBook — added by future specs
}
```

## 9. Edge cases & errors

- **Empty title / author (whitespace only):** validation rejects with a
  human message ("Title is required").
- **Cover URL malformed:** validation rejects. (Don't silently drop it.)
- **localStorage disabled (Safari private mode, quota):** the adapter throws;
  the dialog shows "Couldn't save. Your browser storage is full or disabled."
- **Two tabs open, same library:** the second tab to write sees stale data on
  its next read. Acceptable for MVP; document as known limitation.
- **Very long title pasted:** truncated at 200 chars client-side with a
  hint, or rejected with a message. Decision: **reject with message**,
  keeps the form honest.
- **Tags contain only spaces / commas:** normalized to `[]`.

## 10. Acceptance criteria

- [ ] "Add book" button visible on the shelf; clicking it opens a dialog.
- [ ] Submit is disabled until title and author are valid.
- [ ] A valid submission creates a `Book` and shows it at the top of the shelf.
- [ ] Reloading the page preserves the book.
- [ ] Invalid inputs (empty fields, bad URL, too many tags) show inline errors
      and **do not** close the dialog.
- [ ] If `localStorage` is unavailable, the user sees a clear error and their
      input is preserved.
- [ ] No raw HTML controls where a shadcn/ui component exists (per constitution).
- [ ] Lint and tests pass.

## 11. Out of scope (for this spec)

- Editing or deleting a book.
- Search within the library.
- Sorting or filtering controls on the shelf.
- Importing from external sources.
- Ratings, dates finished, notes.

## 12. Decisions

Resolved 2026-06-02.

- **D1. Tags input:** free text, comma-separated, normalized to `lowercase`,
  trimmed, deduped. No predefined set. Implementation lives in the validator.
- **D2. Last-used status:** the dialog remembers the last `ReadingStatus` the
  user picked (in-memory only, resets on full reload). Small QoL, trivial cost.
- **D3. Save confirmation:** toast via shadcn/ui's Sonner wrapper — no custom
  toast UI. Copy: `Added "<title>"`.
