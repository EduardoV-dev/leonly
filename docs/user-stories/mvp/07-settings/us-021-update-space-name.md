# US-021: Update Space Name

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-020, US-025

## User Story

As a space member, I want to update the shared space name so the app reflects how we describe our relationship or friendship.

## Intended Outcome

An active member can update the active space name, and the result is reflected across dashboard, navigation, and settings.

## Business Rules

- Trimmed name is required and must be 2-100 characters.
- Server-side authorization and RLS scope the update to active membership.
- Pending saves prevent duplicate submission.

## Acceptance Criteria

- [ ] Valid names persist and refresh all affected views.
- [ ] Empty, too-short, and too-long names are rejected.
- [ ] Cross-space requests are denied.
- [ ] Save state and failures are clear.

## Verification

- [ ] Test validation, refresh behavior, duplicate submit, and authorization.
