# US-025: View Expanded Shared-Space Dashboard

**Priority:** Future<br>
**OpenSpec:** [shared-space-dashboard](../../../../openspec/specs/shared-space-dashboard/spec.md)<br>
**Depends on:** US-001, US-002, US-003, US-004, US-019, US-024

## User Story

As an active member, I want a personalized dashboard for my active space so I can understand our
time, memories, places, and next available action at a glance.

## Intended Outcome

After login, an active member lands on a responsive summary of the active space. The dashboard uses
current space data, supports a one-member waiting state, and provides clear paths into memories and
places without revealing another space's existence or data.

## Scope

- Space name and the day counter.
- Both active members' display names and avatars when available.
- A bounded preview of recent visible memories and top-rated active places.
- An add-memory action, empty states, and the persistent US-024 invite-status section for a one-member
  space.
- Loading, error, and direct-refresh behavior.

## Business Rules

- The dashboard derives the active space from the authenticated user's active membership.
- A user without an active space is redirected to the create/join flow.
- Hidden or soft-deleted memories and inactive or soft-deleted places are excluded.
- Missing avatars and optional data must have safe visual fallbacks.
- Missing, inactive, soft-deleted, or inaccessible dashboard resources use a generic not-found
  outcome where a resource response is required.
- For a one-member space, the US-024 invite-status section appears before all other dashboard items.
  It always shows either the current valid code and waiting message or an expired or missing state
  with regeneration. A two-member space does not render the section.

## Acceptance Criteria

- An authenticated active member sees only the dashboard for their active space.
- A user without an active space is sent to create/join setup instead of seeing a dashboard.
- The dashboard shows the active space name, available active-member identity, and inclusive day
  counter from the active space start date.
- When eligible records exist, the dashboard shows bounded previews of recent visible memories and
  top-rated active places in the defined deterministic order.
- A one-member active space always shows the US-024 invite-status section above all dashboard items
  without disabling other features; a two-member active space does not show it.
- Empty previews explain the absence of content and offer the next valid action.
- Loading and failed-query states remain usable on supported desktop and mobile viewports.
- Placeholder content is never presented as stored memory or place data.

## Decision Required

- Define the preview limits and deterministic tie-breakers for recent memories and top-rated places.
- Define whether a failed preview is isolated to its section or replaces the whole dashboard.

## Verification Notes

- Cover unauthenticated, no-space, one-member, two-member, empty, populated, and query-error states.
- Verify direct refresh preserves the same active-space result.
- Attempt cross-space access through routes and modified requests; no foreign data may be observable.
- Verify missing avatars, long names, and unavailable optional fields do not break the layout.
- Verify invite-section first placement, valid, expired, missing, regenerated, and partner-joined
  states across supported viewports and direct refresh.
