# US-026: Handle Global Empty, Loading, and Error States

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** All user-facing MVP stories

## User Story

As a Leonly user, I want clear empty, loading, and error states so I understand what is happening and what I can do next.

## Intended Outcome

No major screen appears blank or broken during data fetches, zero-data conditions, failures, refreshes, or offline conditions.

## Scope

- Dashboard, timeline, memory detail and forms, Private Vault, places and place detail, and settings.
- Field-level validation, mutation pending/success/error feedback, and retry where safe.

## Business Rules

- Empty states explain the absence and offer the next valid action.
- Loading UI preserves layout and does not imply data that has not loaded.
- User-facing errors are friendly and do not reveal stack traces, SQL, tokens, or internal details.
- Retry is offered only for safe reads or idempotent mutations.

## Acceptance Criteria

- [ ] Every major screen has visible loading, empty, and error states.
- [ ] Forms show accessible field-level validation and prevent duplicate submissions.
- [ ] Errors offer retry or safe navigation where useful.
- [ ] Missing optional data and offline/failed requests do not break layout.
- [ ] States are responsive and accessible.

## Verification

- [ ] Test loading, empty, failed read, failed mutation, retry, and offline-like behavior for each screen.
