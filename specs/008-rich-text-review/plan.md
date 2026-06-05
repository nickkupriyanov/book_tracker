# Plan: Rich-text Review

> **Status:** Draft
> **Spec:** `../spec.md` (Draft)
> **Author:** —
> **Created:** 2026-06-05

---

## 1. Architecture summary

Rich-text Review is the second pass on the per-book `Book.review` field,
which is currently plain text (spec 007). The big picture is the same
section-based architecture from spec 005 D7: a smart `ReviewSection`
alternates between read mode and edit mode. The single behavioural change
is the *content shape* — read mode renders formatted text via a custom
walker, edit mode opens a TipTap editor with a shadcn toolbar.

The biggest deviation from spec 007 is the **editor library** (D1).
Spec 007 used a `<Textarea>` (native HTML wrapped in shadcn). This spec
introduces TipTap (MIT, ProseMirror-based) and ProseMirror JSON as the
storage shape for rich reviews (D2). The change is bounded:

- A new shared folder `src/lib/rich-text/` holds the walker, the link
  scheme allow-list, and the schema (extensions config). It is
  framework-agnostic: no React, no DOM in the walker/sanitize. This
  means spec 010 (rich-text quote) can reuse it without copy-paste.
- The `Review` type lives in its own file `src/types/review.ts`
  (per constitution §3, types are the contract).
- The validator in `src/lib/validation/book.ts` is the **only** place
  that knows about the legacy `string` shape (D6). Read code sees a
  normalised `Review`; storage may carry either shape.

The `BookDetail` orchestrator is unchanged. The dialog-state pattern
established in spec 009 (Add/Edit quote, Delete quote) does not apply
to review because the review is a *single, inline* field, not a list.
`ReviewSection` continues to own its own read/edit toggle state.

## 2. Module / file layout

```
package.json                               # MODIFIED: add @tiptap/* packages
src/components/ui/toggle.tsx               # NEW: shadcn Toggle primitive (radix)
src/types/review.ts                        # NEW: Review, PlainReview, RichReview, ReviewInput
src/types/book.ts                          # MODIFIED: review?: Review | string
src/lib/rich-text/                         # NEW feature folder (shared with spec 010)
├── schema.ts                              # NEW: extensions config (StarterKit + Underline + Highlight + Link)
├── walker.tsx                             # NEW: JSON→React visitor (known nodes/marks only)
├── walker.test.tsx                        # NEW: walker unit tests (same folder; no test/ tree)
├── sanitize.ts                            # NEW: link URL scheme allow-list
└── sanitize.test.ts                       # NEW: scheme allow-list tests
src/lib/validation/book.ts                 # MODIFIED: rewrite validateReview (legacy + discriminated)
src/features/review/
├── EditorToolbar.tsx                      # NEW: shadcn Toggle toolbar bound to TipTap commands
├── ReviewEditor.tsx                       # NEW: TipTap wrapper, save/cancel
├── ReviewDisplay.tsx                      # NEW: read-mode using walker
├── ReviewSection.tsx                      # MODIFIED: replace Textarea with ReviewEditor, replace read with ReviewDisplay
└── index.ts                               # MODIFIED: add new exports
tests/
├── lib/rich-text/                         # NEW folder
│   ├── walker.test.tsx                    # moved to src/lib/rich-text/walker.test.tsx
│   └── sanitize.test.ts                   # moved to src/lib/rich-text/sanitize.test.ts
├── lib/validation/review.test.ts          # NEW: validateReview cases (legacy + new shapes)
├── features/review/ReviewSection.test.tsx # MODIFIED: rewrite for new shape (legacy → discriminated)
├── features/review/ReviewEditor.test.tsx  # NEW: editor behaviour
└── features/review/ReviewDisplay.test.tsx # NEW: read mode cases
```

Two test-layout notes:

1. **Co-located tests** in `src/lib/rich-text/` for the walker and
   sanitize. The rest of the project keeps tests in `tests/`, but the
   walker is a pure-function module that lives next to its tests is
   the standard React/TS pattern; spec 010 will follow the same
   convention when it adds quote walker tests. (D-P9 below.)
