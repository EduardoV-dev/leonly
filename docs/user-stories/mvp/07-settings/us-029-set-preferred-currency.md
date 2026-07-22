# US-029: Set Preferred Currency

**Status:** Planned<br>
**Priority:** Must<br>
**OpenSpec:** Not created<br>
**Depends on:** US-020, US-025

## User Story

As a space member, I want to choose USD or NIO as my display currency so place budgets are understandable to me without changing what my partner sees.

## Intended Outcome

Each active member can save a personal preferred currency. Place views convert budgets from their stored currency with a live exchange rate while preserving the original amount and currency.

## Business Rules

- Supported stored and preferred currencies are `USD` and `NIO`.
- Preference belongs to the active membership; one member cannot change the other's preference.
- Conversion uses a server-selected live exchange-rate provider. The latest successful rate and retrieval timestamp are cached.
- If the provider fails, use the last successful rate. If no cached rate exists, show the original amount and currency without blocking place views.
- Display and mixed-currency sorting use the same rate. OpenSpec defines cache lifetime, decimal precision, and rounding.

## Acceptance Criteria

- [ ] A member can switch their preference between USD and NIO without changing their partner's preference.
- [ ] Place cards and details show converted amounts in the member's preferred currency while retaining access to the original currency.
- [ ] Conversion and mixed-currency sorting use the same current or cached rate.
- [ ] Provider failure uses the last successful timestamped rate, or the original amount when no rate has been cached.
- [ ] Altered-currency, partner-preference, and cross-space updates are rejected.

## Verification

- [ ] Test USD-to-NIO, NIO-to-USD, same-currency, rounding, cached fallback, no-cache fallback, and member isolation.
- [ ] Test sorting uses the displayed conversion rate.
