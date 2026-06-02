# Plan: <FEATURE NAME>

> **Status:** Draft | In Review | Approved
> **Spec:** `../spec.md` (read this first)
> **Author:** <name>
> **Created:** YYYY-MM-DD

---

## 1. Architecture summary

How does the feature fit into the existing system? One paragraph. Reference
relevant modules in `src/`.

## 2. Module / file layout

List of new and changed files, with one-line purpose each.

- `src/types/book.ts` — domain types
- `src/storage/local-storage-adapter.ts` — concrete implementation
- `src/features/add-book/AddBookDialog.tsx` — UI
- `tests/features/add-book/...` — tests

## 3. Data flow

Walk through the happy path: user action → state update → persistence → re-render.
Diagrams are welcome.

## 4. Component breakdown

For each new component:

- **Name**
- **Props** (typed)
- **State** (own, lifted, derived?)
- **Behavior** (in 1–2 lines)
- **Tests** (what we cover)

## 5. Storage adapter changes

If the storage interface grows, list exact signature additions and the rationale.
Otherwise: "no changes to `StorageAdapter`".

## 6. Decisions & trade-offs

Record non-obvious decisions here. "Chose X over Y because Z" format.
These become ADRs over time.

## 7. Risks

What could go wrong? What did we deliberately leave fragile?

## 8. Rollout

- Behind a flag? No (MVP).
- Migration needed? No / Yes — describe.
- Manual QA steps.
