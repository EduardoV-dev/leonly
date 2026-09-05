# US-030: Verify Global Empty, Loading, and Error States

**Priority:** Must<br>
**Depends on:** US-001 through US-015, US-024, US-026 through US-029, US-031

## User Story

As a Leonly user, I want every completed user-facing flow's loading, empty, success, and error states
verified together so I understand the current state and the next safe action.

## Intended Outcome

This final consistency audit verifies that every major screen remains understandable and operable
while data is loading, absent, refreshed, or unavailable. Each owning story must already ship its
local states and accessibility behavior; this story closes cross-flow gaps.

## Scope

- Authentication, create/join setup, invitation, current dashboard shell, timeline, memory detail and
  forms, Private Vault, and settings.
- Field-level validation, mutation pending/success/error feedback, and retry where safe.
- Initial navigation, direct refresh, background refresh, and offline-like request failure.

## Business Rules

- Empty states explain the absence and offer the next valid action.
- Loading UI preserves layout and does not imply data that has not loaded.
- User-facing errors are friendly and do not reveal stack traces, SQL, tokens, or internal details.
- Retry is offered only for safe reads or idempotent mutations.
- A pending mutation prevents duplicate submission while preserving the user's ability to navigate
  according to the flow's data-loss rules.
- A missing, inactive, soft-deleted, or inaccessible resource uses the generic not-found state.
- Asynchronous feedback is exposed to assistive technology and never relies on color alone.

## Acceptance Criteria

- Each list screen visibly distinguishes loading, empty, populated, and failed-read states.
- Each detail screen visibly distinguishes loading, missing optional data, and generic not-found.
- Empty states explain what is absent and offer an action valid for the active member's current state.
- Forms associate field errors with their controls, announce submission outcomes, preserve valid
  input after recoverable failures, and block duplicate submission while pending.
- A safe retry or navigation path is available when recovery is possible.
- Failed or offline-like requests and missing optional data do not produce a blank screen, stale
  success message, or broken layout.
- Controls remain keyboard operable with visible focus, semantic names and states, non-color-only
  meaning, announced asynchronous feedback, and reduced-motion support under WCAG 2.2 AA.

## Decision Required

- Define which MVP mutations are idempotent and may expose a retry action.
- Define per-form navigation warnings or draft-preservation behavior when pending or unsaved input
  could be lost.

## Verification Notes

- Exercise loading, empty, failed read, failed mutation, retry, direct refresh, and offline-like
  behavior for each screen.
- Verify repeated submit and retry actions cannot create duplicate records or conflicting updates.
- Test feedback with keyboard navigation, reduced motion, and assistive-technology announcements.
- Verify generic not-found states reveal no distinction among missing, inactive, soft-deleted, and
  inaccessible resources.
