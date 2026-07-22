# Leonly MVP User Stories

## Product Goal

Leonly is a private, shared space for two active members to preserve memories, discuss them, react to them, and remember meaningful places. Every shared record belongs to one space and is private to that space's active members.

## Purpose

These stories are durable product-intent inputs to OpenSpec. They define desired outcomes and
constraints without representing implementation or verification status. OpenSpec remains normative
for requirements and scenarios.

## MVP-Wide Product Contract

These rules apply to every story unless a story explicitly narrows them:

- A user may have one active-space membership. A space may have at most two active members; both limits must be enforced atomically in the database.
- Creating a space completes onboarding. Its creator enters the active one-member dashboard and can use all features while waiting for a partner.
- The stored space creator/owner attribute is informational, not an authorization role. Active members have equal control over shared memories, places, and space settings. Comments, reactions, ratings, display names, and currency preferences remain member-owned.
- The Private Vault is shared by both active members. It hides memories from the timeline, not from either member; hidden memories retain detail, comment, and reaction access.
- Start dates and memory dates are date-only values. "Today" and future-date validation use each member's browser-local calendar date, so members in different timezones may briefly see different day counts. Date mutations submit the browser's IANA timezone; the server validates the timezone and recomputes its local date rather than trusting a submitted "today" value.
- Missing, inactive, deleted, and inaccessible record IDs return the same generic not-found result. Soft-deleted records and media are retained for the MVP but cannot be read through product or storage routes; permanent cleanup is post-MVP.
- Timeline, Vault, places, and comments use bounded cursor pagination with deterministic secondary
  ordering. Each story defines its known ordering and identifies unresolved pagination decisions;
  OpenSpec formalizes those rules as requirements and scenarios.
- MVP refreshes data after local actions, navigation, and manual refresh. Realtime partner updates are not required.
- Display names are read from the current active membership and update historical views; content does not snapshot names.
- Place ratings are whole stars from 1 through 5. Averages display one decimal place. Null placement and deterministic tie-breakers must be specified for every ranking.
- Place budgets store a non-negative amount and original currency (`USD` or `NIO`). Each member chooses a preferred display currency. Conversion uses a live exchange-rate provider with the last successful rate cached with its timestamp; when no rate is available, show the original amount. Mixed-currency sorting uses the same current or cached conversion rate shown to the member.
- Memory uploads allow up to five JPEG, PNG, or WebP images of at most 5 MB each. Place covers use the same type and per-file limit. The server verifies file content, storage is private to the active space, and partial failures clean up new objects. A memory creator selects the cover photo; an editor may select any retained or replacement photo as cover.
- User-facing MVP work targets WCAG 2.2 AA, including keyboard operation, visible focus, semantic names and states, associated validation, announced asynchronous feedback, non-color-only meaning, and reduced-motion support.
- Leaving/removing members, closing spaces, ownership transfer, account deletion, advanced media editing, search, audit history, and realtime synchronization are post-MVP.

## MVP Stories

### 1. Shared Space Foundation

- [US-001 View shared-space dashboard](01-shared-space-foundation/us-001-view-dashboard.md)
- [US-002 Relationship/friendship day counter](01-shared-space-foundation/us-002-day-counter.md)

### 2. Memories

- [US-003 View memories timeline](02-memories/us-003-view-memories-timeline.md)
- [US-004 Create memory](02-memories/us-004-create-memory.md)
- [US-005 Edit memory](02-memories/us-005-edit-memory.md)
- [US-006 Delete memory](02-memories/us-006-delete-memory.md)
- [US-028 View memory detail](02-memories/us-028-view-memory-detail.md)

### 3. Private Vault

- [US-007 Move memory to Private Vault](03-private-vault/us-007-move-memory-to-vault.md)
- [US-008 View Private Vault](03-private-vault/us-008-view-private-vault.md)
- [US-009 Restore memory](03-private-vault/us-009-restore-memory.md)

### 4. Comments

- [US-010 Add comment](04-comments/us-010-add-comment.md)
- [US-011 Edit own comment](04-comments/us-011-edit-own-comment.md)
- [US-012 Delete own comment](04-comments/us-012-delete-own-comment.md)

### 5. Reactions

- [US-013 React to memory](05-reactions/us-013-react-to-memory.md)

### 6. Places

- [US-014 View ranked places](06-places/us-014-view-ranked-places.md)
- [US-015 Add place](06-places/us-015-add-place.md)
- [US-016 View place detail](06-places/us-016-view-place-detail.md)
- [US-017 Rate place](06-places/us-017-rate-place.md)
- [US-018 Edit place](06-places/us-018-edit-place.md)
- [US-019 Delete place](06-places/us-019-delete-place.md)

### 7. Settings

- [US-020 View shared-space settings](07-settings/us-020-view-space-settings.md)
- [US-021 Update space name](07-settings/us-021-update-space-name.md)
- [US-022 Update start date](07-settings/us-022-update-start-date.md)
- [US-023 Update my display name](07-settings/us-023-update-display-name.md)
- [US-024 Copy invite code](07-settings/us-024-copy-invite-code.md)
- [US-029 Set preferred currency](07-settings/us-029-set-preferred-currency.md)

### 8. Security and Global States

- [US-025 Enforce active-space access](08-security-and-global-states/us-025-enforce-space-access.md)
- [US-026 Handle global UI states](08-security-and-global-states/us-026-global-ui-states.md)

### 9. Access and Onboarding

- [US-027 Enforce space lifecycle](09-access-and-onboarding/us-027-space-lifecycle.md)

## Recommended OpenSpec Sequence

1. US-027 and US-025: define lifecycle invariants and authorization before private feature data is introduced.
2. US-002, US-003 through US-006, US-028, then US-008, US-007, and US-009: establish memories and the shared Vault.
3. US-010 through US-013: add memory comments and reactions.
4. US-020 and US-029: establish settings and personal currency conversion.
5. US-014 through US-019: add places and ratings.
6. US-021 through US-024: complete remaining settings.
7. US-001: integrate dashboard summaries after memory and place queries are defined.
8. US-026: apply shared UI states and accessibility across user-facing paths.

US-025 remains cross-cutting: each resource must ship with its RLS and storage policies, not receive them as a later hardening pass.
