---
name: ev-api-contracts
description: "Trigger: API implementation, response design, optimistic locking, health checks, pagination, cursors. Standardize contracts, prevent stale updates, and guide pagination choices."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV API Contracts

## Activation Contract

Use when designing or implementing first-party JSON API responses, resource updates, health checks,
their consumers, or pagination.
For review-only work, report contract violations without starting an implementation or decision workflow.

## Hard Rules

- Read [contracts](assets/contracts.md); use the exact exported `ApiError` and `ApiResponse<T>` types
  in TypeScript. Reuse shared exports across producers and consumers; do not recreate endpoint-local types.
- Wrap success, failure, and pagination payloads in `ApiResponse<T>`. Keep appropriate HTTP status codes.
  Protocol-defined redirects, streams, file downloads, and bodyless responses retain their required format.
  Health-check endpoints (including liveness/readiness) must instead return the shared `HealthResponse`
  directly: `{ status: "ok" | "degraded" | "down", checks: Record<string, "up" | "down"> }`. All checks
  up means `ok`/200; mixed means `degraded`/503; all down means `down`/503. Preserve the ordinary union.
- Before implementing pagination, recommend offset or cursor based on the use case, ask the user which
  to use, and STOP until they answer. Honor an explicit choice already provided for the current task.
- Require all offset metadata fields, using `totalItems` for the authorized, filtered dataset count,
  not the current page's length. For cursor pagination, always emit `nextCursor` (nullable) and
  `resetCursor: boolean`; true means the current pagination chain is invalid and the client must
  discard it and restart from the beginning. Otherwise emit false. Include `prevCursor` only when
  explicitly requested. Wrap the entire page, not just its items.
- Create or reuse shared cursor encode/decode utilities. Validate cursor payloads with Zod, including
  decoded untrusted input. Recognized malformed incoming encoding, JSON, or payloads are API validation
  errors. Invalid server-generated cursor payloads and unexpected utility defects are internal failures,
  not client validation errors; handle them safely with appropriate statuses and diagnostic evidence.
- Use both `createdAt` and `id` whenever available, with matching deterministic query ordering and
  lexicographic continuation predicates. Never paginate tied timestamps by timestamp alone.
- Expose an extendable base cursor schema and schema-aware encode/decode methods so additional sort
  fields can be validated without duplicating utilities. Preserve timestamp precision through round trips.
- Select the simplest concurrency mechanism that preserves the business invariant, following the
  backend concurrency decision table. Do not require optimistic locking for every update; preserve
  established API preconditions unless a compatible change is explicitly planned.
- When protecting stale user edits, require the last-read optimistic token on resource-update bodies:
  prefer a suitable integer version, otherwise use `lastKnownUpdatedAt`. Apply the complete
  [optimistic-locking contract](references/optimistic-locking.md): atomically match resource identity,
  authorization scope, and the token; advance the server-owned token.
  Continue only for one updated row; zero matches return HTTP 409 through the ordinary failure envelope,
  preserving established authorization/not-found policy. Keep exact timestamp precision end to end.

## Decision Gates

| Use case | Recommendation |
| --- | --- |
| Resource update | Select concurrency protection for the invariant; for stale user edits require a version or reliable timestamp and return HTTP 409 on conflict. |
| Health endpoint | Return direct `HealthResponse`; aggregate actual checks and use HTTP 200 or 503. |
| Numbered pages, random page access, exact totals | Offset; note count/deep-offset costs and shifting rows. |
| Sequential feeds, large or frequently changing datasets | Cursor; note lack of arbitrary page jumps. |
| Use case unclear | Ask which navigation behavior is needed before recommending a strategy. |

## Execution Steps

1. Inspect response producers, consumers, shared contracts, ordering fields, and existing utilities.
   Read the [paired examples and exceptions](references/examples.md).
   For updates requiring optimistic locking, load its contract and verify its concurrency scenarios.
2. Resolve the pagination choice before pagination implementation; apply the contract template.
3. Implement validated cursor utilities when needed; extend the base schema for the selected ordering.
4. Verify success/error envelopes, health aggregation and 200/503 responses, empty and final pages,
   applicable offset boundaries or cursor round trips, reset signaling/client restart, malformed cursors,
   timestamp ties, client/internal failure attribution, and requested
   backward traversal (query direction, lookahead trimming, restored order, anchors, and boundaries).

## Output Contract

For explicit standards checks, report every evidenced finding. During generation,
apply and verify these rules internally without a separate standards report or summary; surface blockers.
At the pagination decision gate, return only the recommendation and one question; wait for the answer.

## References

- [Contract template](assets/contracts.md): exported API/page types and cursor utility requirements.
- [Optimistic locking](references/optimistic-locking.md): update preconditions, atomic writes, conflicts,
  timestamp precision, and concurrency verification.
- [Paired examples and exceptions](references/examples.md): page envelopes, offset counts, cursor
  lookahead, ordering, and shared schema-aware utilities.
