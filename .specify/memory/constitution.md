# Constitution — Book Tracker

This document captures the **non-negotiable principles** of the Book Tracker project.
Every spec, plan, and task must respect these principles. If a decision conflicts with
the constitution, either change the decision or amend the constitution first.

Last amended: 2026-06-09 (amended 2026-06-09: post-MVP amendment — see §7)

---

## 1. Product principles

- **Cozy over clever.** Calm, warm, book-inspired. No dashboards, no cold metrics walls.
- **Local-first demo mode.** Books live in the browser (localStorage) for public demo
  and local testing. This is the default mode.
- **Post-MVP HTTP mode.** A spec may introduce a backend persistence mode alongside
  the localStorage demo mode. While the demo mode is the default, approved post-MVP
  specs (starting with spec 023) may add authenticated, user-scoped HTTP persistence
  for VPS deployments. Demo/public testers continue to use localStorage.
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

- Public-facing auth, public registration, social login.
- Social features (sharing, friends, feeds).
- Analytics, telemetry, third-party scripts.
- E-commerce, affiliate links, ads.

### 5.1 Post-MVP scope (introduced by spec 023)

Approved post-MVP specs may add:

- An optional Python backend (`backend/`) for HTTP persistence behind a
  `NEXT_PUBLIC_STORAGE_MODE=http` flag. The default is still localStorage.
- Authenticated HTTP mode with user accounts created via a backend CLI
  (no public registration in v1). Data is scoped by `user_id` from v1.
- Short-lived JWT access tokens held in memory only (no refresh tokens,
  no `localStorage`/`sessionStorage`/cookie persistence in v1).

## 6. Amending the constitution

Constitution changes are themselves spec-driven: open a discussion, update the
file, bump the date above. Don't sneak principle changes into a feature PR.

## 7. Post-MVP amendment (2026-06-09, spec 023)

This amendment explicitly opens the door to a Python backend and authenticated
HTTP mode while preserving the localStorage/no-auth demo path:

- §1, §3, §5, and the AGENTS guide are updated together as part of T0 of
  spec 023.
- The localStorage demo mode remains the default and does not require any
  backend or login.
- The HTTP mode is opt-in via `NEXT_PUBLIC_STORAGE_MODE=http` and requires
  the documented frontend and backend environment variables. It is a
  deployment concern, not a runtime user setting.
- Auth tokens in HTTP mode are in-memory only. Reloading the page logs the
  user out by design.
- Storage remains abstracted behind `StorageAdapter`. New code may not
  introduce direct dependencies on PostgreSQL, FastAPI, JWT, or localStorage
  from the Zustand store or from feature components.
- No public registration endpoint, refresh tokens, or persistent token
  storage are added in v1. Future specs may extend this.
