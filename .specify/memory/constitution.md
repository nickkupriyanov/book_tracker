# Constitution — Book Tracker

This document captures the **non-negotiable principles** of the Book Tracker project.
Every spec, plan, and task must respect these principles. If a decision conflicts with
the constitution, either change the decision or amend the constitution first.

Last amended: 2026-06-02 (amended 2026-06-02: added strict types principle §3.1)

---

## 1. Product principles

- **Cozy over clever.** Calm, warm, book-inspired. No dashboards, no cold metrics walls.
- **Local-first for MVP.** Books live in the browser (localStorage). No backend unless
  explicitly introduced by a future spec.
- **No auth in MVP.** The app is single-user, on a single device.
- **Empty / loading / error states are first-class.** Every list, every async call.

## 2. UI principles

- **shadcn/ui before raw HTML.** Don't reinvent buttons, dialogs, inputs.
- **No glassmorphism.** No blurred translucent panels.
- **Components stay small and readable.** Split early, refactor late is fine;
  monolithic files are not.
- **Warm palette, generous spacing, soft corners.** Think library, not control panel.

## 3. Architecture principles

- **Storage is abstracted.** Code talks to a `StorageAdapter` interface, never to
  `localStorage` directly. This is what makes the future backend swap possible.
- **Types are the contract.** Domain types live in `src/types/` and are the
  single source of truth for shape. Backend, when it arrives, will conform to these types.
- **No premature abstractions.** A new layer needs a second concrete user before
  it earns its keep.
- **Small surface area.** A feature that needs three files is suspicious; one that
  needs ten is a refactor candidate.

### 3.1 Strict types

- **`any` is forbidden.** Use `unknown` for untyped inputs (form payloads,
  `JSON.parse` results, `localStorage` reads, third-party callbacks) and narrow
  with a type guard. `as any` is a code smell — if you think you need it, write
  the type guard or the discriminated union instead.
- **Escape hatch is rare and loud.** When a real reason exists (broken
  third-party `.d.ts`, an `eslint-disable` with an inline comment explaining
  the why and a TODO to fix upstream). Code review must call this out.
- **Why:** the type system is the contract with the future backend and with
  other agents reading this code. `any` is a hole in that contract that
  compounds.

## 4. Development principles

- **Spec-driven.** Every non-trivial feature goes through `spec → plan → tasks → code`.
  Trivial fixes (typos, one-line bugs) skip the cycle — judgement call.
- **TDD where it pays off.** Pure logic (validation, status transitions, filters)
  gets tests. Visual components get tests only when behavior is non-obvious.
- **Lint, typecheck, test are gates.** `npm run lint` and `npm run test` must pass
  before a task is "done". No exceptions, no `// eslint-disable` without comment.
- **Small commits, clear messages.** One task = one commit when possible.
- **Don't add dependencies casually.** If a library would replace < 30 lines of
  our own code, we write the 30 lines.

## 5. Out of scope (for MVP)

- Backend, server-side persistence, sync between devices.
- User accounts, authentication, multi-tenant anything.
- Social features (sharing, friends, feeds).
- Analytics, telemetry, third-party scripts.
- E-commerce, affiliate links, ads.

## 6. Amending the constitution

Constitution changes are themselves spec-driven: open a discussion, update the
file, bump the date above. Don't sneak principle changes into a feature PR.