2. **Existing `tests/features/review/ReviewSection.test.tsx`** gets a
   *rewrite*, not a deletion. The existing 14 tests assume a Textarea;
   the new tests assume the walker read mode and the TipTap edit
   mode. Net test count after 008: 280 (spec 009 baseline) + ~30
   new from spec 008 = ~310.

No new domain types beyond the new `Review`. No new `StorageAdapter`
methods. No new npm dependencies beyond the `@tiptap/*` MIT stack
(tiptap-react, tiptap-pm, tiptap-starter-kit, tiptap-extension-underline,
tiptap-extension-highlight, tiptap-extension-link). All other UI
primitives (`Toggle`, `Button`) are already in `radix-ui` v1.4.3 (the
project's bundled radix package) and just need a shadcn-style wrapper
in `src/components/ui/toggle.tsx`.

## 3. Data flow

Happy path for **editing an existing rich review**:

```
[Detail page] (/book/<id>)
  user clicks "Edit review" on <ReviewSection>
  -> ReviewSection setMode("edit")
  -> renders <ReviewEditor
              initialValue={book.review}     // discriminated shape
              onSave={handleSave}
              onCancel={() => setMode("read")}>

       user types/uses toolbar
         EditorToolbar buttons call:
           editor.chain().focus().toggleBold().run()
           editor.chain().focus().toggleItalic().run()
           editor.chain().focus().toggleUnderline().run()
           ...
         (Toolbar reads editor.isActive(...) via useEditorState to
          reflect pressed state.)
       user clicks "Save"
         ReviewEditor handleSave():
           doc = editor.getJSON()  // ProseMirror JSON
           result = validateReview({ format: "rich", body: doc })
              // validator accepts JSONContent (unknown-in, narrowed via
              //  isProseMirrorDoc helper)
           if (!result.ok) setErrors(result.errors); return
           setIsSaving(true)
           try {
             await props.onSave(result.value)
             // parent BookDetail (here, ReviewSection) closes edit mode
           } catch {
             toast.error("Couldn't save review. Try again.")
           } finally { setIsSaving(false) }
  -> ReviewSection handleSave(review):
       await useBookLibrary.updateBook(book.id, { ...book, review })
       setMode("read")
  -> on success: store updates, ReviewSection re-renders in read mode,
     ReviewDisplay walks the new JSON.
  -> on error: toast, editor stays open, content preserved.
```

Happy path for **reading a legacy plain review** (D6):

```
  book.review === "Loved this book. A quiet masterpiece."
  -> ReviewDisplay sees the legacy string
  -> ReviewDisplay normalises internally:
       const normalised: Review =
         typeof review === "string"
           ? { format: "plain", body: review }
           : review;
  -> Walker dispatches:
       case "plain": split on \n\n, render <p> per paragraph (no italic,
                     no curly quotes — plain text).
       case "rich":  walk ProseMirror JSON.
```

Save calls `updateBook` with the discriminated shape. Legacy plain
reviews are persisted as `{ format: "plain", body }` on first save;
until then they remain in storage as `string` (no bulk migration, D6).

## 4. Component breakdown

### `Toggle` (NEW, in `src/components/ui/toggle.tsx`)

- **Purpose:** shadcn-style wrapper around `@radix-ui/react-toggle`
  (re-exported as `Toggle` from the `radix-ui` umbrella package, already
  a project dep).
- **Variants:** `default` (subtle hover), `outline` (border).
- **Sizes:** `sm`, `default`, `lg`, `xs` (matching button sizing).
- **Tests:** none. Pure shadcn boilerplate. Mirrors
  `src/components/ui/button.tsx` (no test).

### `Review` type (NEW, in `src/types/review.ts`)

```ts
import type { JSONContent } from "@tiptap/core";

export interface PlainReview {
  format: "plain";
  body: string;
}
export interface RichReview {
  format: "rich";
  body: JSONContent;
}
export type Review = PlainReview | RichReview;
export type ReviewInput = Review;
```

- `JSONContent` is exported by `@tiptap/core` (no re-export needed).
- `ReviewInput === Review` because the form has no id / createdAt
  (review is a single field, not a sub-aggregate with a lifecycle).
- **Tests:** none at the type level. Compile-time check.

### `Book.review` (MODIFIED, in `src/types/book.ts`)

```ts
review?: Review | string; // string is legacy; validator normalises
```

- The `| string` keeps the storage load side forgiving. Read code
  normalises on the fly. Write code (the validator) rejects any shape
  that isn't a valid `Review`.
- The JSDoc above the field is updated: removed the "Will be upgraded
  to a structured rich-text state in a future spec" note (it is now
  upgraded).

