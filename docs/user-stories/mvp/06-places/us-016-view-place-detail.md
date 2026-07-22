# US-016: View Place Detail

**Priority:** Must<br>
**Depends on:** US-014, US-025, US-029

## User Story

As an active member, I want to open a place in my active space so I can see its saved details, shared rating, and my rating.

## Intended Outcome

The detail view presents the active place's cover, name, category, description, location, budget, average rating, current member's rating, creator attribution, and creation date. Missing optional values have explicit non-error fallbacks.

## Scope

- Stored place details, creator attribution, shared average, current-member rating, and budget display.
- Edit, delete, and rating entry points plus loading, failure, not-found, and responsive states.

## Business Rules

- The server returns a place only when the requester is an active member of the place's active space and the place is active.
- Missing, inactive, soft-deleted, and inaccessible place IDs produce the same generic not-found result.
- The average includes ratings from current active members only; the current member's rating is returned separately.
- The budget retains its original amount and currency. When a usable rate exists, the view also shows the member's preferred-currency value using that rate and its timestamp; otherwise it shows the original amount without blocking the page.
- Creator attribution uses the creator's current active-membership display name rather than a historical snapshot.
- Edit, delete, and rating entry points are available to either active member and operate on the displayed place ID.
- The view exposes loading, failed-read, missing-optional-data, generic not-found, and responsive states.

## Acceptance Criteria

- An active member can open an active place in their active space and see all stored data and defined fallbacks.
- Average and member-specific rating states are distinct for zero, one, and two active-member ratings.
- Currency failure leaves the original budget readable and identifies no converted value as current.
- Missing, inactive, soft-deleted, and cross-space IDs render the same generic not-found outcome without leaking place data.
- Edit, delete, and rating controls are keyboard accessible and identify their purpose and current state.

## Verification Notes

- Verify complete and missing-optional records, zero through two ratings, same-currency and converted budgets, and unavailable rates.
- Verify loading, failed-read, direct refresh, inactive-space, soft-deleted, unknown, and cross-space cases.
