# US-018: Manage Place Expense Items and Converted Total

**Priority:** Must<br>
**Depends on:** US-016, US-017

## User Story

As an active member, I want to record a place's expense items in their original currencies and view
one converted total so I can understand the complete budget in the currency useful to me.

## Intended Outcome

Either active member can add, edit, or remove named expense items for an active place. Every item
retains its original amount and configured currency. The place budget view defaults to the viewing
member's preferred currency, allows a temporary `USD` or `NIO` selection, converts every item with one
authoritative rate snapshot, and adds the converted values into one total.

## Scope

- Add, edit, and remove expense items with name, non-negative amount, and original currency.
- A total-currency dropdown containing the configured `USD` and `NIO` values.
- Per-item original and converted values, converted total, rate timestamp, and no-rate fallback.
- Validation, pending, success, failure, empty, and concurrent-update states.

## Business Rules

- Either active member may manage expense items for an active place in the active space.
- Item names are required after trimming. Amount and name limits, decimal scale, storage precision,
  and normalization reuse the decisions established by US-017.
- Item currency is required and must come from the canonical `USD` and `NIO` configuration. New-item
  currency defaults to the acting member's preferred currency but may be changed before saving.
- Original item amounts and currencies are never rewritten by display conversion or preference changes.
- The total dropdown defaults to the viewing member's preferred currency. Changing it affects only
  that rendered place budget and does not change either member's saved preference.
- Every item conversion and the total use one authoritative current or cached rate snapshot. The total
  is the sum of unrounded converted values and is rounded only for display using the US-016 contract.
- If no usable rate exists and items require conversion, original values remain visible and the
  single-currency total is unavailable rather than adding unlike currencies.
- Missing, inactive, soft-deleted, and inaccessible places or items return the generic not-found outcome.
- Failed mutations leave confirmed items unchanged and preserve valid attempted input for retry.

## Acceptance Criteria

- Either active member can add, edit, and remove valid expense items for an active place.
- Each item preserves and displays its original amount and configured currency.
- New-item currency defaults to the acting member's preference and can be changed to the other
  configured currency before creation without changing that preference.
- The total dropdown defaults independently for each member and changing it affects neither member's
  saved preference.
- All converted items and the displayed total use the same timestamped rate snapshot.
- The displayed total equals the sum of the converted items in the selected currency under the
  configured precision and rounding rules.
- With no usable required rate, original items remain readable and no mixed-currency total is claimed.
- Invalid currency, amount, name, altered place, inactive-member, and cross-space requests are denied.

## Decision Required

- Set the maximum expense-item count and name length.
- Decide item ordering and deterministic tie-breakers.
- Define concurrent edit/delete behavior for the same item.

## Verification Notes

- Test empty, one-item, same-currency, and mixed-currency budgets in both total currencies.
- Test per-member defaults, temporary dropdown changes, original-value preservation, precision,
  rounding, current rate, cached rate, and no-rate behavior.
- Test add, edit, delete, validation boundaries, mutation failure, concurrent changes, inactive place,
  soft-deleted item, altered IDs, and cross-space access.
