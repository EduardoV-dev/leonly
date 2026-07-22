# US-014: View Ranked Places

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-025, US-029

## User Story

As a space member, I want to view places we visited together so we can remember and rank meaningful locations.

## Intended Outcome

A responsive places page lists active places in the current space with name, category, cover-photo fallback, average rating, budget, location, and description preview.

## Business Rules

- Sort by highest rated, lowest rated, cheapest, most expensive, or most recently created.
- Average ratings display one decimal place. Unrated places follow rated places in rating sorts; places without budgets follow budgeted places in budget sorts.
- Rating ties use newest creation time, then ID. Budget and recency ties use ID.
- Mixed-currency budget sorting converts amounts with the same current or cached rate displayed to the member.
- Results use bounded cursor pagination.
- Inactive and cross-space places never appear.

## Acceptance Criteria

- [ ] Only active places from the active space are listed.
- [ ] All sort modes work predictably with missing ratings and budgets.
- [ ] Cards handle absent photos, ratings, budgets, and descriptions.
- [ ] The page has useful empty, loading, error, and responsive states.

## Verification

- [ ] Test each ordering, null values, inactive records, empty list, and authorization.
