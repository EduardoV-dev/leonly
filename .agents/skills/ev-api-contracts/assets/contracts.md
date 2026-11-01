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
Success always includes `error: []`; failure always includes `data: null` and an `ApiError[]`.
Both branches include a string `message`. Keep client errors free of internal details.

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
