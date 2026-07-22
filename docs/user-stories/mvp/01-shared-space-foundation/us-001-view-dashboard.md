# US-001: View Shared-Space Dashboard

**Status:** Partial  
**Priority:** Must  
**OpenSpec:** [shared-space-dashboard](../../../../openspec/specs/shared-space-dashboard/spec.md)<br>
**Depends on:** US-002, US-003, US-014, US-025, US-027

## User Story

As a Leonly user, I want a personalized dashboard for my shared space so I can understand our memories, places, and time together at a glance.

## Intended Outcome

After login, an active member lands on a responsive, data-backed summary of their space. It creates an emotional entry point and gives direct next actions without exposing data from any other space.

## In Scope

- Space name and the day counter.
- Both active members' display names and avatars when available.
- Bounded recent visible memories and top-rated active places with deterministic ordering.
- An add-memory action, empty states, and an invite/waiting state for a one-member space.
- Loading, error, and direct-refresh behavior.

## Business Rules

- The dashboard reads only the authenticated user's active space.
- A user without an active space is redirected to the create/join flow.
- Inactive, hidden, or deleted memories and inactive places are excluded.
- Missing avatars and optional data must have safe visual fallbacks.

## Acceptance Criteria

- [ ] Dashboard is available only to active members of its space.
- [ ] It shows the correct space name, members, and inclusive day counter.
- [ ] It shows recent visible memories and top-rated active places when present.
- [ ] It shows useful empty states and a waiting-to-join state when appropriate.
- [ ] It provides loading and error states and is responsive.
- [ ] Real queries replace placeholder memories and places.

## Verification

- [ ] Test authenticated, unauthenticated, no-space, one-member, empty, and query-error states.
- [ ] Test cross-space access is denied.
