# US-023: Update My Display Name

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-020, US-025

## User Story

As a space member, I want to update my display name inside the shared space so it appears correctly in shared content and settings.

## Intended Outcome

The authenticated member can update only their own `space_members.display_name`, independently of their Google account name.

## Business Rules

- The trimmed display name is required and 2-100 characters.
- A member cannot update the other member's name through UI, API, or altered payload.
- Views join the current membership display name, so an update changes historical comments, memories, and place metadata without rewriting those records.

## Acceptance Criteria

- [ ] A member can update only their own active membership name.
- [ ] Invalid names are rejected.
- [ ] The new name is reflected in every affected view.
- [ ] Partner-name and cross-space changes are denied.

## Verification

- [ ] Test self-update, forbidden partner update, validation, and refreshed display data.
