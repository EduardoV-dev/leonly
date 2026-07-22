# US-018: Edit Place

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-015, US-025

## User Story

As a space member, I want to edit a place so I can correct or improve its details.

## Intended Outcome

Active members can update name, category, description, location, cover photo, and non-negative estimated budget with `USD` or `NIO` currency for active places in their space.

## Business Rules

- Existing values are prefilled.
- Name/category and upload validation match creation.
- Replacing a cover uses the MVP-wide private-storage contract; the old object becomes inaccessible after the update succeeds, and failed updates clean up the new object.

## Acceptance Criteria

- [ ] Valid updates are reflected in list and detail views.
- [ ] Invalid names, categories, budgets, and files are rejected.
- [ ] Deleted and cross-space places cannot be edited.
- [ ] Cancel, loading, and error behavior is clear and safe.

## Verification

- [ ] Test validation, photo replacement, cancellation, and authorization.
