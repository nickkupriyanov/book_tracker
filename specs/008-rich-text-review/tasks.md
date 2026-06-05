# Tasks: Rich-text Review

> **Status:** Draft
> **Spec:** `../spec.md`
> **Plan:** `../plan.md`

Each task is small enough to be one commit. Mark a task `[x]` only when
its acceptance line is satisfied and `npm run lint && npm run test`
passes.

Order matters: T1 sets up the npm surface; T2 establishes the type
contract and the JSON-walker / sanitize foundation (TDD); T3 rewrites
the validator (TDD, depends on T2); T4–T5 build the editor's
presentational pieces; T6 is the read-mode display; T7 wires the
section; T8 polishes and verifies.

---

## T1. Install `@tiptap/*` packages + shadcn `Toggle` primitive

- **Files:**
  `package.json` (modified — `npm install` adds 5 deps),
  `src/components/ui/toggle.tsx` (new — shadcn-style wrapper around
  `Toggle` from `radix-ui` umbrella).
- **Acceptance:**
  - `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`,
    `@tiptap/extension-underline`, `@tiptap/extension-highlight`,
    `@tiptap/extension-link` are in `package.json` `dependencies`,
    pinned to the latest stable.
  - `src/components/ui/toggle.tsx` exists, exports `Toggle` and
    `toggleVariants`, has `default`, `outline` variants and `sm`,
    `default`, `lg`, `xs` sizes (matching `button.tsx` style).
  - `Toggle` is `import { Toggle } from "radix-ui"` (umbrella) —
    no new npm dep for the toggle itself.
  - `npm run lint && npm run test` still green (no behaviour change).
- **Notes:** no new `any`. `radix-ui` v1.4.3 already in
  `package.json`; we just consume a new sub-export.

## T2. `Review` type + `Book.review` shape + walker + sanitize (TDD)

- **Files:**
  `src/types/review.ts` (new),
  `src/types/book.ts` (modified — `review?: Review | string`),
  `src/lib/rich-text/schema.ts` (new),
  `src/lib/rich-text/sanitize.ts` (new),
  `src/lib/rich-text/walker.tsx` (new),
  `src/lib/rich-text/sanitize.test.ts` (new, co-located),
  `src/lib/rich-text/walker.test.tsx` (new, co-located).
- **Acceptance:**
  - `src/types/review.ts` exports `PlainReview`, `RichReview`,
    `Review`, `ReviewInput` exactly as in plan §4.
  - `JSONContent` is imported from `@tiptap/core` (no re-export).
  - `Book.review` in `src/types/book.ts` is `Review | string |
    undefined`; JSDoc updated to drop the "future spec" note.
  - `src/lib/rich-text/schema.ts` exports `richTextExtensions`
    exactly as in plan §4. `Link` is configured with
    `openOnClick: false`, `autolink: true`, `HTMLAttributes: {
    rel: "noopener noreferrer", target: "_blank" }`.
    `StarterKit` has `heading`, `codeBlock`, `code` disabled.
  - `sanitizeHref(href)` returns the URL iff the scheme is in
    `["http:", "https:", "mailto:"]`, else `undefined`. 8 unit
    tests cover: http, https, mailto ok; javascript, data, file,
    vbscript, malformed rejected.
  - `walk(doc)` returns a `ReactNode` for any `JSONContent`:
    known node types (`doc`, `paragraph`, `bulletList`,
    `orderedList`, `listItem`, `blockquote`, `hardBreak`, `text`)
    are rendered; known marks (`bold`, `italic`, `underline`,
    `strike`, `highlight`, `link`) wrap the text. Unknown
    nodes/marks are dropped with one dev-only `console.warn` per
    session per type. Links go through `sanitizeHref`; rejected
    schemes render as plain text without `<a>`. ≥ 12 unit tests
    in `walker.test.tsx`.
  - `npm run lint && npm run test` green; ≥ 20 new tests in T2
    total.
- **Notes:** TDD — red-green-refactor for sanitize and walker.
  The walker tests use `render` from `@testing-library/react` to
  assert on the rendered tree. No TipTap instance is mounted in
  these tests — the walker is a pure function.

## T3. `validateReview` rewrite (TDD)

- **Files:**
  `src/lib/validation/book.ts` (modified),
  `tests/lib/validation/review.test.ts` (new).
