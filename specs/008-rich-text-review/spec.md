# Spec: Rich-text Review

> **Status:** Implemented
> **Author:** —
> **Created:** 2026-06-04 (placeholder)
> **Updated:** 2026-06-05 (D1–D7 resolved, status: Draft)
> **Implemented:** 2026-06-05
> **Spec ID:** 008-rich-text-review
> **Constitution version:** see `.specify/memory/constitution.md`
> **Predecessors:** spec 007 (review), spec 009 (quotes — D-P10 deferred here)
> **Successor:** spec 010 (rich-text quote, deferred)

---

## 1. Problem

The review field is plain text (spec 007). For longer reflections users want
light formatting: bold, italic, underline, paragraph breaks, bullet/numbered
lists, a highlight colour for favourite passages, and links (e.g. to a
Goodreads page or an external essay). Embedding a heavy editor in 007 was
deferred to keep the MVP small and avoid the XSS surface of a rich-text API.

## 2. Goal

Upgrade the per-book `Book.review` from plain text to lightly formatted
text — bold / italic / underline / paragraph / lists / highlight / links —
using a small, safe editor that fits the cozy UI. The review is still
optional, still per-book, still persisted via the existing
`StorageAdapter`.

## 3. Non-goals

- No image embeds, tables, code blocks, headings, subscript, superscript,
  or collaborative editing.
- No Markdown import/export in MVP.
- No per-formatting perms / roles — single user (constitution §1).
- No rich-text on quotes in this spec — that's spec 010 (D7).
- No additional `StorageAdapter` methods — review is part of the `Book`
  record (D6).

## 4. Decisions

All open questions from the 2026-06-04 placeholder are resolved. New
open questions are tracked in §12.

### D1. Editor library — TipTap (MIT)

Stack (all MIT, free for commercial use):

- `@tiptap/react` — React bindings, `useEditor` hook, `<EditorContent>`.
- `@tiptap/pm` — ProseMirror dependencies.
- `@tiptap/starter-kit` — paragraph, bold, italic, strike, blockquote,
  bullet/ordered list, list item, hard break, code (off by default —
  see D5), heading (off by default — see D5), history.
- `@tiptap/extension-underline` — underline mark.
- `@tiptap/extension-highlight` — highlight mark.
- `@tiptap/extension-link` — link mark with `URL` validation (D3, D5).

Lexical (~22 kB) and Slate (roll-your-own) were considered and rejected:
Lexical for the heavier custom-toolbar / custom-style cost; Slate for
~500+ lines of custom code, which violates constitution §4's
"don't add a dependency for < 30 lines of your own code" *inverse*
("don't write 500 lines when an MIT library does it for you").

### D2. Storage shape — discriminated union with JSON body

```ts
export type Review = { format: "plain"; body: string }
                  | { format: "rich";  body: ProseMirrorJSON };
```

- `format: "plain"` — `body` is a plain string (paragraphs split on `\n\n`).
- `format: "rich"` — `body` is the JSON returned by `editor.getJSON()`.
  Round-trips losslessly back into the editor.

Rationale: self-describing data (constitution §3.1, types are the
contract). The validator `switch`es on `format`. The migration to a
future backend is trivial — no "is this HTML or plain?" heuristics at
the adapter boundary.

### D3. Sanitisation — structural, via custom JSON→React walker

With JSON storage, the ProseMirror schema is the only structure allowed
in the document. A custom walker in `src/lib/rich-text/walker.tsx` walks
known nodes/marks and renders them. Unknown nodes/marks are dropped.

Walker covers: `paragraph`, `text`, `bold`, `italic`, `underline`,
`strike`, `highlight`, `link` (URL-scheme whitelist: `http`, `https`,
`mailto` only; other schemes render as plain text with a dev-only
warning), `bulletList`, `orderedList`, `listItem`, `hardBreak`,
`blockquote`.

No DOMPurify needed — we never render raw HTML. Read-mode uses the
walker; it does not mount a TipTap editor instance (avoids contenteditable
chrome in cozy read view).

### D4. Toolbar — shadcn `Toggle` / `Button`

