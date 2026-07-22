# US-015: Add Place

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-014, US-025

## User Story

As a space member, I want to add a place we visited so we can save, rank, and remember locations that matter to us.

## Intended Outcome

An active member can create a place with optional cover photo, estimated budget, and their initial rating.

## Inputs and Rules

- Required: name and category.
- Categories: `restaurant`, `hotel`, `cafe`, `park`, `travel`, or `other`.
- Optional: description, location, one cover photo, non-negative budget with `USD` or `NIO` currency, and rating.
- Cover photos use the MVP-wide image validation and private-storage contract.
- Ratings are whole numbers from 1 through 5 when present; clearing a rating is a separate action.
- Server-derived membership determines the target space and creator.

## Acceptance Criteria

- [ ] Valid places are associated only with the active space.
- [ ] Missing name/category, negative budget, invalid rating, and invalid uploads are rejected.
- [ ] An optional initial rating creates the member's one rating for the new place.
- [ ] Duplicate submissions and upload/database partial failures are handled.

## Verification

- [ ] Test validation, initial rating, upload failure, double submit, and cross-space payload changes.
