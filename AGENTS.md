# AGENTS.md

Quick-reference for AI agents and humans working in this repo. The
**principles** live in `.specify/memory/constitution.md` — this file points
to them and lists the practical commands.

## Project
Book Tracker — cozy web app for tracking read books.

## Stack
- Next.js
- TypeScript (strict, no `any` — see constitution §3.1)
- Tailwind v4 (no `tailwind.config.ts`; tokens in `@theme` inside CSS)
- shadcn/ui
- Zustand (in-memory state)
- Vitest (tests)
- localStorage for MVP (swappable via `StorageAdapter`)

## Commands
- Install: npm install
- Dev: npm run dev
- Lint: npm run lint
- Test: npm run test

## UI Rules
- Use shadcn/ui components before raw HTML controls.
- Avoid dashboard-like layouts.
- No glassmorphism.
- Prefer calm, warm, book-inspired UI.

## Development Rules
- Do not add backend unless explicitly requested (a future spec will).
- Do not introduce auth in MVP.
- Add loading, error and empty states where relevant.
- Keep components small and readable.

## SDD Workflow
This project uses **spec-driven development** (GitHub Spec Kit style).

```
.specify/memory/constitution.md   # principles — read first, non-negotiable
.specify/templates/spec.md         # blank spec template
.specify/templates/plan.md         # blank plan template
.specify/templates/tasks.md        # blank tasks template
specs/NNN-<slug>/                  # one folder per feature
  spec.md
  plan.md
  tasks.md
```

For every **non-trivial** feature:
1. Copy `spec.md` template into `specs/NNN-<slug>/spec.md` and fill it.
2. Review the spec against the constitution. Resolve open questions.
3. Copy `plan.md` → `specs/NNN-<slug>/plan.md`. Break the spec into architecture.
4. Copy `tasks.md` → `specs/NNN-<slug>/tasks.md`. Break the plan into commits.
5. Implement task by task. Mark each `[x]` only when acceptance line is met.
6. Run `npm run lint && npm run test` before declaring done.

Trivial fixes (typos, one-line bugs) skip the cycle.

## Plan
- MVP: UI features only, localStorage-backed.
- ~Month 2: introduce `StorageAdapter` HTTP impl alongside localStorage.
- ~Month 3: separate backend service (Node/Go/Python) behind the same adapter.