### `src/lib/rich-text/schema.ts` (NEW)

Exports the TipTap extensions list used by `ReviewEditor` and
(optionally) reused by spec 010:

```ts
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";

export const richTextExtensions = [
  StarterKit.configure({ heading: false, codeBlock: false, code: false }),
  Underline,
  Highlight,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
];
```

Notes:
- `StarterKit.configure({ heading: false, codeBlock: false, code: false })`
  explicitly disables the extensions we don't want (D5).
- `Link.configure({ openOnClick: false })` — read mode uses the
  walker, not the editor. The editor's link-click navigation would
  conflict with the form behaviour. We re-enable link navigation
  on save in D3 / D-P3.
- `autolink: true` — typing a URL automatically links. Small UX win.
- `HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }`
  is for when the editor *is* in a navigation context (we aren't
  there, but spec 010 might be — keep config portable).

### `src/lib/rich-text/sanitize.ts` (NEW)

```ts
const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

export function sanitizeHref(href: string): string | undefined {
  try {
    const url = new URL(href, "https://example.invalid/");
    if (ALLOWED_SCHEMES.has(url.protocol)) return url.toString();
    return undefined;
  } catch {
    return undefined;
  }
}
```

- **Tests:** ≥ 5
  - `http://example.com` → ok
  - `https://example.com` → ok
  - `mailto:a@b` → ok
  - `javascript:alert(1)` → undefined
  - `data:text/html,...` → undefined
  - `file:///etc/passwd` → undefined
  - `vbscript:msgbox(1)` → undefined
  - malformed URL → undefined

### `src/lib/rich-text/walker.tsx` (NEW)

Pure function: `walk(node: JSONContent): ReactNode`. Visits known
nodes and marks; drops unknown ones. No TipTap runtime, no DOM, no
`<EditorContent>` — just a recursive visitor that returns React
elements.

```ts
import { Fragment, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { sanitizeHref } from "./sanitize";

export function walk(doc: JSONContent): ReactNode { ... }
```

Implementation outline:

- `doc.type === "doc"` → iterate `doc.content`, return `<>{walk(c)}…</>`.
- `node.type === "paragraph"` → `<p>{walkChildren(node)}</p>`.
- `node.type === "text"` → return a `<TextRun>` that applies marks:
  - bold → `<strong>`
  - italic → `<em>`
  - underline → `<u>`
  - strike → `<s>`
  - highlight → `<mark>` (CSS class `bg-yellow-200/60` for cozy look)
  - link → `<a href={sanitize(href)} target="_blank" rel="noopener noreferrer">`
    if scheme allowed, else the link is dropped and the text rendered
    without `<a>` (dev-only `console.warn`).
- `node.type === "bulletList"` → `<ul>` of `<li>`s.
- `node.type === "orderedList"` → `<ol>` of `<li>`s.
- `node.type === "listItem"` → `<li>`.
- `node.type === "blockquote"` → `<blockquote>`.
- `node.type === "hardBreak"` → `<br />`.
- Unknown node/mark → ignored (dropped from output). One dev-only
  `console.warn` per session per unknown type, to keep noise low.

**Tests:** ≥ 8 (in `src/lib/rich-text/walker.test.tsx`)
- plain text node → string rendered
- paragraph wraps content in `<p>`
- bold/italic/underline/strike/highlight each wrap a text node
- nested marks (bold+italic) compose
- bullet list renders `<ul><li>...</li></ul>`
- ordered list renders `<ol><li>...</li></ol>`
- nested list inside list item
- link with `http` scheme renders `<a target="_blank" rel="noopener noreferrer">`
- link with `javascript:` scheme is dropped (no `<a>`, only the text)
- blockquote renders `<blockquote>`
- hardBreak renders `<br />`
- empty doc renders nothing
- unknown node type is dropped silently
- marks on text node are applied in a stable order

### `validateReview` (REWRITTEN, in `src/lib/validation/book.ts`)

