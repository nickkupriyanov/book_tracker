# Book Tracker

A cozy local-first web app for tracking the books you read. Built spec-first
with GitHub Spec Kit; the first shipped feature is
[`specs/001-add-book/`](./specs/001-add-book/spec.md).

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Command             | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Next.js dev server (port 3000)   |
| `npm run build`     | Production build                 |
| `npm run lint`      | ESLint (Next + TypeScript)       |
| `npm run test`      | Vitest, single run               |
| `npm run test:watch`| Vitest in watch mode             |

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** — strict, `noUncheckedIndexedAccess`, no `any`
- **Tailwind v4** — design tokens in `@theme` (no `tailwind.config.ts`)
- **shadcn/ui** — Radix-based primitives, cozy warm palette
- **Zustand** for in-memory state with narrow selectors
- **Vitest** + Testing Library for unit and component tests
- **localStorage** for persistence (behind a `StorageAdapter` interface
  that a future `HttpStorageAdapter` will conform to)

## Project layout

```
src/
├── app/                # Next.js App Router (page.tsx, ShelfClient.tsx)
├── components/         # Shared components (EmptyShelf, ui/)
├── features/           # Feature folders (e.g. add-book/)
├── lib/validation/     # Pure validators (tested in isolation)
├── state/              # Zustand stores
├── storage/            # StorageAdapter interface + LocalStorageAdapter
└── types/              # Domain types (the contract with the future backend)

specs/NNN-<slug>/      # One folder per feature: spec.md, plan.md, tasks.md
.specify/              # Constitution + templates (SDD scaffolding)
```

## Where to look

- **Principles** — [`.specify/memory/constitution.md`](./.specify/memory/constitution.md)
- **Conventions for AI agents** — [`AGENTS.md`](./AGENTS.md)
- **Feature specs** — [`specs/`](./specs), one folder per feature

## Development workflow

Spec-driven development, in this order:

1. Write `specs/NNN-<slug>/spec.md` (what and why).
2. Write `plan.md` (architecture and decisions).
3. Write `tasks.md` (atomic, one commit per task).
4. Implement task by task, ticking `[x]` on each acceptance line.
5. Verify with `npm run lint && npm run test` before declaring done.

Trivial fixes (typos, one-liners) skip the cycle.

## Roadmap

- **MVP (now):** localStorage-backed UI, single user, single device.
- **~Month 2:** introduce `HttpStorageAdapter` alongside the local one.
- **~Month 3:** separate backend service (Node / Go / Python) behind the
  same `StorageAdapter` interface.
