# US-029: Set Preferred Currency

**Priority:** Must<br>
**Depends on:** US-020, US-025

## User Story

As an active member, I want to choose USD or NIO as my preferred display currency so place budgets
are understandable to me without changing stored amounts or what the other member prefers.

## Intended Outcome

Each active membership owns one preferred currency. Place views use that preference and one
authoritative timestamped exchange rate to display and sort converted budgets while preserving access
to each place's original amount and currency.

## Scope

- Personal USD or NIO preference selection, save, pending, success, failure, and refresh states.
- USD-to-NIO, NIO-to-USD, and same-currency display on place cards and detail views.
- Current-rate retrieval, timestamped cached fallback, no-rate fallback, and mixed-currency sorting.

## Business Rules

- Supported stored and preferred currencies are `USD` and `NIO`; all other submitted values are rejected.
- Preference belongs to the authenticated active membership. Submitted membership, user, or space
  identifiers cannot redirect the update.
- One member cannot read or change the other member's preference through a mutation response.
- Conversion uses a server-selected live exchange-rate provider. The latest successful rate and
  retrieval timestamp are cached and treated as one authoritative snapshot for a result set.
- Provider failure uses the last successful rate. If no cached rate exists, place views show original
  amounts and currencies and remain usable.
- Display and mixed-currency sorting use the same rate snapshot; pagination cannot change ordering by
  mixing rates within one result set.
- Original amount and currency remain stored and available; changing preference never rewrites them.
- Controls have accessible labels and state, work by keyboard, and announce save or conversion
  fallback status without relying on color.

## Acceptance Criteria

- A member can switch their preference between USD and NIO without changing the other member's preference.
- Place cards and details show preferred-currency amounts while retaining the original amount and currency.
- Same-currency amounts are not converted, and conversion plus mixed-currency sorting use the same
  current or cached rate snapshot.
- Provider failure uses the last successful timestamped rate, or original amounts when no rate exists,
  without blocking place views.
- Unsupported-currency, partner-preference, inactive-membership, altered-identity, and cross-space
  updates are rejected without leaking membership data.
- Preference save and currency fallback states are understandable and accessible.

## Decision Required

- Select the exchange-rate provider and define the cached rate's storage owner and cache lifetime.
- Define the initial preferred currency for a new membership and behavior for an existing membership
  with no preference.
- Define amount storage precision, conversion precision, display precision, rounding mode, and which
  rate direction or reciprocal is authoritative.
- Define how one rate snapshot remains stable across cursor-paginated mixed-currency results.
- Define conflict behavior for concurrent preference updates from multiple sessions.

## Verification Notes

- Test USD-to-NIO, NIO-to-USD, same-currency, precision, rounding, and original-value preservation.
- Test fresh rate, cache lifetime boundaries, cached fallback, no-cache fallback, and provider failure.
- Test sorting and every page of one result set use the displayed authoritative rate snapshot.
- Test initial/default preference, concurrent updates, member isolation, altered payloads, and cross-space access.
- Test accessible control state, keyboard use, focus, and announced save and fallback feedback.
