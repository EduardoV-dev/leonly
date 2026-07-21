# US-013: React to Memory

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-003, US-025

## User Story

As a space member, I want to react to a memory so I can quickly express how that moment makes me feel.

## Intended Outcome

Each active member has at most one reaction on an active memory: `heart`, `laugh`, `cry`, or `star`. Selecting another type replaces the current reaction; selecting the same type removes it.

## Business Rules

- Enforce one active reaction per `(memory_id, user_id)` with a database constraint.
- Reactions work for visible and Vault memories, but never inactive or cross-space memories.
- Counts exclude inactive reactions and update after mutations.

## Acceptance Criteria

- [ ] A member can add, change, and remove exactly one reaction.
- [ ] Counts and the member's current reaction display correctly.
- [ ] Invalid reaction types, deleted memories, and cross-space payloads are rejected.
- [ ] Fast repeated interaction and request failures have deterministic UI behavior.

## Verification

- [ ] Test uniqueness, toggle/change behavior, counts, concurrent member reactions, and authorization.
