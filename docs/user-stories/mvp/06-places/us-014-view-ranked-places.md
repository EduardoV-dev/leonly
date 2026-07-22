# US-014: View Ranked Places

**Priority:** Must<br>
**Depends on:** US-025, US-029

## User Story

As an active member, I want to view places in my active space so I can remember and rank meaningful locations.

## Intended Outcome

The places page shows a bounded, cursor-paginated list of active places from the member's active space. Each card shows the name, category, cover photo or fallback, average rating or unrated state, original or converted budget, location, and description preview when available.

## Scope

- Place cards, supported ranking controls, cursor pagination, and load-more behavior.
- Empty, loading, failed-read, missing optional-data, and responsive states.

## Business Rules

- The server derives the active space from the authenticated active membership; inactive spaces, soft-deleted places, and places from other spaces never appear.
- Supported sorts are highest rated, lowest rated, cheapest, most expensive, and most recently created.
- Rating averages include ratings from current active members only and display one decimal place. Unrated places follow rated places in both rating sorts.
- Rating ties use creation time newest first, then a deterministic ID order.
- Places without budgets follow budgeted places in both budget sorts. Budget ties use a deterministic ID order.
- Mixed-currency budget display and sorting use the same authoritative rate snapshot for the entire
  result set, as defined by US-029. If no rate is available, the original amount remains visible.
- Most-recent sorting uses creation time newest first, then a deterministic ID order.
- Every cursor represents the complete effective sort key so loading another page cannot skip or duplicate unchanged records.
- The page exposes loading, empty, failed-read, load-more, and responsive states without leaking inaccessible data.

## Decision Required

- Set the page size, load-more behavior, cursor fields, and ID direction for each tie-breaker.
- Select the initial sort used when the member has not chosen one.
- Specify whether rating sorts use the exact average or the displayed one-decimal value, and define the one-decimal rounding rule.
- Specify conversion precision.
- Specify mixed-currency ordering when neither a current nor cached conversion rate is available.

## Acceptance Criteria

- An active member sees only active places from their active space.
- Each supported sort returns deterministic pages, including ties and missing ratings or budgets.
- Cards show defined fallbacks for absent photos, ratings, budgets, locations, and descriptions.
- The conversion rate used to order mixed-currency budgets is the rate represented in displayed values.
- Initial load and subsequent pages expose accessible loading and retryable error feedback.

## Verification Notes

- Verify every sort with ties, null ratings, null budgets, and mixed currencies.
- Verify empty, loading, failed-read, inactive-space, soft-deleted, and cross-space cases.
