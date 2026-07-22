# US-020: View Shared-Space Settings

**Priority:** Must<br>
**Depends on:** US-025

## User Story

As an active member, I want one settings view for my active space so I can understand and manage its
shared and member-owned configuration.

## Intended Outcome

The settings page presents the active space's shared settings, membership state, the current member's
personal settings, account context, and entry points to the actions owned by US-021 through US-024 and
US-029.

## Scope

- Space name, date-only start date, one-member or two-member invite status, and active members.
- The current member's current membership display name and preferred currency.
- Account context, a Private Vault link, and action regions for dependent settings stories.
- Loading, missing optional data, generic not-found, no-space, error, and responsive states.

## Business Rules

- The authenticated user may read settings only for their active space; authorization is derived on
  the server and enforced by RLS.
- Both active members have equal control over shared settings. Display name and preferred currency
  remain owned by the individual membership.
- A one-member active space prominently shows invite status and the applicable US-024 action.
- A two-member active space shows joined status and no actionable invite code.
- Missing optional member avatar or invite data uses a safe fallback and does not block other settings.
- A user without active membership is redirected to setup. Missing, inactive, and inaccessible
  spaces use the generic not-found outcome where a direct resource route is involved.
- Sections, values, status, and actions use semantic headings and labels, remain keyboard accessible,
  and do not rely on color alone.

## Acceptance Criteria

- The active space's settings, active members, account context, and Private Vault link are shown.
- Shared settings are distinguished from settings owned by the current membership.
- One-member, two-member, and missing optional-data states remain understandable and usable.
- A user without active membership is redirected to setup, and another space's settings are not exposed.
- Loading, error, responsive, keyboard, focus, and non-color status behavior meet the MVP accessibility
  contract.

## Decision Required

- Define which account identity fields and account actions comprise account context, along with their
  privacy boundaries and missing-data fallbacks.

## Verification Notes

- Test one-member, two-member, no-space, inactive-space, missing optional-data, and failed-read states.
- Test direct and altered cross-space routes with server and RLS enforcement.
- Test responsive layout, heading and control names, keyboard navigation, focus, and non-color status.
