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

- [ ] List screens have visible loading, empty, and error states; detail screens distinguish loading, missing optional data, and generic not-found states.
- [ ] Forms associate field errors with controls, announce submission results, and prevent duplicate submissions.
- [ ] Errors offer retry or safe navigation where useful.
- [ ] Missing optional data and offline/failed requests do not break layout.
- [ ] Interactive controls are keyboard operable with visible focus, semantic names and states, non-color-only meaning, and reduced-motion support in accordance with WCAG 2.2 AA.

## Verification

- [ ] Test loading, empty, failed read, failed mutation, retry, and offline-like behavior for each screen.
