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
- Application configuration defines exactly two currencies: `USD` and `NIO`. Each membership owns an
  independent preferred display currency. Place expense items retain their non-negative original
  amount and currency. A member may convert all items to one selected display currency and see their
  total using one current or cached timestamped rate snapshot; when conversion is unavailable,
  original values remain visible and no misleading mixed-currency total is shown.
- Memory uploads allow up to five JPEG, PNG, or WebP images of at most 5 MB each. Place covers use the same type and per-file limit. The server verifies file content, storage is private to the active space, and partial failures clean up new objects. A memory creator selects the cover photo; an editor may select any retained or replacement photo as cover.
- User-facing MVP work targets WCAG 2.2 AA, including keyboard operation, visible focus, semantic names and states, associated validation, announced asynchronous feedback, non-color-only meaning, and reduced-motion support.
- Leaving/removing members, closing spaces, ownership transfer, account deletion, advanced media editing, search, audit history, and realtime synchronization are post-MVP.

## Dependency and Ordering Contract

- Story IDs define the implementation order. Every `Depends on` story has a lower ID.
- `Depends on` lists hard implementation or end-to-end acceptance prerequisites. A later action may
  integrate into an earlier host through an extension point without creating a reverse dependency.
- Each feature ships its own authorization, RLS, storage policies, validation, UI states, and
  accessibility behavior. US-029 and US-030 are final cross-feature audits, not hardening passes.
- US-001 has no story dependency, but Google authentication is an explicit external prerequisite.
- The sequence is dependency-safe, but a story is not fully implementation-ready until its
  `Decision Required` items and inherited decisions are resolved in OpenSpec.

## MVP Implementation Sequence

| ID | Story | Explicit dependencies |
| --- | --- | --- |
| US-001 | [Enforce space lifecycle](01-access-and-onboarding/us-001-space-lifecycle.md) | None; Google authentication is external |
| US-002 | [Relationship/friendship day counter](02-shared-space-foundation/us-002-day-counter.md) | US-001 |
| US-003 | [View memories timeline](03-memories/us-003-view-memories-timeline.md) | US-001 |
| US-004 | [Create memory](03-memories/us-004-create-memory.md) | US-003 |
| US-005 | [View memory detail](03-memories/us-005-view-memory-detail.md) | US-003, US-004 |
| US-006 | [View Private Vault](04-private-vault/us-006-view-private-vault.md) | US-003, US-004, US-005 |
| US-007 | [Edit memory](03-memories/us-007-edit-memory.md) | US-004, US-005, US-006 |
| US-008 | [Move memory to Private Vault](04-private-vault/us-008-move-memory-to-vault.md) | US-003, US-005, US-006 |
| US-009 | [Restore memory](04-private-vault/us-009-restore-memory.md) | US-003, US-005, US-006, US-008 |
| US-010 | [Add comment](05-comments/us-010-add-comment.md) | US-005, US-006 |
| US-011 | [Edit own comment](05-comments/us-011-edit-own-comment.md) | US-010 |
| US-012 | [Delete own comment](05-comments/us-012-delete-own-comment.md) | US-010 |
| US-013 | [React to memory](06-reactions/us-013-react-to-memory.md) | US-003, US-005, US-006 |
| US-014 | [Delete memory](03-memories/us-014-delete-memory.md) | US-003, US-005 through US-010, US-013 |
| US-015 | [View shared-space settings](07-settings/us-015-view-space-settings.md) | US-001, US-006 |
| US-016 | [Set preferred currency](07-settings/us-016-set-preferred-currency.md) | US-001, US-015 |
| US-017 | [Add place](08-places/us-017-add-place.md) | US-001, US-016 |
| US-018 | [Manage place expense items and converted total](08-places/us-018-manage-place-expense-items.md) | US-016, US-017 |
| US-019 | [View ranked places](08-places/us-019-view-ranked-places.md) | US-001, US-016 through US-018 |
| US-020 | [View place detail](08-places/us-020-view-place-detail.md) | US-016 through US-019 |
| US-021 | [Rate place](08-places/us-021-rate-place.md) | US-017, US-019, US-020 |
| US-022 | [Edit place](08-places/us-022-edit-place.md) | US-017, US-020 |
| US-023 | [Delete place](08-places/us-023-delete-place.md) | US-017 through US-022 |
| US-024 | [Manage partner invite](07-settings/us-024-manage-partner-invite.md) | US-001, US-015 |
| US-025 | [View shared-space dashboard](02-shared-space-foundation/us-025-view-dashboard.md) | US-001 through US-004, US-019, US-024 |
| US-026 | [Update space name](07-settings/us-026-update-space-name.md) | US-015, US-025 |
| US-027 | [Update start date](07-settings/us-027-update-start-date.md) | US-002, US-015, US-025 |
| US-028 | [Update my display name](07-settings/us-028-update-display-name.md) | US-003, US-005, US-006, US-010, US-015, US-019, US-020, US-025 |
| US-029 | [Verify active-space access](09-security-and-global-states/us-029-verify-space-access.md) | US-001 through US-028 |
| US-030 | [Verify global UI states](09-security-and-global-states/us-030-verify-global-ui-states.md) | US-001 through US-029 |