Replaces the current plain-text validator with a shape-aware one:

```ts
function isProseMirrorDoc(value: unknown): value is JSONContent {
  if (!isObject(value)) return false;
  if (value["type"] !== "doc") return false;
  if (!Array.isArray(value["content"])) return false;
  // Recursive shape check is out of scope — TipTap's schema
  // enforces this when the JSON is editor-produced. We only
  // verify the top-level shape here.
  return true;
}

function validateReview(
  raw: unknown,
  errors: Record<string, string>
): Review | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return undefined;
    if (trimmed.length > REVIEW_MAX) {
      errors.review = `Review must be ${REVIEW_MAX} characters or fewer.`;
      return undefined;
    }
    return { format: "plain", body: trimmed };
  }
  if (!isObject(raw)) {
    errors.review = "Review shape is invalid.";
    return undefined;
  }
  if (raw["format"] === "plain") {
    if (typeof raw["body"] !== "string") {
      errors.review = "Plain review body must be a string.";
      return undefined;
    }
    const trimmed = raw["body"].trim();
    if (trimmed.length === 0) return undefined;
    if (trimmed.length > REVIEW_MAX) {
      errors.review = `Review must be ${REVIEW_MAX} characters or fewer.`;
      return undefined;
    }
    return { format: "plain", body: trimmed };
  }
  if (raw["format"] === "rich") {
    if (!isProseMirrorDoc(raw["body"])) {
      errors.review = "Rich review body is not a valid ProseMirror document.";
      return undefined;
    }
    return { format: "rich", body: raw["body"] as JSONContent };
  }
  errors.review = "Review format must be 'plain' or 'rich'.";
  return undefined;
}
```

- `REVIEW_MAX` is the existing constant (10 000 chars). The cap is
  applied to the body string (plain case) and *not* to the JSON
  serialisation length (rich case). The editor enforces practical
  limits on document size via TipTap.
- `isProseMirrorDoc` is intentionally a *light* check — the
  ProseMirror schema is the source of truth. A tampered JSON that
  passes `isProseMirrorDoc` but contains unknown nodes is dropped
  on walk (D3, structural sanitisation).
- **Tests:** ≥ 8 (in `tests/lib/validation/review.test.ts`):
  - legacy string → `{ format: "plain", body }` (D6)
  - legacy empty string → `undefined`
  - legacy whitespace-only → `undefined`
  - legacy too long → error
  - new `{ format: "plain", body }` → returned
  - new `{ format: "plain", body: "" }` → `undefined`
  - new `{ format: "rich", body: <doc> }` → returned
  - new `{ format: "rich", body: <non-doc> }` → error
  - new `{ format: "rich", body: <doc with empty content> }` → returned
    (walker handles empty doc → no output)
  - `format` is neither "plain" nor "rich" → error
  - body is missing for plain → error
  - body is non-string for plain → error
  - non-object, non-string input → error

### `EditorToolbar` (NEW, in `src/features/review/`)

- **Props:** `{ editor: Editor | null }`.
- **State:** none of its own; reads `editor.isActive("...")` via
  `useEditorState` to keep the toolbar in sync without forcing
  re-renders of the editor content.
- **Renders:** a `<div className="flex flex-wrap gap-1">` of shadcn
  `Toggle` components:
  - **B** (bold) — `editor.isActive("bold")`, toggle bold
  - *I* (italic) — `editor.isActive("italic")`, toggle italic
  - U (underline) — `editor.isActive("underline")`, toggle underline
  - ~~S~~ (strike) — `editor.isActive("strike")`, toggle strike
  - ✦ Hl (highlight) — `editor.isActive("highlight")`, toggle highlight
  - • List (bullet list) — `editor.isActive("bulletList")`, toggle
  - 1. List (ordered list) — `editor.isActive("orderedList")`, toggle
  - ❝ Quote (blockquote) — `editor.isActive("blockquote")`, toggle
  - 🔗 Link — opens a small prompt for the URL, calls
    `editor.chain().focus().setLink({ href })`. If the URL is not in
    the allow-list, the editor's `Link` extension already rejects it
    (TipTap validates); we also call `sanitizeHref` and only call
    `setLink` if it returns a string. The toolbar's button is `aria-label`
    "Add link" / "Remove link" depending on `editor.isActive("link")`.
