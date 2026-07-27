# US-020: View Place Detail

**Priority:** Must<br>
**Depends on:** US-016 through US-019

## User Story

As an active member, I want to open a place in my active space so I can see its saved details, shared rating, and my rating.

## Intended Outcome

The detail view presents the active place's cover, name, category, description, location, expense
items and converted total, average rating, current member's rating, creator attribution, and creation
date. Missing optional values have explicit non-error fallbacks.

## Scope

- Stored place details, creator attribution, shared average, current-member rating, expense items, and
  converted-total display.
- An action region where later edit, delete, and rating stories add entry points, plus loading,
  failure, not-found, and responsive states.

## Business Rules

- The server returns a place only when the requester is an active member of the place's active space and the place is active.
- Missing, inactive, soft-deleted, and inaccessible place IDs produce the same generic not-found result.
- The average includes ratings from current active members only; the current member's rating is returned separately.
- Expense items retain their original amounts and currencies. The total dropdown and conversion follow
  US-018; unavailable conversion leaves originals readable without claiming a mixed-currency total.
- Creator attribution uses the creator's current active-membership display name rather than a historical snapshot.
- The action region exposes the displayed place ID to the later edit, delete, and rating stories.
- The view exposes loading, failed-read, missing-optional-data, generic not-found, and responsive states.

## Acceptance Criteria

- An active member can open an active place in their active space and see all stored data and defined fallbacks.
- Average and member-specific rating states are distinct for zero, one, and two active-member ratings.
- Currency failure leaves original expense items readable and identifies the converted total as unavailable.
- Missing, inactive, soft-deleted, and cross-space IDs render the same generic not-found outcome without leaking place data.
- Controls added to the action region by later stories are keyboard accessible and identify their
  purpose and current state.

## Verification Notes

- Verify complete and missing-optional records, zero through two ratings, empty, same-currency, and
  mixed-currency expense items, both total currencies, and unavailable rates.
- Verify loading, failed-read, direct refresh, inactive-space, soft-deleted, unknown, and cross-space cases.
