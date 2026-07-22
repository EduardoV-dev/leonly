# US-027: Enforce Space Lifecycle

**Priority:** Must<br>
**Depends on:** Google authentication

## User Story

As an authenticated user, I want space creation, invitation, and post-login routing to behave
predictably so I enter the correct private state without exceeding active-space membership limits.

## Intended Outcome

An authenticated user without an active membership can create an active space or join one through a
valid invite. Creation atomically establishes the first active membership and opens the one-member
dashboard. Successful redemption atomically establishes the second active membership and opens the
two-member experience.

## Scope

- Create-space and join-space eligibility, atomic membership changes, and invite lifecycle.
- Post-login routing for users with no active space and active spaces with one or two active members.
- Safe handling of invalid, expired, used, regenerated, and concurrently redeemed invites.

## Business Rules

- A user may have at most one active membership and a space at most two active members. Database transactions and constraints enforce both rules during concurrent joins.
- Creating a space creates its first active membership. The stored creator/owner attribute is informational and grants no extra authorization after creation.
- An invite expires 24 hours after issue and becomes invalid when the second member joins.
- While the active space has one active member, that member can regenerate an expired or missing
  invite. Regeneration invalidates every prior code for the space.
- A user cannot redeem their own invite, join the same space twice, or join while actively assigned to another space.
- Invalid, expired, already-used, full-space, and unauthorized invite attempts return safe errors
  without exposing active-space or active-member data.
- A user without an active membership enters create/join setup. A one-member creator has completed onboarding and enters the dashboard.
- Leaving, member removal, space closure, ownership transfer, and account deletion are outside MVP.

## Acceptance Criteria

- Creating an active space atomically creates the creator's active membership, completes onboarding,
  and routes to the one-member dashboard.
- Redeeming a valid invite atomically creates the second active membership and routes the joining
  member to the two-member active space.
- Concurrent redemption of the final membership slot admits exactly one eligible user and leaves no
  partial membership or invite state.
- An invite is unusable at and after its 24-hour expiry and after successful redemption or
  regeneration.
- The sole active member can regenerate a missing or expired invite, and all prior codes then fail.
- Self-join, duplicate join, existing-active-space, invalid-code, expired-code, used-code, and
  full-space attempts create no membership and reveal no active-space data.
- Post-login routing sends no-active-space users to create/join setup, one-member active spaces to
  the waiting dashboard, and two-member active spaces to the active dashboard.
- Inactive and soft-deleted spaces cannot be created through, joined, or entered through product
  routes and use the generic not-found outcome where addressed by identifier.

## Decision Required

- Define invite-code format, entropy, normalization, lookup rate limits, and abuse response.
- Define create-space inputs and validation, including space name, creator display name, start date,
  and timezone, plus whether creation automatically issues the first invite.
- Define join-space inputs and validation, including the joining member's display name.
- Define which invite failures share generic copy and which may provide actionable feedback without
  enabling active-space enumeration.

## Verification Notes

- Cover creation, successful join, the exact 24-hour boundary, regeneration, and every rejected join
  case with no partial writes.
- Race simultaneous final-slot redemptions against database-enforced active-member limits.
- Verify old codes fail after regeneration and successful redemption.
- Exercise post-login routing for no active space, one active member, and two active members.
- Verify invite lookup and errors expose no active-space name, active-member identity, or membership
  count before successful redemption.
