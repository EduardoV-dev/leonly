# US-008: View Private Vault

**Priority:** Must


**Depends on:** US-003, US-025, US-028

## User Story

As an active member, I want to view hidden memories in the shared Private Vault so moments removed from the timeline remain available to both members of our active space.

## Intended Outcome

After entering the shared Private Vault, an active member sees only the active space's active, hidden memories in deterministic newest-first pages. Each memory can be opened, restored, edited, or soft-deleted according to its current state, and the page clearly communicates that the Vault is shared by both active members.

## Scope

- Memory cards with title, date, cover-photo preview or fallback, optional metadata previews, counts, detail link, and available actions.
- Detail, edit, restore, and delete entry points delivered by their dependent stories.
- Initial loading, load-more, empty, slow-network, failed-read, and responsive states.
- Bounded cursor pagination and refresh after local actions, navigation, or manual refresh; realtime partner updates are not required.

## Business Rules

- Only hidden, active memories belonging to the active space appear.
- Visible timeline memories and soft-deleted memories never appear.
- Missing photos and optional metadata are valid and use fallback or empty presentation.
- Bounded cursor pagination uses a deterministic order and does not duplicate or skip equal-sort records.
- Either active member can open and act on a hidden memory; the shared Private Vault does not hide memories from a partner.
- Missing, inactive, soft-deleted, and inaccessible memory IDs produce the same generic not-found outcome.
- A failed initial read shows a retryable page error; a failed load-more request keeps already loaded memories visible and can be retried.

## Acceptance Criteria

- Either active member sees only the active space's hidden, active memories and is told that the Private Vault is shared.
- Cards present available summary data, valid fallbacks, counts, detail links, and edit, restore, and delete actions as those stories are delivered.
- Empty, loading, slow-network, failed-read, load-more, and responsive states are understandable and usable.
- Loading additional pages neither duplicates nor skips records with equal primary sort values.
- Visible and soft-deleted memories remain absent from the shared Private Vault.
- Missing, inactive, soft-deleted, and inaccessible IDs render the same generic not-found outcome without revealing record existence.

## Decision Required

- Define what "newest" means for Vault ordering: memory date, creation time, or time moved to the shared Private Vault.
- Define Vault page size, deterministic secondary ordering, cursor fields and format, and invalid or stale cursor behavior.

## Verification Notes

- Verify active-space scope, shared access, primary and secondary ordering once decided, equal-value pagination, optional data, and empty results.
- Verify detail, edit, restore, and delete entry points and refresh after each local action.
- Verify initial-read and load-more failures, retries, direct refresh, and slow-network feedback.
- Verify visible-memory exclusion and generic not-found behavior for missing, inactive, soft-deleted, and inaccessible memories.
