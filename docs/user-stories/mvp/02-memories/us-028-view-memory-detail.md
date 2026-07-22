# US-028: View Memory Detail

**Priority:** Must


**Depends on:** US-003, US-025

## User Story

As an active member, I want to open a memory in our active space so I can view its complete story, photos, comments, reactions, and available actions.

## Intended Outcome

An active member can open an active memory from the timeline, the shared Private Vault, or an authorized direct URL. The detail view shows all available memory metadata and exposes actions appropriate to the memory's current visible or hidden state without revealing missing or inaccessible records.

## Scope

- Title, date, full description, location, creator's current active-membership display name, and photos with the selected cover first.
- Keyboard-accessible photo navigation with semantic position and selection state.
- Regions where US-010 and US-013 provide cursor-paginated comments and reaction controls.
- A consistent action region where US-005 through US-009 provide edit, delete, move-to-Private-Vault, and restore actions.
- Loading, missing optional data, failed-read, and generic not-found states, including direct refresh.

## Business Rules

- Either active member can open visible and hidden active memories belonging to the active space.
- Hidden memories are discoverable from the shared Private Vault, not the timeline, and remain openable through an authorized direct URL.
- Hidden memories retain comment and reaction access for both active members.
- A visible memory offers move-to-Private-Vault rather than restore; a hidden memory offers restore rather than move-to-Private-Vault. Edit and delete remain available in either state.
- Missing optional metadata or photos are valid and use appropriate empty or fallback presentation.
- Missing, inactive, soft-deleted, and inaccessible memories produce the same generic not-found outcome.
- A failed read that is not a not-found result shows a retryable error without displaying stale data as current.

## Acceptance Criteria

- Timeline and shared Private Vault links open the correct active memory and render all available metadata.
- Either active member can open a hidden memory through the shared Private Vault or an authorized direct URL, but the memory remains absent from timeline results.
- The selected cover appears first, and photo navigation is keyboard accessible with semantic position and selection state.
- Missing photos and optional metadata render valid fallback or empty states.
- The action region reflects current visibility and supports actions delivered by US-005 through US-009.
- Comment and reaction regions remain available for visible and hidden memories as their dependent stories are delivered.
- Missing, inactive, soft-deleted, and inaccessible IDs render the same generic not-found outcome without leaking data.
- Failed reads are distinguishable from generic not-found results and can be retried; direct refresh preserves authorized access.

## Decision Required

- Define deterministic ordering for photos after the selected cover.

## Verification Notes

- Verify visible, hidden, no-photo, optional-data, single-photo, and multi-photo memories for both active members.
- Verify photo keyboard operation, semantic state, focus behavior, action availability, comments, and reactions.
- Verify direct authorized URLs, direct refresh, retryable failed reads, and generic not-found behavior for missing, inactive, soft-deleted, and inaccessible IDs.
