# US-028: View Memory Detail

**Status:** Planned<br>
**Priority:** Must<br>
**OpenSpec:** Not created<br>
**Depends on:** US-003, US-025

## User Story

As a space member, I want to open a memory so I can view its complete story, photos, comments, reactions, and available actions.

## Intended Outcome

An active member can open an active memory from the timeline or shared Vault. The detail view exposes the full metadata and the actions allowed by the memory's current visibility.

## In Scope

- Title, date, description, location, creator's current display name, and ordered photos with the selected cover first.
- Regions where US-010 and US-013 add cursor-paginated comments and reaction controls.
- Regions where US-005 through US-009 add edit, delete, move-to-Vault, and restore actions.
- Loading, missing optional data, generic not-found, and failed-read states.

## Business Rules

- Active members can open visible and hidden memories in their active space.
- Hidden memories are discoverable from the Vault, not the timeline, and remain openable by direct authorized URL.
- Deleted, cross-space, missing, and otherwise inaccessible memories return the same not-found state.
- Comments and reactions remain enabled for hidden memories.

## Acceptance Criteria

- [ ] Timeline and Vault links open the correct active memory and render all available metadata.
- [ ] Photo navigation is keyboard accessible and exposes semantic state.
- [ ] The detail layout provides a consistent action region for actions delivered by US-005 through US-009.
- [ ] Hidden memories open for either active member but never appear in timeline results.
- [ ] Deleted, cross-space, and unknown IDs render the same not-found outcome without leaking data.

## Verification

- [ ] Test visible, hidden, optional-data, multi-photo, deleted, unknown, and cross-space cases.
- [ ] Test comments, reactions, actions, focus behavior, and direct refresh.
