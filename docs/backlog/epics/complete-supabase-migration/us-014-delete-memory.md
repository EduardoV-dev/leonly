# US-014: Delete Memory

**Remaining work:** Migrate versioned soft deletion to NestJS/Prisma. Resolve the conflict between
the [deletion specification](../../../../openspec/specs/memory-deletion/spec.md)'s immediate media
denial and already-issued five-minute signed URLs before defining the replacement contract.

**Priority:** Must


**Depends on:** US-003, US-005 through US-010, US-013

## User Story

As an active member, I want to delete a memory from our active space so a moment that should no longer be shared is no longer accessible.

## Intended Outcome

After explicit confirmation, either active member can soft-delete an active memory in the active space. Success removes the memory from timeline, shared Private Vault, detail, comments, reactions, aggregates, and direct access while retaining its records and media under the MVP retention policy.

## Scope

- Delete action from each memory surface where actions are available.
- Explicit confirmation, cancellation, pending, success, and recoverable failure states.
- Product and storage-route denial after a successful soft delete.

## Business Rules

- Deletion is a soft delete for MVP and does not claim permanent removal from retained storage.
- Cancelling has no effect.
- A failed delete leaves the memory active and accessible in its prior placement.
- After success, the memory and its retained photos, comments, and reactions cannot be read through product or storage routes and do not contribute to counts or aggregates.
- Missing, inactive, already soft-deleted, and inaccessible memory IDs produce the same generic not-found outcome, including repeated delete requests.
- While deletion is pending, repeated activation does not start another delete request.

## Acceptance Criteria

- Deletion requires explicit confirmation and cancellation leaves the memory unchanged.
- Either active member can soft-delete an active memory in the active space.
- After success, the memory disappears from timeline, shared Private Vault, detail, related UI, counts, and aggregates.
- After success, direct product and storage routes cannot expose the memory or retained media.
- A failed request leaves the memory unchanged and shows a recoverable error.
- Missing, inactive, already soft-deleted, and inaccessible memories produce the same generic not-found outcome.
- Repeated activation while pending results in at most one successful soft delete.

## Decision Required

- Decide whether immediate media revocation requires a different delivery mechanism, or whether the
  specification should accept the existing signed URL expiry window. Update the contract accordingly.

## Migration Acceptance

- Soft-delete the current Prisma memory after active-space authorization and an atomic version check.
- Restore confirmation controls and retain records while excluding deleted content from all new reads.
- Cover stale and cross-space requests, concurrent lifecycle/social operations, and media access under
  the chosen revocation contract.

## Verification Notes

- Verify confirmation, cancellation, successful soft delete, failed deletion, and repeated activation.
- Verify removal from lists, detail, related UI, counts, aggregates, direct routes, and private media access.
- Verify retained records are not surfaced and generic not-found behavior covers repeat, missing, inactive, soft-deleted, and inaccessible requests.
- Verify version conflicts for overlapping mutations.