- **Icons:** from `lucide-react` (already a dep). `Bold`, `Italic`,
  `Underline` (or `LetterTextU`), `Strikethrough`, `Highlighter`,
  `List`, `ListOrdered`, `Quote`, `Link`.
- **Tooltips:** optional `<Tooltip>` wrapper. Out of scope for v1 if
  the project has no existing `Tooltip` primitive; we can wrap with
  `title="Bold (Cmd+B)"` instead. (D-P8.)
- **Tests:** none. Presentational. Behaviour captured by
  `ReviewEditor` test.

### `ReviewEditor` (NEW, in `src/features/review/`)

- **Props:**
  ```ts
  {
    initialValue: Review;
    onSave: (review: Review) => Promise<void>;
    onCancel: () => void;
  }
  ```
- **State:**
  - `editor: Editor | null` (from `useEditor`).
  - `errors: Record<string, string>`.
  - `isSaving: boolean`.
- **Renders:**
  ```tsx
  <div className="space-y-3">
    <EditorToolbar editor={editor} />
    <div className="border border-input rounded-md p-3 min-h-32">
      <EditorContent editor={editor} />
    </div>
    {errors.review && <p role="alert">{errors.review}</p>}
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
      <Button onClick={handleSave} disabled={isSaving || editor === null}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  </div>
  ```
- **Behaviour:**
  - `useEditor({ extensions: richTextExtensions, content: initialValue,
    immediatelyRender: false })` — `immediatelyRender: false` for
    Next.js SSR safety (per the official TipTap install guide).
  - `handleSave()`:
    1. Get `doc = editor.getJSON()`.
    2. Build a `Review`: `{ format: "rich", body: doc }`.
    3. Validate via `validateReview(...)`.
    4. On ok: `await onSave(review)`.
    5. On error: `toast.error("Couldn't save review. Try again.")`,
       stay in edit mode.
- **Tests:** ≥ 5 (in `tests/features/review/ReviewEditor.test.tsx`):
  - mounts with the toolbar and a content area
  - toolbar Bold button toggles the bold mark (assert against
    `editor.getJSON()` via a test handle or against the rendered
    `<strong>`)
  - `Save` calls `onSave` with `{ format: "rich", body: <doc> }`
  - `Save` while in flight disables buttons and shows "Saving…"
  - `Cancel` calls `onCancel` and does not call `onSave`
  - `onSave` rejection → toast, stays open
  - typing in the editor updates the content (sanity)

### `ReviewDisplay` (NEW, in `src/features/review/`)

- **Props:** `{ review: Review | string | undefined }`.
- **State:** none. Pure render.
- **Renders:**
  - `undefined` → `<p className="text-muted-foreground text-sm" data-testid="review-empty">No review yet.</p>`.
  - legacy `string` → normalised to `{ format: "plain", body }` → one `<p>` per `\n\n`-separated block, plain text, `whitespace-pre-line` for inline newlines.
  - `{ format: "plain", body }` → same as above.
  - `{ format: "rich", body }` → `<div data-testid="review-rich">{walk(body)}</div>`.
- **Tests:** ≥ 4 (in `tests/features/review/ReviewDisplay.test.tsx`):
  - undefined → "No review yet." + testid
  - legacy string → paragraphs with text
  - rich doc with paragraph + bold → renders `<p><strong>…</strong></p>`
  - rich doc with link to `https://` → `<a target="_blank" rel="noopener noreferrer">`
  - rich doc with link to `javascript:` → no `<a>`, just text

### `ReviewSection` (MODIFIED)

- **State:** same as before (`mode`, `errors`, `isUpdating`); the
  `draft: string` state is removed — `ReviewEditor` owns the draft
  internally via the TipTap editor instance.
- **Renders:**
  - read mode → `<ReviewDisplay review={book.review} />` + an
    "Edit review" / "Write review" button.
  - edit mode → `<ReviewEditor initialValue={normalisedReview}
    onSave={handleSave} onCancel={() => setMode("read")} />`.
- **Normalisation:** `book.review` is `Review | string | undefined`;
  `ReviewSection` passes it to `ReviewDisplay` raw (Display handles
  normalisation) and to `ReviewEditor` normalised (the editor can't
  consume a string).
