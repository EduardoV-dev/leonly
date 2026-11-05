# API Contract Examples And Exceptions

Apply these examples with the complete skill and contract template. Snippets illustrate alternatives,
not standalone applications. Reuse shared exported contracts and the project's existing cursor utilities.
Resolve the required pagination decision before implementation; these examples do not choose a strategy.

## Wrap The Entire Page

```ts
// Avoid: metadata sits outside the response payload.
{
  ok: true,
  data: orders,
  meta: paginationMeta,
  error: [],
  message: "Orders retrieved.",
}
```

```ts
// Prefer: ApiResponse<OffsetPage<OrderDto>> or the matching cursor page contract.
{
  ok: true,
  data: {
    data: orders,
    meta: paginationMeta,
  },
  error: [],
  message: "Orders retrieved.",
}
```

The outer `data` contains the page; the inner `data` contains its items. An empty collection is a
successful page with an empty items array, not automatically a `404` or failure. Ordinary success includes
`error: []`; failure includes `data: null` and the shared error array. Preserve appropriate HTTP statuses,
safe actionable error messages, and protocol-defined bodyless/stream/download/redirect responses.

## Health Checks Return Status And Dependency Checks Directly

Use the shared `HealthResponse` type, without the ordinary response envelope:

```ts
// HTTP 200: all checks pass.
const healthyResponse: HealthResponse = {
  status: "ok",
  checks: { database: "up", redis: "up" },
};

// HTTP 503: a mix of passing and failing checks.
const degradedResponse: HealthResponse = {
  status: "degraded",
  checks: { database: "up", redis: "down" },
};

// HTTP 503: all checks fail.
const unavailableResponse: HealthResponse = {
  status: "down",
  checks: { database: "down", redis: "down" },
};
```

Do not emit `status: "ok"` with a failed check, return HTTP 200 for degraded/down states, or wrap health
payloads in `{ ok, data, error, message }`. A single checked dependency yields only `ok` or `down`;
`degraded` requires both up and down results. Failed/timed-out probes count as down without losing
other results. Include only dependencies the endpoint actually checks, not a fixed database/Redis list.
For zero configured checks, resolve the intended health signal rather than inventing a healthy result.
Keep diagnostics safe and preserve the direct payload through filters/interceptors on HTTP 503.
Ordinary business endpoints still require `ApiResponse<T>`.

## Offset Counts Describe The Matching Dataset

```ts
// Avoid: page length is not the total dataset count; the old `total` name is not the contract.
{
  hasNextPage: false,
  hasPreviousPage: true,
  total: orders.length,
  page: 3,
  pageSize: 10,
}
```

```ts
// Prefer: page 3 contains the final 2 of 22 authorized matching orders.
{
  hasNextPage: false,
  hasPreviousPage: true,
  totalItems: 22,
  page: 3,
  pageSize: 10,
}
```

Use the same authorization and filters for the count and items. Do not count unauthorized rows or
derive `totalItems` from the returned slice. With this dataset, a valid request for page 4 returns
empty items, `totalItems: 22`, `page: 4`, `hasNextPage: false`, and `hasPreviousPage: true`. Do not
silently clamp the requested page. An empty dataset has `totalItems: 0` and both flags false.
Verify empty, partially filled final, exactly full final, and out-of-range pages. Preserve the
existing positive-integer and bounded-page-size validation requirements.

## A Full Cursor Page Does Not Prove Another Page Exists

```ts
// Avoid: a full final page incorrectly advertises continuation.
const hasNextPage = rows.length === pageSize;
```

```ts
// Prefer: the query fetched at most pageSize + 1 authorized matching rows.
const hasNextPage = rows.length > pageSize;
const items = rows.slice(0, pageSize);
```

When another page exists, construct its cursor from the last returned item, not the extra lookahead
row. Using the lookahead row as the position skips it on the next request. A separate existence query
is also acceptable. At the end, including empty pages, emit `nextCursor: null`. Omit `prevCursor`
entirely unless backward traversal was explicitly requested; emit null at its beginning boundary.

## Cursor Reset Invalidates The Pagination Chain

Always include `resetCursor: boolean` in cursor metadata, including bidirectional pages:

```ts
// Ordinary final or empty page: traversal ended; the existing chain remains valid.
const finalPageMeta: CursorPage<OrderDto>["meta"] = { nextCursor: null, resetCursor: false };

// Invalidated pagination chain: discard stored cursors and accumulated pages; restart without a cursor.
const resetPageMeta: CursorPage<OrderDto>["meta"] = { nextCursor: null, resetCursor: true };
```

Do not append a reset response to accumulated pages or continue using an old cursor. Document the
endpoint's invalidation conditions and how its reset response is handled. Do not infer a reset from
an empty page or a null cursor. Preserve validation errors for malformed incoming cursors and internal
errors for server-generated cursor failures or unexpected utility defects. Verify ordinary continuation,
empty/final pages with false, and invalidation with true followed by a client restart without a cursor.

## Cursor Position Matches The Complete Ordering

```sql
-- Avoid: continuation ignores the tie-breaker used by the ordering.
WHERE created_at < $1
ORDER BY created_at DESC, id DESC
```

```sql
-- Prefer for descending (createdAt, id): compare the complete ordered position.
WHERE (created_at < $1 OR (created_at = $1 AND id < $2))
ORDER BY created_at DESC, id DESC
```

