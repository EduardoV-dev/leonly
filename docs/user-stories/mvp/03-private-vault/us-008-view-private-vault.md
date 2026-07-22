# US-008: View Private Vault

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-003, US-025, US-028

## User Story

As a space member, I want to view hidden memories in the Private Vault so moments removed from the main timeline are not lost.

## Intended Outcome

The Vault presents a responsive list of the active space's active, hidden memories with detail, restore, and delete actions.

## Business Rules

- Query only `is_hidden = true` and `is_active = true` memories for the active space.
- Visible timeline memories and deleted memories never appear.
- Missing photos and optional metadata are valid.
- The UI identifies the Vault as shared by both active members.
- Results use bounded cursor pagination and deterministic newest-first ordering.

## Acceptance Criteria

- [ ] Only the current space's hidden, active memories are visible.
- [ ] Cards support detail, restore, and delete actions.
- [ ] Empty, loading, error, and responsive states are available.
- [ ] Cross-space and deleted-memory access is denied.

## Verification

- [ ] Test query scope, empty state, restore/delete actions, and direct-route authorization.
