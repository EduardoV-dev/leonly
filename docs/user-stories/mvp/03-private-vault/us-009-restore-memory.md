# US-009: Restore Memory from Private Vault

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-008, US-025

## User Story

As a space member, I want to restore a memory from the Private Vault so it appears again in the main timeline.

## Intended Outcome

Restoring an active hidden memory sets `is_hidden = false`, removes it from Vault results, and returns it to its chronological place in the timeline.

## Business Rules

- Photos, comments, reactions, and metadata remain unchanged.
- Already-visible, inactive, and cross-space memories cannot be restored.

## Acceptance Criteria

- [ ] A restored memory appears in the timeline according to its memory date.
- [ ] It no longer appears in the Vault.
- [ ] The action preserves memory data and handles errors safely.
- [ ] Unauthorized and deleted-memory requests are denied.

## Verification

- [ ] Test restore, repeat restore, deletion race, and cross-space attempt.