Toolbar buttons are shadcn primitives, not TipTap's `BubbleMenu` /
`FloatingMenu`. Each button calls `editor.chain().focus().toggleX().run()`
and reflects `editor.isActive("X")` via `<Toggle pressed>`. This keeps
the toolbar visually consistent with the rest of the app (constitution
§2 — shadcn before library defaults).

Layout: a single row of `Toggle`s — **B** · *I* · U · ~~S~~ · ✦ Hl · • List
· 1. List · ❝ Quote · 🔗 Link. On a narrow viewport the row wraps.

### D5. Scope — spec + Links

**In scope** (Toolbar buttons): bold, italic, underline, paragraph, bullet
list, ordered list, highlight, link.

**Free with StarterKit** (kept, no toolbar button by default): strike,
blockquote, hard break. Users can still type them via keyboard or paste;
they render correctly via the walker. We don't expose toolbar buttons to
keep the chrome minimal.

**Explicitly out** (D1 extensions list shows them off): heading, code,
code block. Subscript, superscript — not added.

Link URL is validated by the walker against an allow-list (`http`,
`https`, `mailto`). Other schemes (`javascript:`, `data:`, `file:`,
`vbscript:`) are dropped to plain text. Renders as `<a
target="_blank" rel="noopener noreferrer">`.

### D6. Migration — lazy at the validator, no bulk writes

| Stored shape | Read as | Renders as | First save |
|---|---|---|---|
| `review: undefined` | `undefined` | Empty state | — |
| `review: "plain text"` (legacy) | `{ format: "plain", body: <string> }` | Walker splits on `\n\n`, one `<p>` per paragraph | Migrated to new shape on save |
| `review: { format: "plain", body }` | unchanged | Same as above | unchanged |
| `review: { format: "rich", body: <json> }` | unchanged | Walker | unchanged |

The validator is the only place that knows both shapes. No `localStorage`
writes on app load. No bulk migration. Legacy reviews are preserved
verbatim and render as paragraphs (per the 2026-06-04 placeholder
declaration).

### D7. Quote rich-text — separate spec 010

`Quote.text` and `Quote.note` (spec 009) are explicitly out of scope here.
They get their own spec (010) after 008 ships. Rationale: 008 is
"rich-text **review**" — one feature, one spec (constitution §3, small
surface area). Whether 200-char quotes even *need* rich-text is a
separate question that deserves its own brainstorm, not a side-effect
of 008.

The shared infra (walker, sanitize, toolbar) is implemented in
`src/lib/rich-text/` so spec 010 can reuse it without copy-paste.

## 5. Why this spec exists now (as a placeholder → draft)

Spec 007 was finished without spinning up this work — `specs/008-*/` was
never created. The placeholder was filed on 2026-06-04 (commit `0e5c868`)
to capture the deferred decision. Today (2026-06-05) the placeholder
moves to Draft with D1–D7 resolved, ready for `plan.md` and `tasks.md`.

## 6. UX

### 6.1 Read mode — `<ReviewDisplay review={book.review} />`

- **`undefined`** — same empty state as spec 007: "No review yet."
  message plus a "Write review" button.
- **`format: "plain"`** — one `<p>` per `\n\n`-separated block, plain
  text, no italic, no curly quotes.
- **`format: "rich"`** — walker renders formatted text. Lists, bold,
  italic, links, highlight, blockquote all visible. No toolbar. No
  cursor / focus rings.

### 6.2 Edit mode — `<ReviewEditor review={…} onSave={…} onCancel={…} />`

- Replaces the `Textarea` from spec 007. Same "Edit review" / "Save" /
  "Cancel" affordances.
- `<EditorContent>` renders the document with cozy typography (no
  default TipTap styles — wrapped in our own classes).
- Toolbar (`<EditorToolbar />`) sits above the editor. Each button uses
  shadcn `Toggle` (pressed = active). Tooltips with the keyboard
  shortcut where one exists (`Cmd+B`, `Cmd+I`, `Cmd+U`).
- "Save" disabled while in flight; label "Saving…".
- "Cancel" discards local changes; the review in storage is unchanged.

### 6.3 Empty / error / loading states