- **Tests:** existing 14 tests are rewritten:
  - read mode with legacy string → walker renders as paragraphs
  - read mode with new rich → walker renders formatted
  - read mode empty → "No review yet."
  - click "Edit review" → opens `ReviewEditor`
  - `onSave` from `ReviewEditor` → calls `updateBook` with new shape
  - `onSave` rejection → toast, edit mode stays open
  - Cancel → returns to read mode without save
  - "Saving…" label appears while in flight

## 5. Storage adapter changes

**None.** `StorageAdapter` keeps its four methods
(`listBooks`, `addBook`, `updateBook`, `deleteBook`). The review is
persisted as part of the `Book` record.

`LocalStorageAdapter` is unchanged: it serialises / deserialises the
whole `Book` object. The new `review` shape (`{ format, body }`) and
the legacy `review: string` are both round-trip-safe.

## 6. Decisions & trade-offs

- **D-P1. Walker is co-located with the schema in `src/lib/rich-text/`,
  not in `tests/`.** Pure-function modules live next to their tests
  in the React community convention. The rest of the project keeps
  tests under `tests/`. The walker is the only "feature-internal
  utility" that benefits from co-location; everything else stays in
  `tests/`. Spec 010 follows the same rule for the (much smaller)
  quote walker.
- **D-P2. `Review` lives in `src/types/review.ts`, not in
  `src/types/book.ts`.** Discriminated union with a third-party JSON
  type (`JSONContent`) deserves its own file. Mirrors the project's
  spec-009 decision for `Quote` (D-P2 in `specs/009/plan.md`).
- **D-P3. `Link` is configured with `openOnClick: false` and
  `HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }`.**
  The editor's default click behaviour would navigate, but the
  editor is inside a form; we don't want nav-on-select. Read mode
  uses the walker, where the link is rendered with the right
  attributes.
- **D-P4. The walker and sanitize live in `src/lib/rich-text/` so
  spec 010 (rich-text quote) can import them without coupling to
  `src/features/review/`.** This is the project-level "small surface
  area" principle (constitution §3): a shared utility belongs in
  `lib`, not in a feature folder.
- **D-P5. `isProseMirrorDoc` is a shallow check, not a recursive
  schema validator.** ProseMirror's schema is the source of truth.
  We don't redefine the schema in the validator; we just verify
  `type === "doc"` and `content` is an array. Unknown nodes inside
  the doc are dropped on walk (D3).
- **D-P6. `REVIEW_MAX` (10 000) applies to plain-text body only.**
  For rich reviews we don't enforce a string length — the TipTap
  editor and the browser handle large documents. Trade-off: a
  malicious user could in principle write a 10 MB JSON to
  localStorage, but the spec 009 cap on quotes (200 entries) gives
  a similar precedent for trusting the user's input. Risk is low
  for MVP (D7).
- **D-P7. `useEditorState` from TipTap for toolbar reactive state.**
  Avoids re-rendering the editor's content on every toolbar tick.
  Trade-off: extra dep on TipTap's React API surface, but it's
  documented and stable. The alternative — `editor.on('selectionUpdate')`
  — is more imperative and easier to get wrong.
- **D-P8. No `<Tooltip>` primitive for the toolbar.** The project
  doesn't have one. `title="..."` is the fallback. Adding a new
  primitive for one feature is overkill; we can do it in a
  follow-up if the toolbar becomes busy.
- **D-P9. Editor mounts in `ReviewSection`'s edit mode only.** Read
  mode is a pure walker render — no TipTap instance. Saves CPU on
  the detail page (which is rendered for every book view) and
  avoids contenteditable chrome in the cozy read view.
- **D-P10. `immediatelyRender: false` on `useEditor`.** Next.js
  App Router renders the page on the server first. TipTap's
  editor instance can't run on the server. The flag defers the
  editor mount to the client, matching the official TipTap
  install guide. Without this flag, SSR throws.

## 7. Risks

- **Bundle size.** `@tiptap/*` adds ~50–60 kB gzipped to the detail
  page (StarterKit + Underline + Highlight + Link). The detail page
  is the only place the editor mounts; the shelf list and add-book
  flow are not affected. Acceptable for MVP; we measure in T8.
