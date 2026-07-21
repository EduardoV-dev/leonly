# Leonly MVP Backlog

## Product Goal

Leonly is a private, shared space for two active members to preserve memories, discuss them, react to them, and remember meaningful places. Every shared record belongs to one space and is private to that space's active members.

## Delivery Rule

A checked item is **Implemented** only when it meets its acceptance criteria and its linked OpenSpec change has been verified. OpenSpec is normative; this backlog links product intent to each eventual change.

## Already Implemented

- [x] Google authentication
- [x] Create shared space
- [x] Join shared space

## MVP Stories

### 1. Shared Space Foundation

- [ ] [US-001 View shared-space dashboard](01-shared-space-foundation/us-001-view-dashboard.md) - Partial
- [ ] [US-002 Relationship/friendship day counter](01-shared-space-foundation/us-002-day-counter.md) - Partial

### 2. Memories

- [ ] [US-003 View memories timeline](02-memories/us-003-view-memories-timeline.md) - Planned
- [ ] [US-004 Create memory](02-memories/us-004-create-memory.md) - Planned
- [ ] [US-005 Edit memory](02-memories/us-005-edit-memory.md) - Planned
- [ ] [US-006 Delete memory](02-memories/us-006-delete-memory.md) - Planned

### 3. Private Vault

- [ ] [US-007 Move memory to Private Vault](03-private-vault/us-007-move-memory-to-vault.md) - Planned
- [ ] [US-008 View Private Vault](03-private-vault/us-008-view-private-vault.md) - Planned
- [ ] [US-009 Restore memory](03-private-vault/us-009-restore-memory.md) - Planned

### 4. Comments

- [ ] [US-010 Add comment](04-comments/us-010-add-comment.md) - Planned
- [ ] [US-011 Edit own comment](04-comments/us-011-edit-own-comment.md) - Planned
- [ ] [US-012 Delete own comment](04-comments/us-012-delete-own-comment.md) - Planned

### 5. Reactions

- [ ] [US-013 React to memory](05-reactions/us-013-react-to-memory.md) - Planned

### 6. Places

- [ ] [US-014 View ranked places](06-places/us-014-view-ranked-places.md) - Planned
- [ ] [US-015 Add place](06-places/us-015-add-place.md) - Planned
- [ ] [US-016 View place detail](06-places/us-016-view-place-detail.md) - Planned
- [ ] [US-017 Rate place](06-places/us-017-rate-place.md) - Planned
- [ ] [US-018 Edit place](06-places/us-018-edit-place.md) - Planned
- [ ] [US-019 Delete place](06-places/us-019-delete-place.md) - Planned

### 7. Settings

- [ ] [US-020 View shared-space settings](07-settings/us-020-view-space-settings.md) - Planned
- [ ] [US-021 Update space name](07-settings/us-021-update-space-name.md) - Planned
- [ ] [US-022 Update start date](07-settings/us-022-update-start-date.md) - Planned
- [ ] [US-023 Update my display name](07-settings/us-023-update-display-name.md) - Planned
- [ ] [US-024 Copy invite code](07-settings/us-024-copy-invite-code.md) - Planned

### 8. Security and Global States

- [ ] [US-025 Enforce active-space access](08-security-and-global-states/us-025-enforce-space-access.md) - Planned
- [ ] [US-026 Handle global UI states](08-security-and-global-states/us-026-global-ui-states.md) - Planned

## Recommended Order

1. US-001 and US-002: replace dashboard placeholders with real data and inclusive day counting.
2. US-003 through US-009: establish the memory data model, timeline, create flow, and Private Vault.
3. US-010 through US-013: add social interaction to memories.
4. US-014 through US-019: add places and ratings.
5. US-020 through US-024: complete settings.
6. US-025 and US-026: harden all completed feature paths and polish shared states.

US-025 is cross-cutting and must be implemented alongside each feature, then verified globally before MVP release.
