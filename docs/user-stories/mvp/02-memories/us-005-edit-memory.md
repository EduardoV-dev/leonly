# US-005: Edit Memory

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-004, US-025

## User Story

As a space member, I want to edit a memory so I can correct or improve its details after creation.

## Intended Outcome

Active members can update title, description, date, location, photos, and timeline/Vault visibility for active memories in their shared space.

## Business Rules

- Reuse create-memory validation and upload rules.
- An edited hidden memory leaves the timeline; a restored visible memory re-enters according to its memory date.
- A missing, inactive, or cross-space memory cannot be edited.
- New uploads use the same private-storage and partial-failure cleanup rules as creation; removed photos become inaccessible after the update succeeds.
- The member can select any retained or replacement photo as the cover.

## Acceptance Criteria

- [ ] Existing values are prefilled and valid changes are reflected in all affected views.
- [ ] Invalid fields and future dates are rejected.
- [ ] Users can remove all photos or add valid replacement photos.
- [ ] Cover selection remains valid after photo removal or replacement.
- [ ] Visibility changes update timeline and Vault correctly.
- [ ] Cross-space and deleted-memory updates are denied; errors and cancellation are handled.

## Verification

- [ ] Test validation, visibility moves, photo changes, and authorization.