- **Acceptance:**
  - The existing plain-text `validateReview` is replaced with the
    shape-aware version from plan §4.
  - `isProseMirrorDoc` helper is private to the file.
  - `REVIEW_MAX` (10 000) is applied to plain bodies (string and
    `{ format: "plain", body }`).
  - Legacy `string` input is normalised to `{ format: "plain",
    body }` on success (D6).
  - Empty / whitespace-only plain input returns `undefined`.
  - `format: "rich"` requires `body` to satisfy `isProseMirrorDoc`
    (top-level `type === "doc"` and array `content`).
  - Unknown `format` is rejected with `errors.review`.
  - `validateBookInput` continues to call `validateReview` and
    spread the result into the `BookInput` value when defined.
  - ≥ 12 unit tests in `tests/lib/validation/review.test.ts`
    covering the matrix in plan §4.
  - `npm run lint && npm run test` green.
- **Notes:** TDD. The shape matrix is the most important
  acceptance: the lazy migration (D6) hinges on the validator
  accepting legacy strings.

## T4. `EditorToolbar` (presentational, bound to TipTap editor)

- **Files:**
  `src/features/review/EditorToolbar.tsx` (new),
  `src/features/review/index.ts` (modified — add export).
- **Acceptance:**
  - Exports `EditorToolbar` with props `{ editor: Editor | null }`.
  - Renders a `<div className="flex flex-wrap gap-1">` of shadcn
    `Toggle` components for: **B**, *I*, U, ~~S~~, ✦ Hl, • List,
    1. List, ❝ Quote, 🔗 Link.
  - Uses `useEditorState` from `@tiptap/react` to read
    `isActive("...")` reactively.
  - Each toggle calls `editor.chain().focus().toggleX().run()`.
  - Link button opens a `window.prompt` (or a small inline input
    — see D-P8) and calls `setLink({ href: sanitizeHref(input) })`
    iff `sanitizeHref` returns a string. If `sanitizeHref` returns
    `undefined`, the toolbar toasts "Invalid link URL." and does
    not call `setLink`.
  - Icons from `lucide-react` (already a dep).
  - Each button has an `aria-label` and a `title` for the
    keyboard shortcut (`Cmd+B`, etc.).
  - No tests — presentational. Behaviour is captured by the
    `ReviewEditor` test (T5).
  - `npm run lint && npm run test` green.
- **Notes:** per the plan, we use `title=` for tooltips (no
  shadcn `Tooltip` primitive yet). If `useEditorState` proves
  problematic in tests, fall back to `editor.isActive` inside a
  per-render closure — that re-renders the toolbar on every
  selection update, which is fine for a 9-button toolbar.

## T5. `ReviewEditor` (TipTap wrapper)

- **Files:**
  `src/features/review/ReviewEditor.tsx` (new),
  `src/features/review/index.ts` (modified — add export),
  `tests/features/review/ReviewEditor.test.tsx` (new).
- **Acceptance:**
  - Props: `{ initialValue: Review; onSave: (review: Review) =>
    Promise<void>; onCancel: () => void }`.
  - State: `editor: Editor | null`, `errors`, `isSaving`.
  - Uses `useEditor({ extensions: richTextExtensions, content:
    initialValue, immediatelyRender: false })`.
  - Renders `<EditorToolbar editor={editor} />` + a styled
    `<EditorContent>` container + Save/Cancel buttons.
  - `handleSave()`:
    1. `editor === null` → return.
    2. `doc = editor.getJSON()`.
    3. `result = validateReview({ format: "rich", body: doc })`.
    4. On `!ok`: set `errors.review` and return.
    5. Set `isSaving(true)`. `try { await onSave(result.value) }
    catch { toast.error("Couldn't save review. Try again.") }
    finally { setIsSaving(false) }`.
  - Cancel: `onCancel()`. Save disabled when `editor === null` or
    `isSaving`. Save label flips to "Saving…".
  - ≥ 5 tests in `ReviewEditor.test.tsx`:
    - mounts with toolbar and content area
    - clicking **B** makes the toolbar Bold toggle pressed
    - save calls `onSave` with `{ format: "rich", body: <doc> }`
    - save while in flight disables buttons
    - cancel calls `onCancel` and does not call `onSave`
    - `onSave` rejection → toast, editor stays open
  - `npm run lint && npm run test` green.
- **Notes:** the editor's `content` prop is `initialValue` (a
  `Review`). For `format: "plain"`, the editor needs a JSON
  representation; we wrap the plain text in a one-paragraph
  ProseMirror doc on mount, and convert back to plain on save if
  the user didn't add any marks (i.e. if the doc is just one
  empty paragraph, save as plain). See D-P6 in plan.

