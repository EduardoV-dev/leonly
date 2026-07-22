# US-006: Delete Memory

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-004, US-025

## User Story

As a space member, I want to delete a memory so I can remove a moment that should no longer be in our shared space.

## Intended Outcome

After explicit confirmation, an active member soft-deletes an active memory by setting `is_active = false`. It is no longer accessible from timeline, Vault, direct routes, comments, reactions, or aggregates.

## Business Rules

- This is a soft delete for MVP; do not claim permanent storage deletion.
- Cancelling has no effect.
- Comments, reactions, and photos are retained according to the retention policy but never surfaced through deleted memory UI.
- Repeat, missing, deleted, and inaccessible record IDs return the same generic not-found result.

## Acceptance Criteria

- [ ] Confirmation is required before deletion.
- [ ] The memory disappears from timeline, Vault, details, and related UI after success.
- [ ] Cross-space deletion and direct access to deleted records are denied.
- [ ] Failure leaves the memory unchanged and shows a recoverable error.

## Verification

- [ ] Test cancel, successful soft delete, repeated delete, cross-space attempt, and direct-route denial.