- **Empty:** same empty state as spec 007 (the `Book.review` is
  `undefined`).
- **Malformed JSON** in `format: "rich"` (e.g. user edited devtools):
  validator rejects → review treated as `undefined` → empty state.
  No crash, no console-error spam in prod (dev: one `console.warn`).
- **Save failure:** `toast.error("Couldn't save review. Try again.")`,
  editor stays open, local content preserved (per spec 007 / 009
  patterns).
- **Loading:** none. The detail page is hydrated by the time the section
  renders.

## 7. Functional requirements

- FR-1. The user can open an **Edit review** affordance from the
  detail-page review section (same as spec 007).
- FR-2. The user can apply **bold**, **italic**, **underline**,
  **highlight** to selected text via toolbar or keyboard shortcut.
- FR-3. The user can convert the current paragraph to a **bullet list
  item** / **ordered list item** via toolbar; can nest one level.
- FR-4. The user can apply a **link** to selected text via toolbar; the
  URL prompt validates against the scheme allow-list. A link with a
  forbidden scheme is rejected with an inline error.
- FR-5. The user can **remove** a mark by toggling its toolbar button
  with the cursor inside the marked range.
- FR-6. On save, the review is stored as
  `{ format: "rich", body: <ProseMirrorJSON> }`.
- FR-7. On cancel, the local editor state is discarded; storage is
  unchanged.
- FR-8. Save failure surfaces a toast; the editor stays open with the
  user's content.
- FR-9. Legacy plain-text reviews (`review: "..."`) render as
  paragraphs and migrate to the discriminated shape on first save
  (D6).
- FR-10. Malformed `format: "rich"` body is treated as `undefined` (no
  crash) and shown as empty state.
- FR-11. Read mode does not mount a TipTap editor (no contenteditable
  chrome).
- FR-12. Links open in a new tab with `rel="noopener noreferrer"`.

## 8. Data

### 8.1 New file `src/types/review.ts`

```ts
import type { JSONContent } from "@tiptap/core";

/** Plain-text review: legacy (string) shape, normalised to this on read. */
export interface PlainReview {
  format: "plain";
  body: string;
}

/** Rich-text review: body is ProseMirror JSON. */
export interface RichReview {
  format: "rich";
  body: JSONContent;
}

export type Review = PlainReview | RichReview;

/** UI submission shape — same as Review, no id. */
export type ReviewInput = Review;
```

`JSONContent` is exported by `@tiptap/core`. No need to redefine it.

### 8.2 Change to `src/types/book.ts`

```ts
import type { Review } from "./review";

export interface Book {
  // ... existing fields unchanged ...
  /** Review of the book. Lazy-normalised from legacy string on read (D6). */
  review?: Review | string; // legacy string kept for read compatibility
}
```

The legacy `string` type stays on `Book` to keep the storage load
side forgiving; the validator normalises to `Review | undefined`.

`BookInput` is unchanged on the review field — it accepts both shapes
via the same union.

## 9. Storage interface

**No changes.** `StorageAdapter` keeps its four methods
(`listBooks`, `addBook`, `updateBook`, `deleteBook`). The review is
persisted as part of the `Book` record.

Read path: `LocalStorageAdapter.listBooks()` returns books as-is
(possibly with legacy `review: string`). The validator normalises.

Write path: `updateBook` serialises the new discriminated shape.

## 10. Edge cases & errors

- **Empty rich body** (`format: "rich"`, `body: { type: "doc", content: [] }`
  or `body: ""`) — normalised to `undefined` (no review).
- **Malformed JSON** in `format: "rich"` (doesn't conform to
  ProseMirror schema) — validator rejects, review → `undefined`, dev-only
  `console.warn`.
- **Link with forbidden scheme** (`javascript:`, `data:`, `vbscript:`,
  `file:`, anything not in the allow-list) — walker renders as plain
  text, no `<a>`.
- **Long body** — the editor enforces no hard cap (TipTap handles large
  docs). The display walker handles arbitrary depth.
- **Two tabs editing the same review** — last write wins, same posture
  as spec 007.
