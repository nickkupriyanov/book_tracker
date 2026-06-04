# Spec: Rich-text Review

> **Status:** Deferred (placeholder)
> **Author:** —
> **Created:** 2026-06-04
> **Spec ID:** 008-rich-text-review
> **Constitution version:** see `.specify/memory/constitution.md`
> **Deferred from:** spec 007-review §2, §3 (D1, D9) and plan.md D-P9

---

## 1. Problem

The review field is currently plain text (spec 007). For longer reflections
users want light formatting: bold, italic, underline, paragraph breaks,
bullet/numbered lists, and a highlight colour for favourite passages.
Embedding a heavy editor in 007 was deferred to keep the MVP small and
avoid the XSS surface area of a rich-text API.

## 2. Goal

Upgrade the per-book `Book.review` from plain text to lightly formatted
text — bold / italic / underline / paragraphs / lists / highlight — using
a small, safe editor library that fits the cozy UI.

## 3. Non-goals

- No image embeds, tables, code blocks, headings, or collaborative editing.
- No Markdown import/export in MVP (can come later if it earns its keep).
- No per-formatting perms / roles — single user.
- No migration of legacy plain-text reviews into formatted reviews; the
  existing text is preserved verbatim and renders as paragraphs.

## 4. Library choice — open

Three real candidates (all flagged in spec 007 §3 D9):

- **Lexical** (Meta). Headless, tree-based, ~22 kB core. Strong types,
  React bindings, owned by Meta. Trendy in 2024–2025.
- **TipTap** (ProseMirror). Larger, more batteries-included, extension
  model. ~40–50 kB with default extensions.
- **Slate**. Smallest, most "roll your own" of the three. Less opinionated.

Open question (resolve before approval):
- **OQ-1.** Which library? Decision should weigh bundle size, XSS safety
  defaults, accessibility of the toolbar, and the look-and-feel cost of
  matching the cozy palette.
- **OQ-2.** Storage shape: keep `review: string` (store HTML / serialised
  JSON) or change to `review: { format: "plain" | "rich", body: string }`?
  Spec 007 plan already notes the validator will branch on this.
- **OQ-3.** Sanitisation: server-side (DOMPurify) on render vs. trust the
  editor's output. Constitution §5 forbids a backend in MVP, so for now
  sanitisation is client-side only.

## 5. Why this spec exists now (as a placeholder)

Spec 007 was finished without spinning up this work — `specs/008-*/` was
never created. Filing this stub so the deferred decision is visible in
the repo and we don't lose the library-evaluation context when we pick it
up.

## 6. Acceptance criteria

A reviewer can tick each box without asking a clarifying question.

- [ ] Library chosen and rationale recorded in plan.md (D-lib).
- [ ] `Book.review` storage shape decided (string vs. discriminated).
- [ ] Toolbar matches cozy UI (warm palette, no glassmorphism, per
      constitution §2).
- [ ] Bold / italic / underline / paragraph / list / highlight all work.
- [ ] Legacy plain-text reviews render unchanged.
- [ ] XSS surface reviewed; sanitisation strategy in plan.md.
- [ ] `npm run lint && npm run test` green.
- [ ] Detail page read-mode renders formatted review (no raw HTML in DOM
      except through the editor's output).

## 7. Out of scope (for this spec)

- Comments, edit history, version diffs.
- Markdown round-trip.
- Image / link previews.
- Mobile-specific toolbar layout (defer until we test on a phone).

## 8. Open questions

- See §4 OQ-1 / OQ-2 / OQ-3.
- Should toolbar buttons use shadcn `Toggle` / `Button` primitives or
  the editor's defaults? (Affects whether the editor "feels" native.)