- **TipTap SSR behaviour.** Mitigated by `immediatelyRender: false`
  (D-P10). Risk: low (well-documented).
- **`isProseMirrorDoc` shallow check.** A tampered doc that passes
  the check but contains garbage is dropped on walk. Risk: low
  (local data only).
- **Two tabs editing the same review.** Same posture as spec 007.
  Last write wins. Acceptable.
- **Walker silently drops unknown nodes.** If a future spec adds
  a new node type to `richTextExtensions` and forgets to update
  the walker, the read mode loses that content. Mitigation: T2
  sets a single dev-only `console.warn` per unknown type per
  session. The T8 verification step is to add a new extension
  temporarily and confirm the warn fires.
- **Link scheme allow-list is opinionated.** `mailto:` is allowed;
  `tel:` is not. If a user wants to link a phone number, they're
  out of luck. Acceptable for MVP — book reviews rarely link
  phone numbers. Revisit if a user complains.
- **`<Toggle>` wrapper is the only new UI primitive.** If the
  rest of the app doesn't use `<Toggle>` after 008, the wrapper
  is a one-off. Mitigation: spec 010 will reuse it (toolbar for
  quote rich-text), so it earns its keep.
- **Race condition in the section's `draft` removal.** Spec 007
  had a `draft: string` state in `ReviewSection`; spec 008 moves
  the draft into the TipTap instance inside `ReviewEditor`. If a
  user navigates away mid-edit, the draft is lost. Same posture
  as spec 007 (no auto-save). Acceptable.
- **shadcn `Toggle` from `radix-ui` umbrella has no `pressed`
  prop API guarantee.** The umbrellas are stable since v1, but
  semver could shift the re-export. Mitigation: pin
  `radix-ui: 1.4.3` (already pinned) and use the documented
  `pressed` / `defaultPressed` / `onPressedChange` API.

## 8. Rollout

- No feature flag, no migration (D6 — lazy at validator).
- Manual QA (per spec §6.3 / §11):
  1. Detail page, book with rich review — read mode renders the
     walker output (bold text, lists, links visible).
  2. Click "Edit review" — editor opens with toolbar.
  3. Type "Hello", select it, click **B** — toolbar Bold pressed,
     text in editor shows bold.
  4. Save — read mode re-renders with bold "Hello".
  5. Edit again, click **• List** — toolbar presses, editor shows
     bullet list.
  6. Add a link: select text, click 🔗, enter `https://example.com`
     — link is created. Save. Read mode shows the link as `<a>`.
  7. Edit again, try to add a link with `javascript:alert(1)` —
     prompt rejects (TipTap's Link validation), or our toolbar
     pre-check rejects, no link created. Save and confirm read
     mode has no `<a href="javascript:...">`.
  8. Reload — all changes persist.
  9. Detail page, book with **legacy** `review: "old text"` —
     read mode shows "old text" as a paragraph.
  10. Edit, save — storage now has `{ format: "plain", body: "old
      text" }` (lazy migration, D6).
  11. Edit legacy, add bold formatting, save — storage now has
      `{ format: "rich", body: <doc> }`.
  12. Storage failure: DevTools → setItem throws → toast appears,
      editor stays open, content preserved.
  13. Malformed JSON (manually edit devtools to put
      `{ format: "rich", body: "not a doc" }` in localStorage) →
      read mode shows "No review yet." (validator normalises to
      undefined), no crash.
  14. Empty rich review: save with all content removed → review
      is `undefined`, read mode shows "No review yet."
  15. Regression: Add / Edit / Delete book still work; Rating
      still works; Quote add/edit/delete still work.
  16. Regression: shelf list, add-book flow, edit-book flow all
      still work.
- Verification: `npm run lint && npm run test` pass; `tsc --noEmit`
  clean; `npm run build` succeeds; no new `any`; no new npm
  dependencies beyond the `@tiptap/*` MIT stack.
- Expected test count: ~310 total (~280 from spec 009 baseline
  + ~30 new from spec 008: walker 12–14, sanitize 8, validator
  8, ReviewEditor 5–7, ReviewDisplay 5, ReviewSection rewrite
  6–8).