## T6. `ReviewDisplay` (read mode using the walker)

- **Files:**
  `src/features/review/ReviewDisplay.tsx` (new),
  `src/features/review/index.ts` (modified — add export),
  `tests/features/review/ReviewDisplay.test.tsx` (new).
- **Acceptance:**
  - Props: `{ review: Review | string | undefined }`.
  - Renders:
    - `undefined` → `<p data-testid="review-empty">No review yet.</p>`.
    - legacy `string` → normalised, rendered as paragraphs
      (split on `\n\n`, `<p className="whitespace-pre-line">`).
    - `{ format: "plain", body }` → paragraphs.
    - `{ format: "rich", body }` → `<div data-testid="review-rich">{walk(body)}</div>`.
  - ≥ 5 tests in `ReviewDisplay.test.tsx`:
    - undefined → "No review yet."
    - legacy string → paragraphs with text
    - rich doc with paragraph + bold → `<p><strong>…</strong></p>`
    - rich doc with link to `https://` → `<a target="_blank" rel="noopener noreferrer">`
    - rich doc with link to `javascript:` → no `<a>`, just text
  - `npm run lint && npm run test` green.
- **Notes:** presentational, no `useBookLibrary` dependency.
  The component is pure: given a `Review`, it renders the same
  tree every time.

## T7. `ReviewSection` rewrite (wire the new components)

- **Files:**
  `src/features/review/ReviewSection.tsx` (modified),
  `tests/features/review/ReviewSection.test.tsx` (modified —
  rewrite).
- **Acceptance:**
  - The existing Textarea-based read/edit modes are replaced.
  - Read mode: renders `<ReviewDisplay review={book.review} />`
    + an "Edit review" / "Write review" button (variant matches
    spec 007: ghost when there's a review, outline when empty).
  - Edit mode: renders `<ReviewEditor initialValue={normalised}
    onSave={handleSave} onCancel={() => setMode("read")} />`.
  - `book.review` is `Review | string | undefined`; we
    normalise to `Review` for `ReviewEditor` (since it can't
    consume a string) and pass raw to `ReviewDisplay` (which
    handles its own normalisation).
  - `handleSave(review)` calls `useBookLibrary.updateBook(book.id,
    { ...book, review })` and switches to read mode. On
    rejection, toasts and stays in edit mode.
  - The existing 14 tests are rewritten as 6–8 new tests:
    - read mode with legacy string → walker renders as paragraphs
    - read mode with new rich → walker renders formatted
    - read mode empty → "No review yet."
    - click "Edit review" → `ReviewEditor` mounts
    - `onSave` from `ReviewEditor` → `updateBook` called with
      discriminated shape, mode switches to read
    - `onSave` rejection → toast, edit mode stays open
    - cancel returns to read mode without save
  - `npm run lint && npm run test` green.
- **Notes:** the `draft: string` state in `ReviewSection` is
  removed. The TipTap instance owns the draft.

## T8. Polish & verification

- **Files:** (no new code);
  `specs/008-rich-text-review/spec.md` updated to status
  `Implemented`,
  `specs/008-rich-text-review/plan.md` updated to status
  `Approved`,
  `specs/008-rich-text-review/tasks.md` updated to status `Done`
  (this file).
- **Acceptance:**
  - All spec §11 acceptance criteria are verified manually /
    via tests.
  - `npm run lint` passes with zero warnings.
  - `npm run test` passes: **~310/~310 across ~25 files**
    (~280 from spec 009 baseline + ~30 new from spec 008:
    sanitize 8, walker 12, validator 12, ReviewEditor 5–7,
    ReviewDisplay 5, ReviewSection rewrite 6–8).
  - `npx tsc --noEmit` clean.
  - `npm run build` succeeds. `/book/[id]` route bundle delta
    from `@tiptap/*` is recorded in the T8 commit message.
  - No new `any` introduced.
  - No new npm dependencies beyond the `@tiptap/*` MIT stack
    (the `Toggle` primitive reuses `radix-ui`, no new dep).
  - No raw HTML controls where shadcn has an equivalent (the
    editor mounts TipTap's `EditorContent` which is a div —
    acceptable; no buttons/inputs/dialogs/selects/textareas
    in the new code outside the shadcn wrappers).
  - Manual QA (per plan §8) is run.
- **Notes:** verification report (2026-06-05) recorded in
  the T8 commit message.
