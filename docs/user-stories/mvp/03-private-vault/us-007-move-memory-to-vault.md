# US-007: Move Memory to Private Vault

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-003, US-008, US-025

## User Story

As a space member, I want to move a memory to the Private Vault so it is hidden from the main timeline but still saved in our shared space.

## Intended Outcome

An active memory can move from the shared timeline to the shared Private Vault without losing photos, comments, reactions, or metadata.

## Business Rules

- Private Vault is shared by the active members; it is not a partner-to-partner security boundary.
- Moving a memory sets `is_hidden = true`; it does not delete the record.
- Inactive, already-hidden, and cross-space memories cannot be moved.

## Acceptance Criteria

- [ ] The action is available only for active, visible memories in the current space.
- [ ] On success, the memory leaves the timeline and appears in the Vault.
- [ ] Related data is preserved.
- [ ] The UI provides success and error feedback and updates affected views.

## Verification

- [ ] Test successful move, repeated request, deleted memory, and cross-space request.
