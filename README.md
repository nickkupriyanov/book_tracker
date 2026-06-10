# Book Tracker

A cozy web app for tracking the books you read. Built spec-first with
GitHub Spec Kit. Two storage modes are supported behind the same
`StorageAdapter` interface:

- **Local mode (default)** — `LocalStorageAdapter`, no backend required.
  Suitable for public demo and local testing.
- **HTTP mode** — `HttpStorageAdapter` against the FastAPI backend in
  [`backend/`](./backend). Authenticated, user-scoped persistence for
  VPS deployments. See [`specs/023-python-backend/`](./specs/023-python-backend/spec.md).

The first shipped feature is
[`specs/001-add-book/`](./specs/001-add-book/spec.md).

## Quick start — local mode

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No backend or login required.

## Quick start — HTTP mode

Set the storage mode and API base URL, then start the dev server:

```bash
# Frontend
export NEXT_PUBLIC_STORAGE_MODE=http
export NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

Start the backend (see [`backend/README.md`](./backend/README.md) for
full setup):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
createdb book_dev      # one-off: create a PostgreSQL database
alembic upgrade head   # one-off: create the schema
create-user --email you@example.com --password 'choose-a-strong-password'
uvicorn app.main:app --reload
```

Open <http://localhost:3000> and sign in with the user you just created.
Reload in HTTP mode clears the in-memory token and shows the login
screen again (spec 023 §6 FR-21).

## Scripts

| Command             | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Next.js dev server (port 3000)   |
| `npm run build`     | Production build                 |
| `npm run lint`      | ESLint (Next + TypeScript)       |
| `npm run test`      | Vitest, single run               |
| `npm run test:watch`| Vitest in watch mode             |

## Frontend environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_STORAGE_MODE` | optional | `local` (default) or `http`. Unknown values fail loudly. |
| `NEXT_PUBLIC_API_BASE_URL` | HTTP mode | URL of the FastAPI backend, e.g. `http://127.0.0.1:8000`. |

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** — strict, `noUncheckedIndexedAccess`, no `any`
- **Tailwind v4** — design tokens in `@theme` (no `tailwind.config.ts`)
- **shadcn/ui** — Radix-based primitives, cozy warm palette
- **Zustand** for in-memory state with narrow selectors
- **Vitest** + Testing Library for unit and component tests
- **localStorage** for the local demo persistence mode
- **FastAPI + SQLAlchemy + PostgreSQL** for the optional HTTP backend
  (see [`backend/`](./backend))

## Project layout

```
src/
├── app/                # Next.js App Router (page.tsx, ShelfClient.tsx)
├── components/         # Shared components (EmptyShelf, ui/, RootClient)
├── features/           # Feature folders (add-book, auth, ...)
├── lib/validation/     # Pure validators (tested in isolation)
├── state/              # Zustand stores
├── storage/            # StorageAdapter interface + local + http adapters
└── types/              # Domain types (the contract with the backend)

backend/                # Optional FastAPI service (HTTP mode)
specs/NNN-<slug>/       # One folder per feature: spec.md, plan.md, tasks.md
.specify/               # Constitution + templates (SDD scaffolding)
```

## Where to look

- **Principles** — [`.specify/memory/constitution.md`](./.specify/memory/constitution.md)
- **Conventions for AI agents** — [`AGENTS.md`](./AGENTS.md)
- **Feature specs** — [`specs/`](./specs), one folder per feature
- **Backend docs** — [`backend/README.md`](./backend/README.md)

## Development workflow

Spec-driven development, in this order:

1. Write `specs/NNN-<slug>/spec.md` (what and why).
2. Write `plan.md` (architecture and decisions).
3. Write `tasks.md` (atomic, one commit per task).
4. Implement task by task, ticking `[x]` on each acceptance line.
5. Verify with `npm run lint && npm run test` before declaring done.

Trivial fixes (typos, one-liners) skip the cycle.

## Roadmap

- **MVP:** localStorage-backed UI, no auth (specs 001-022).
- **Post-MVP HTTP mode (spec 023):** FastAPI backend with PostgreSQL
  persistence, JWT auth, and a `HttpStorageAdapter` selectable via
  `NEXT_PUBLIC_STORAGE_MODE=http`. Default remains localStorage.
