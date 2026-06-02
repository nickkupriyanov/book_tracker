# Spec: <FEATURE NAME>

> **Status:** Draft | In Review | Approved | Implemented
> **Author:** <name>
> **Created:** YYYY-MM-DD
> **Spec ID:** NNN-<slug>
> **Constitution version:** see `.specify/memory/constitution.md`

---

## 1. Problem

What user problem are we solving? Why does it matter? Keep it human.

## 2. Goal

One sentence. The smallest statement of success.

## 3. Non-goals

What we explicitly will **not** do in this feature. As important as goals.

## 4. Users & scenarios

Who is this for? What is the smallest believable story that shows it working?

## 5. UX

How does it feel? Describe the key states: default, empty, loading, error, success.
Reference the constitution's UI principles.

## 6. Functional requirements

Numbered, testable statements. Each must be unambiguously true or false.

- FR-1. The user can …
- FR-2. When … happens, the system …
- FR-3. Data is persisted to … (which satisfies the storage interface).

## 7. Data

What entities are touched? What is their shape? Reference domain types in
`src/types/`. Note any migrations needed.

## 8. Storage interface

What methods of `StorageAdapter` does this feature use? Does it require a new
method? If yes, define the signature here.

## 9. Edge cases & errors

- What if the user submits empty title?
- What if localStorage is full / disabled?
- What if two tabs edit the same book?

## 10. Acceptance criteria

A reviewer can tick each box without asking a clarifying question.

- [ ] …
- [ ] …

## 11. Out of scope (for this spec)

Things the user might assume are included but aren't.

## 12. Open questions

Anything unresolved. Each should be either resolved or explicitly deferred
before the spec is approved.
