# US-013: React to Memory

**Priority:** Must<br>
**Depends on:** US-003, US-025

## User Story

As an active member, I want to react to a memory in my active space so I can express a lightweight
response without writing a comment.

## Intended Outcome

Each active member has at most one reaction on an active visible or Vault memory. The control exposes
the member's confirmed selection and aggregate counts while keeping each member's reaction ownership
independent.

## Scope

- Reaction choices `heart`, `laugh`, `cry`, and `star` on memory cards and memory detail.
- Add, change, remove, pending, count, success, and failure states.
- Refresh after local reaction actions; realtime partner updates are outside MVP.

## Business Rules

- Enforce at most one reaction per memory and active membership with a database constraint; identity
  and active space come from the authenticated membership.
- Selecting no current reaction adds it, selecting another type replaces it, and selecting the same
  type removes it.
- Either active member may react to active visible or Vault memories in their active space.
- Missing, soft-deleted, inactive, and inaccessible memories return the generic not-found outcome.
- Counts include only current reactions and refresh from authoritative data after mutation.
- Controls are disabled while a mutation is pending. Failure restores the last confirmed selection
  and refetches counts rather than leaving optimistic state as authoritative.
- Every choice has an accessible name and selected state, works by keyboard, and does not communicate
  selection or count changes by color alone; asynchronous results are announced.

## Acceptance Criteria

- A member can add, change, and remove their one reaction without changing the other member's reaction.
- Counts and the member's confirmed current reaction display consistently on cards and detail views.
- Unsupported reaction types and altered owner or space payloads are rejected.
- Unauthenticated, inactive-member, cross-space, and soft-deleted-memory requests cannot mutate or
  expose reactions.
- Fast repeated interaction and failures resolve to deterministic, accessible UI state.

## Decision Required

- Define ordering and conflict behavior for overlapping reaction mutations from multiple clients for
  the same membership and memory.

## Verification Notes

- Test uniqueness, add/change/remove behavior, counts, pending controls, rollback, and refetch.
- Test concurrent reactions by both members and the chosen same-member conflict behavior.
- Test unsupported types, inactive membership, memory states, altered payloads, and cross-space access.
- Test accessible names and states, keyboard operation, non-color meaning, and announced feedback.
