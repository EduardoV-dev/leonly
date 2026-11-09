# Leonly MVP Product Contract

## Product Goal

Leonly is a private, shared space for two active members to preserve memories, discuss them, and
react to them. Every shared record belongs to one space and is private to that space's active
members.

## Purpose

This document preserves shared product intent. OpenSpec remains normative for requirements and
scenarios; unfinished work lives in the [backlog](backlog/README.md).
Existing signed media URLs have an expiry window; the remaining deletion migration must resolve
that behavior against the immediate-access requirement below.

## MVP-Wide Product Contract

These rules apply to every story unless a story explicitly narrows them:

- A user may have one active-space membership. A space may have at most two active members; both limits must be enforced atomically in the database.
- Creating a space completes onboarding. Its creator enters the active one-member dashboard and can use all features while waiting for a partner.
- The stored space creator/owner attribute is informational, not an authorization role. Active members
  have equal control over shared memories and space settings. Comments, reactions, and display names
  remain member-owned; language choice is device-local.
- The Private Vault is shared by both active members. It hides memories from the timeline, not from either member; hidden memories retain detail, comment, and reaction access.
- Start dates and memory dates are date-only values. "Today" and future-date validation use each member's browser-local calendar date, so members in different timezones may briefly see different day counts. Date mutations submit the browser's IANA timezone; the server validates the timezone and recomputes its local date rather than trusting a submitted "today" value.
- Missing, inactive, deleted, and inaccessible record IDs return the same generic not-found result. Soft-deleted records and media are retained for the MVP but cannot be read through product or storage routes; permanent cleanup is post-MVP.
- Timeline, Vault, and comments use bounded cursor pagination with deterministic secondary
  ordering. Each story defines its known ordering and identifies unresolved pagination decisions;
  OpenSpec formalizes those rules as requirements and scenarios.
- MVP refreshes data after local actions, navigation, and manual refresh. Realtime partner updates are not required.
- Display names are read from the current active membership and update historical views; content does not snapshot names.
- Memory uploads allow up to 10 JPEG, PNG, or WebP images of at most 5 MB each. The server verifies
  file content, storage is private to the active space, and partial failures clean up new objects. A
  memory creator selects the cover photo; an editor may select any retained or replacement photo as
  cover.
- The interface supports English and Spanish. A member's explicit device-local choice takes priority
  over browser language detection and applies without changing the partner's experience.
- User-facing MVP work targets WCAG 2.2 AA, including keyboard operation, visible focus, semantic names and states, associated validation, announced asynchronous feedback, non-color-only meaning, and reduced-motion support.
- Leaving/removing members, closing spaces, ownership transfer, account deletion, advanced media editing, search, audit history, and realtime synchronization are post-MVP.

Currency, Places, and the expanded dashboard are intentionally outside the MVP.
