# API Contract Template

Export these types from the owning application's or package's shared contract module. Reuse them in
handlers, services exposing API contracts, client calls, and related tests.

```ts
export type ApiError = {
  code: string;
  message: string;
  field?: string;
};

export type ApiResponse<T> =
  | { ok: true; data: T; error: []; message: string }
  | { ok: false; data: null; error: ApiError[]; message: string };

export type OffsetPage<T> = {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalItems: number;
    page: number;
    pageSize: number;
  };
};

export type CursorPage<T> = {
  data: T[];
  meta: {
    nextCursor: string | null;
    resetCursor: boolean;
  };
};

// Use only when backward navigation is explicitly requested.
export type BidirectionalCursorPage<T> = {
  data: T[];
  meta: CursorPage<T>["meta"] & {
    prevCursor: string | null;
  };
};
```

Use `ApiResponse<OffsetPage<Item>>`, `ApiResponse<CursorPage<Item>>`, or the explicitly requested
`ApiResponse<BidirectionalCursorPage<Item>>`. The outer `data` holds the page; its `data` holds items.
For ordinary endpoints, success includes `error: []`; failure includes `data: null` and an `ApiError[]`.
Both branches include a string `message`. Keep client errors free of internal details.

## Resource Update Preconditions

Choose concurrency protection according to the operation's invariant. When protecting stale user edits,
require the last-read version in update bodies, including PATCH; prefer a suitable integer version,
otherwise require `lastKnownUpdatedAt: string`, the last-read timezone-qualified `updatedAt` preserved
at database precision. Neither token is writable entity data. Preserve established API preconditions.
When optimistic locking applies, follow the [contract](../references/optimistic-locking.md): atomically match the token
with identity and authorization scope, advance it, and return its persisted new value. A failed match returns
HTTP 409 in `ApiResponse<T>`'s failure branch with a safe refresh instruction, preserving established
authorization/not-found handling. Creates do not require this precondition.

## Health-Check Exception

Export and reuse this shared type for health-check endpoints, including liveness and readiness:

```ts
export type HealthResponse = {
  status: "ok" | "degraded" | "down";
  checks: Record<string, "up" | "down">;
};
```

Return this body directly, without `ok`, `data`, `error`, or `message`. Do not wrap it in `ApiResponse<T>`
or weaken that ordinary union. Check names identify the dependencies actually checked, such as
`database` and `redis`; do not require unused dependencies or report an unchecked dependency as up.

| Actual check results | `status` | HTTP status |
| --- | --- | --- |
| All up | `ok` | 200 |
| At least one up and at least one down | `degraded` | 503 |
| All down | `down` | 503 |

Evaluate the configured checks and derive the aggregate from their results. Handle check failures and
timeouts as `down` and retain other check results. If no checks are configured, resolve the intended
health signal before implementation rather than treating an empty set as proof of dependency health.
Expose only safe dependency names and states, never credentials, connection strings, or raw errors.
Ensure response middleware, interceptors, and exception filters preserve this direct contract and
HTTP mapping, including non-2xx responses.

## Pagination Semantics

- Use one-based offset pages. Validate positive integer `page` and bounded positive integer `pageSize`.
  Compute `totalItems` over the authorized, filtered dataset before pagination, not from the returned
  page length. Derive flags from that count and the requested page; apply deterministic ordering with
  a unique tie-breaker.
- Empty datasets and valid pages beyond the dataset return successful empty pages with the actual
  `totalItems` and unchanged requested `page`. `hasNextPage` means later items exist
  (`page * pageSize < totalItems`); `hasPreviousPage` means earlier items exist
  (`page > 1 && totalItems > 0`), not necessarily a nonempty immediately preceding page.
- Emit `nextCursor: null` at the end, including empty pages. When requested, emit `prevCursor: null`
  at the beginning. Determine whether another page exists; do not infer it from a full page alone.
- Always emit `resetCursor` in cursor metadata, including bidirectional pages. Set it to true when
  the current pagination chain is no longer valid: the client must discard stored cursors and
  accumulated pages and restart from the beginning without a cursor. Otherwise emit false, including
  ordinary empty/final pages. `nextCursor: null` means traversal ended, not that a reset is required.
  Document endpoint-specific invalidation conditions and reset-response handling; this flag does not
  replace the validation/internal-error contracts for malformed cursors or utility failures.
- Keep filters, authorization, and ordering consistent across page queries. Cursors never grant access.

## Cursor Utility Contract

- Export a Zod object base schema containing `id` and `createdAt` when the dataset provides both.
  Match the actual ID format and timestamp precision; do not assume UUIDs or round timestamps.
  With only one field available, use it and add an available unique tie-breaker if needed.
- Support extending that schema with additional ordering fields using Zod object composition.
  Infer cursor payload types from schemas instead of maintaining separate unchecked types.
- Expose shared `encodeCursor` and `decodeCursor` methods that accept the selected schema and infer
  its payload type. Validate before encoding and after decoding; reuse the base schema by default.
- Use a consistent URL-safe encoding supported by the target runtime. Recognized malformed incoming
  encoding, JSON, or Zod payload failures use the API validation-error contract and appropriate client
  status. Invalid server-generated payloads or unexpected utility defects use a safe internal-error
  response/status with diagnostic evidence; do not blame the caller or expose internal details.
  Preserve original causes when wrapping errors; neither case may become an unhandled failure.
- Match payload fields, sort direction, and query comparisons. For descending `(createdAt, id)`,
  advance with `createdAt < cursor.createdAt OR (createdAt = cursor.createdAt AND id < cursor.id)`;
  invert comparisons for ascending traversal. Implement reverse traversal only when requested,
  restoring the documented item order before responding. For backward traversal of a descending feed,
  seek newer rows with `>` comparisons in ascending query order, trim the lookahead row, then reverse
  returned items. Build `prevCursor` from the first returned item only when an earlier page exists;
  build `nextCursor` from the last returned item only when a later page exists. Verify the opposite
  direction with an existence check when lookahead does not establish it; an incoming cursor alone
  does not prove that rows still exist. See the [backward traversal example](../references/examples.md#backward-traversal-of-a-descending-feed)
  for anchors and boundaries.