- **Reload mid-edit** — dialog state is local; reload closes with
  storage unchanged. No auto-save.

## 11. Acceptance criteria

A reviewer can tick each box without asking a clarifying question.

- [x] `npm run lint && npm run test` are green.
- [x] `@tiptap/*` packages installed and MIT (verified in `package.json`
      `license` field — no field, just MIT in the package itself is
      sufficient; pinned via `package.json` versions).
- [x] `Book.review` accepts both `string` (legacy) and `Review`
      (discriminated). Validator normalises.
- [x] `validateReview` is TDD-covered: legacy string → discriminated
      plain, plain, rich-valid, rich-malformed, rich-empty → undefined.
- [x] `<ReviewEditor />` opens a TipTap editor with the toolbar (B / I
      / U / S / Hl / • List / 1. List / ❝ Quote / 🔗 Link).
- [x] Toolbar buttons are shadcn `Toggle` / `Button` (D4), not
      `BubbleMenu` / `FloatingMenu`.
- [x] All in-scope formatting (FR-2..FR-5) works.
- [x] Save persists `{ format: "rich", body: <JSON> }`.
- [x] Legacy reviews render as paragraphs and migrate on first save.
- [x] Read mode uses the custom walker; no TipTap editor mounts in
      read-only.
- [x] Walker unit tests cover all known nodes/marks.
- [x] Link scheme allow-list is unit-tested (`sanitize.test.ts`).
- [x] Save failure → toast, editor stays open, content preserved.
- [x] No new `any` introduced.
- [x] `tsc --noEmit` clean.
- [x] `npm run build` succeeds. Bundle delta from `@tiptap/*` is
      recorded in the T8 commit message.
- [x] Constitution §4: no dependencies beyond the `@tiptap/*` MIT stack
      + DOMPurify NOT added (we don't render HTML).

## 12. Open questions

None at draft time. D1–D7 above close the three open questions from
the 2026-06-04 placeholder (OQ-1 library, OQ-2 shape, OQ-3 sanitisation)
and the toolbar / scope / migration / quote-coupling follow-ups.

Future spec candidates (not part of 008):

- **Spec 010:** Rich-text `Quote.text` and `Quote.note` — reuses
  `src/lib/rich-text/` (walker, sanitize, toolbar). May revisit
  scope: is rich-text appropriate for 200-char quotes? Brainstorm
  separately.
  **Resolution (2026-06-05):** decided not to pursue. Quotes are
  short (200 chars per spec 009); bold/italic/lists don't earn
  the TipTap bundle cost (135 kB First Load JS) on a feature
  where users mostly type plain text and a single `note` field.
  The `src/lib/rich-text/` infra stays in place for any future
  spec that genuinely needs it (e.g. a long-form journal, book
  annotations, or an export template), but it will not be wired
  into the quote flow.
- **Markdown round-trip:** could be added later if the feature earns
  its keep (constitution §4). Out of scope here.

---

## Appendix A. Why these extensions, concretely

| Feature | Extension | Why |
|---|---|---|
| Paragraph | StarterKit (Paragraph) | Default block. |
| Bold | StarterKit (Bold) | FR-2. |
| Italic | StarterKit (Italic) | FR-2. |
| Strike | StarterKit (Strike) | Free with StarterKit; walker supports it. |
| Blockquote | StarterKit (Blockquote) | Free; walker supports it. |
| Bullet list | StarterKit (BulletList) | FR-3. |
| Ordered list | StarterKit (OrderedList) | FR-3. |
| List item | StarterKit (ListItem) | Required by both lists. |
| Hard break | StarterKit (HardBreak) | `<br>` inside paragraphs. |
| History | StarterKit (History) | Undo/redo. |
| Heading | StarterKit (Heading) | **Disabled** — D5. |
| Code | StarterKit (Code, CodeBlock) | **Disabled** — D5. |
| Underline | `@tiptap/extension-underline` | FR-2. |
| Highlight | `@tiptap/extension-highlight` | FR-2. |
| Link | `@tiptap/extension-link` | FR-4. Walker validates scheme. |
| Document / Text | StarterKit (Document, Text) | Schema roots. |
