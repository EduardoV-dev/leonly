# Backend Rules

Apply to server operations, API handlers, background workers (queue consumers, scheduled jobs, and
event-triggered functions), data access, SQL, server configuration, and their tests.
Load general rules as well. Shared contracts may require inspection across frontend/backend assignments.


## Input And Error Boundaries

- Treat route handlers, server-invoked actions, RPC functions, webhooks, file uploads, URL parameters,
  cookies, headers, and third-party responses as untrusted input.
- Validate type, length, range, format, and allowed values on the server. Client validation is only for UX.
- Return safe, specific validation/domain errors; use generic messages for unexpected failures and
  enumeration-sensitive authentication outcomes, following general rules. Never expose raw exception
  messages, stack traces, SQL details, internal paths, tokens, or enumeration clues.

## API Responses And Pagination

- Require the standard envelope on first-party JSON APIs: success has `ok: true`, a `data` payload,
  `error: []`, and a string `message`; failure has `ok: false`, `data: null`, an `error` array, and a
  string `message`. Each error has string `code` and `message`, and optional string `field`.
  Keep appropriate HTTP statuses. Preserve protocol-defined redirects, streams, downloads, and bodyless responses.
- Health-check endpoints, including liveness/readiness, return the shared
  [HealthResponse](../../ev-api-contracts/assets/contracts.md#health-check-exception) directly, without
  an envelope: `{ status, checks }`, with per-dependency `up`/`down`. All up = `ok`/200, mixed =
  `degraded`/503, all down = `down`/503. Preserve safe diagnostics and do not weaken ordinary contracts.
- Wrap the entire pagination payload in that envelope: `data` contains `{ data: items, meta }`.
  Offset metadata requires boolean `hasNextPage`/`hasPreviousPage` and numeric `totalItems`/`page`/`pageSize`.
  Require positive bounded pagination inputs, one-based pages, totals over authorized filtered rows,
  and flags consistent with totals. Use deterministic ordering with a unique tie-breaker.
- Cursor metadata always includes `nextCursor: string | null` and `resetCursor: boolean`; include
  `prevCursor: string | null` only when explicitly requested. Use null at traversal boundaries and
  verify another page exists. Set `resetCursor` to true when the current pagination chain is invalid;
  clients must discard stored cursors/accumulated pages and restart from the beginning without a cursor.
  Otherwise emit false, including ordinary empty/final pages; a null cursor alone does not require a reset.
- Require shared cursor encode/decode utilities, Zod payload validation, an extendable base schema,
  and schema-aware methods. Recognized malformed incoming encoding/JSON/payloads are API validation
  errors; invalid server-generated cursors and unexpected utility defects are safe internal failures.
- When available, use both `createdAt` and `id` in cursor payloads, deterministic ordering, and
  lexicographic continuation predicates; preserve timestamp precision. Extensions must match query ordering.
  Keep authorization and filters consistent across pages; cursors are not authorization.
- When implementing pagination, recommend offset for numbered/random-access pages and exact totals,
  or cursor for sequential/large/changing datasets. Ask the user to choose and stop until answered,
  unless the current task already specifies the choice. Review-only work reports violations without
  interrupting for implementation decisions; load installed `ev-api-contracts` for implementation.

## Concurrency Strategy And Optimistic Locking

Rule ID: `backend-optimistic-locking`.

- Select the simplest mechanism that preserves the business invariant and existing contracts:

  | Requirement | Strategy |
  | --- | --- |
  | Last-write-wins is acceptable; no decision relies on a previous read | Standard update. |
  | Increment or decrement a current value | Atomic relative update. |
  | A condition or state transition fits one statement | Atomic conditional update; check affected rows. |
  | A stale edit could overwrite a user's changes | Optimistic locking. |
  | Dependent operations require protected state | Transaction; use pessimistic locks if simpler statements cannot enforce the invariant. |

  An atomic update here means a relative update or one with a concurrency-safe condition; every SQL
  UPDATE is atomic. Preserve established API preconditions rather than removing them implicitly.
- When optimistic locking is needed, require the validated last-read token on update request bodies,
  including partial updates. Prefer an integer version, reusing an existing suitable version column;
  otherwise require the `lastKnownUpdatedAt` timestamp string with proven strict advancement.
  Reject missing or malformed values and preserve exact version range and precision.
- Perform one atomic conditional update with resource identity, authorization/tenant scope, and
  the selected version or timestamp in its predicate. A read-compare-write sequence is insufficient.
  Treat the token as a precondition, never a writable entity field; bind parameters safely.
- Continue only when exactly one row updates, returning its persisted new token. Zero matches
  return HTTP 409 through the ordinary failure envelope with a safe refresh instruction, preserving
  existing authorization/not-found policy without revealing resource existence. Zero matches alone
  do not prove a stale token; do not convert unexpected database failures into conflicts.
- Preserve exact token precision across database reads, serialization, clients, validation, and binding.
  Do not round microseconds through JavaScript `Date` or unsafe integers through JavaScript numbers.
  Every writer affecting the protected concurrency boundary must atomically advance its token, even for
  rapid/no-op writes; clock resolution alone is insufficient. For JavaScript/PostgreSQL system timestamps use `timestamptz(3)` with safe migration
  of existing higher-precision values; see [PostgreSQL rules](../../ev-postgres/references/locking.md).
- Never retry without the predicate or overwrite using a silently refreshed token. Run success side
  effects only after successful persistence; roll back related transactional writes on conflict. Sync
  the client cache with the returned token before subsequent edits. Avoid sharing tokens between unrelated
  concurrency boundaries.
- Verify matching/stale tokens, exactly one winner for concurrent updates, token advancement and exact
  round trips, invalid/missing input, scoped access, and failure/rollback behavior.
  For implementation detail, use the [shared contract and examples](../../ev-api-contracts/references/optimistic-locking.md).

## Transactions And Locking

Rule ID: `backend-transactions-locking`.

- Wrap two or more mutations belonging to one atomic operation in a transaction, including an
  optimistic conditional write and related writes; roll everything back on failure or conflict.
- For pessimistic locking, acquire the appropriate lock inside the transaction and hold it until the
  protected work finishes. Protect every relevant state dependency, acquire multiple locks in a
  consistent order, and configure appropriate lock/transaction timeouts. Keep transactions short; never
  wait for user input or external APIs while holding locks. Handle failures and retry deadlocks only
  when the entire transaction is safe to retry. An autocommit locking read cannot protect subsequent statements.
- Choose optimistic or pessimistic locking for the same protected operation, not both. A single atomic
  optimistic write does not need an explicit transaction solely for locking. If another invariant
  requires a transaction or a different strategy, surface that requirement; never weaken correctness.
- Verify rollback and concurrent behavior at the database boundary; test lock lifetime when using
  pessimistic locking. Do not confuse a database's implicit update locks with explicit pessimistic locking.

## Feature-Owned Worker Structure And Event Validation

Rule ID: `backend-worker-structure`.

For background workers, load the complete [worker structure and validation rules](backend-worker-structure.md).
Organize functions by business capability, keep trigger entry points thin, validate complete incoming
messages at ingress, and pass parsed domain messages to trigger-independent business operations.
Use the project's shared-contract package for genuinely shared schemas; keep function-private code private.

## SQL And Other Injection Prevention

- Use a database query builder, parameterized SQL, or typed RPC parameters. Never concatenate or
  interpolate untrusted values into SQL text.
- Values cannot parameterize table names, column names, sort directions, or operators. Map dynamic
  identifiers to a fixed server-side allowlist.
- Validate filter, pagination, and ordering input before passing it to a query builder.
- Avoid shell commands. When required, use argument-array APIs such as `execFile` or `spawn` without
  `shell: true`; never concatenate user input into a command.
- Treat template expressions, log fields, email headers, HTTP headers, and file paths as injection
  boundaries. Use structured APIs, reject control characters, and constrain paths to an expected root.

## Access And Data Protection

- Enforce an explicit server-side access policy for every read and mutation. Require authentication,
  ownership, and tenant membership when that policy depends on them. Intentionally public operations
  may permit anonymous access; do not add authentication solely because an endpoint reads or writes.
  Hiding a UI control is not authorization, and missing enforcement is not an implicit public policy.
- Never trust client-provided user IDs, roles, ownership fields, prices, statuses, or permission flags.
  Derive identity from the verified session and sensitive values from server-owned data.
- Design authorization before implementation; deny access by default. Check object-level and
  function-level permissions to prevent broken access control.
- For any data store, test that users cannot read or change another account's rows when the access
  policy prohibits it. Intentionally public data remains accessible under its explicit policy.
- Grant the least database and application privileges needed. Load applicable technology companions
  for RLS and database-specific privileged-function requirements.

```text
// Avoid: require login for an intentionally public catalog solely because it reads data.
// Also avoid: assume a private order endpoint is public because it lacks an authentication check.
// Prefer: verify the declared public policy for catalog reads; enforce identity and resource/tenant
// permissions for private order reads and mutations. Public operations still need input validation,
// safe output, and applicable abuse controls.
```

## Browser-Facing Server Security

- Keep a restrictive Content Security Policy. Avoid `unsafe-inline` and `unsafe-eval`; use nonces or
  hashes when inline code is unavoidable.
- Set authentication cookies with `HttpOnly`, `Secure`, and an appropriate `SameSite` value.
- Limit CORS to known origins and set security headers.
- Verify authentication callbacks, OAuth `state`, redirect destinations, session expiry, and account
  recovery flows. Rate-limit login, invite, lookup, and other abuse-prone endpoints.
- Protect state-changing cookie-authenticated requests from CSRF with `SameSite` cookies plus Origin
  checks or CSRF tokens where cross-site requests are possible. Do not mutate state through `GET`.

## Service And Operational Security

- Verify webhook signatures before trusting payloads.
- Restrict outbound requests to required hosts/protocols. Block private, loopback, link-local,
  metadata, and redirect-based destinations to prevent SSRF.
- Log security-relevant events with request and actor identifiers, but no secrets. Alert on repeated
  authentication, authorization, and validation failures, and suspicious rate spikes.
- Set request body, upload, query, recursion, and execution limits. Handle timeouts and partial
  failures explicitly so exceptional conditions fail closed without corrupting data.

## Completion Checklist

- Trust-boundary input is validated; identity, permissions, and sensitive values are server-owned
  where applicable, never accepted as authority merely because the client supplied them.
- Declared public/private policies are enforced; authorization and cross-account isolation hold where applicable.
- Queries, commands, paths, outbound requests, and webhooks have applicable injection/integrity controls.
- Cookie/CSP/CORS/CSRF controls apply where relevant; abuse and execution limits preserve data integrity.
- Relevant tests cover access control, hostile input, timeouts, and partial failures.
- Workers follow function ownership and schema boundaries; tests cover validated processing, no business
  effects for invalid messages, trigger retry behavior, and business operations independent of triggers.
- API envelopes and pagination metadata match their contracts; cursor checks cover malformed input,
  round trips, tied timestamps, boundaries, reset signaling/client restart, and backward navigation when requested.
- Concurrency mechanisms protect the operation's invariant; where optimistic locking applies, stale
  tokens fail atomically with HTTP 409 and all relevant writers advance the selected token.