These are continuation fragments, not complete queries. Preserve authorization and filters on every
page; keep the OR expression parenthesized when combining it with other predicates. Invert comparisons
for ascending traversal. Additional ordering fields must participate in both the cursor and matching
lexicographic comparisons. Nullable fields need an explicit null-ordering strategy rather than blindly
copying these non-null examples. Preserve timestamp precision and restore documented item order after
backward traversal when requested. Verify timestamp ties, boundaries, and round trips.

### Backward Traversal Of A Descending Feed

Only implement this when backward navigation was requested. Use the API's documented traversal-direction
mechanism; the cursor payload remains the same ordered position, without a required direction field.
For descending `(createdAt, id)`, a backward request anchors at the first item of the page being left.

```sql
-- Avoid for backward traversal: this seeks older rows, continuing forward instead.
WHERE (created_at < $1 OR (created_at = $1 AND id < $2))
ORDER BY created_at DESC, id DESC
LIMIT $3
```

```sql
-- Prefer: seek newer rows, nearest first. Bind $3 to pageSize + 1.
WHERE (created_at > $1 OR (created_at = $1 AND id > $2))
ORDER BY created_at ASC, id ASC
LIMIT $3
```

These fragments retain the same authorization and filters as the forward query. Trim the lookahead
before restoring the response order:

```ts
// Avoid: reversing the lookahead too can put an item from another page into the response.
const items = rows.reverse().slice(0, pageSize);
```

```ts
// Prefer: rows are in ascending query order; the response remains descending.
const hasPreviousPage = rows.length > pageSize;
const items = rows.slice(0, pageSize).reverse();
```

For nonempty returned items:

- Encode `prevCursor` from the first returned item only when the backward lookahead proves an earlier
  page exists; otherwise emit null.
- Encode `nextCursor` from the last returned item only when older matching rows exist. Verify with a
  forward existence query when needed; the incoming cursor does not prove its original page still exists.
- Invert directions consistently for an ascending feed. Do not add payload fields or duplicate utilities.

```text
// Avoid: return [7, 6, 5] after reversing all four backward query rows and then trimming.
// Prefer: with tied timestamps, IDs sorted descending [9..1], pageSize 3, and backward anchor 3:
// query rows are [4, 5, 6, 7]; trim to [4, 5, 6], then reverse to [6, 5, 4].
// prevCursor anchors at 6 (earlier page exists); nextCursor anchors at 4 (later page exists).
// Backward anchor 6 returns [9, 8, 7] with prevCursor null at the beginning.
```

At the final page, `nextCursor` is null; on empty pages both cursors are null. Omit `prevCursor`
entirely when backward traversal was not requested. Verify full/partial pages, tied timestamps, first
and last pages, and deleted anchor rows without inferring existence solely from the supplied token.

## Extend Shared Schemas Instead Of Rebuilding Cursor Contracts

```ts
// Avoid: an assertion does not validate decoded caller-controlled content.
const cursor = JSON.parse(decodedCursor) as OrderCursor;
```

```ts
// Prefer when the endpoint actually sorts by orderTotal as well as the base fields.
const orderCursorSchema = baseCursorSchema.extend({
  orderTotal: orderTotalSchema,
});

type OrderCursor = z.infer<typeof orderCursorSchema>;
```

Use the schema-aware shared methods rather than endpoint-local encoding/decoding. The following
illustrates an object-parameter API; preserve an existing compatible utility's established signature:

```ts
// Avoid: a local decoder bypasses the selected payload schema.
const cursor = JSON.parse(decodeUrlSafe(encodedCursor)) as OrderCursor;
```

```ts
// Prefer: the shared decoder validates and infers the selected schema's payload.
const cursor = decodeCursor({ schema: orderCursorSchema, cursor: encodedCursor });
const nextCursor = encodeCursor({ schema: orderCursorSchema, payload: nextPosition });
```

The shared methods validate before encoding and after decoding. Recognized malformed incoming encoding,
JSON, or payloads are safe API validation failures. A server-generated payload that fails encoding/schema
validation is an internal failure; unexpected decoder defects are internal too. Do not catch every
exception and relabel it as invalid client input. Preserve causes and safe diagnostic evidence, without
leaking internals in client responses. Use schema composition supported by the installed Zod version
and preserve actual ID formats and timestamp precision.

```text
// Avoid: return INVALID_CURSOR with HTTP 400 because the server built an invalid nextPosition.
// Also avoid: expose a Zod stack trace or return an unhandled failure for malformed caller input.
// Prefer: malformed caller cursor -> HTTP 400, ApiResponse failure with a safe INVALID_CURSOR error.
// Invalid server-generated cursor or unexpected utility defect -> HTTP 500, ApiResponse failure
// with a generic INTERNAL_ERROR message; retain safe diagnostic evidence on the server.
```

Keep the current base cursor contract: `createdAt` and `id` when available, with extensions only for
actual ordering needs. Do not require new version, sort, filter, fingerprint, or page-size fields.
Filters, ordering, and authorization must still remain consistent across requests. Cursors never grant
access. This intentional validation of encoded input does not justify widening ordinary workflow DTOs
to `unknown` and repeatedly parsing them.
