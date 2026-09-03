## 1. Revocable Private Media

- [x] 1.1 Add a same-origin memory-photo route that validates memory/photo/variant identifiers,
  reauthorizes the active parent on every request, streams the server-owned variant without redirect or
  Storage metadata, and returns generic unavailable responses with private no-store security headers.
- [x] 1.2 Replace signed URL creation in Timeline, Vault, detail, and edit projections with opaque route URLs
  and update the photo types and renderers to request them directly without an authorization-bypassing image
  cache.
- [x] 1.3 Add route, resolver, and rendering tests for authorized cover/detail variants, malformed and foreign
  identifiers, inactive/deleted/cross-space parents, unavailable objects, response headers, and absence of
  object paths, signed credentials, redirects, or post-delete bytes.

## 2. Atomic Lifecycle Mutation

- [x] 2.1 Add a migration with the service-role-only `delete_memory` RPC that derives active-space authority,
  locks the parent, checks the expected `updated_at`, sets `deleted_at` atomically, and returns completed,
  conflict, or generic unavailable outcomes.
- [x] 2.2 In the same migration, revise comment create/edit/delete and reaction toggle RPCs to lock and recheck
  the parent memory before related writes using the documented membership-parent-child lock order.
- [x] 2.3 Do not add database integration coverage. Database test suites are intentionally excluded from this
  repository; web tests cover the application boundary.

## 3. Server Deletion Boundary

- [x] 3.1 Add a server-only deletion module that validates UUID and version input, invokes `delete_memory`,
  validates its result shape, and maps conflict and unavailable outcomes without leaking target state.
- [x] 3.2 Add `DELETE /api/memories/[memoryId]` with authenticated identity, a strict bounded JSON payload,
  204 success, established 409/404 responses, and redacted structured logging for unexpected failures.
- [x] 3.3 Add focused server and route tests for success, invalid input, unauthenticated and unavailable
  targets, stale versions, malformed RPC results, and recoverable failures.

## 4. Client Reconciliation

- [x] 4.1 Add a detail-owned deletion mutation that is single-flight per rendered memory, classifies conflict,
  unavailable, and uncertain network outcomes, and reauthorizes uncertain targets before reporting success or
  retry.
- [x] 4.2 Reconcile confirmed deletion by invalidating the full memory query family and dashboard projections,
  navigating to the prior collection for a first-page refresh, and preventing stale detail, comments,
  reactions, counts, or aggregates from remaining visible.

## 5. Confirmation And Surface Integration

- [x] 5.1 Build an accessible detail-only memory-delete action and destructive confirmation dialog with clear MVP
  retention copy, cancel behavior, pending locking, conflict refresh, retryable failure, live feedback, and
  predictable focus restoration.
- [x] 5.2 Inject deletion only into both direct detail views without adding controls to summary cards or
  regressing placement, edit, reaction, or comment interactions.
- [x] 5.3 Route successful detail deletion to the prior Timeline or Vault collection and add localized
  success/error/pending/confirmation strings without persistent query parameters.
- [x] 5.4 Add interaction tests for either member, confirmation and cancellation, keyboard/focus behavior,
  repeated activation, success destinations, absence from summary cards, conflict refresh, generic
  unavailable, uncertain-response reconciliation, and recoverable retry while preserving the prior memory.

## 6. Verification

- [x] 6.1 Run focused web tests, then `pnpm --filter web-app check`,
  `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and
  `pnpm --filter web-app build`.
- [x] 6.2 Verify the responsive detail deletion flow, absence of Delete on summary cards, keyboard and screen
  reader feedback, reduced motion, direct product/media/Storage denial, and first-page Timeline/Vault
  count/aggregate refresh.
- [x] 6.3 Record the staged deployment gate: release revocable media delivery, wait at least the former
  five-minute signed-URL TTL, and only then enable memory deletion controls and mutation traffic.
