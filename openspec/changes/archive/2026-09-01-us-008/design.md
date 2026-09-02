## Context

Memory placement is currently represented by `visibility` and the edit workflow can submit a different
visibility together with content changes. Timeline and Vault have distinct detail routes that reject a
memory in the wrong placement, while both use the same detail shape. US-008 adds a focused action from
those direct detail pages, so a completed move must navigate to the destination route rather than leave
the member on a now-invalid source route.

## Goals / Non-Goals

**Goals:**
- Make Timeline-to-Vault and Vault-to-Timeline placement a single authorized, atomic operation.
- Avoid lost updates when placement overlaps the existing optimistic edit workflow.
- Keep a single contextual detail action and refresh both list caches after success.

**Non-Goals:**
- Adding placement controls to Timeline or Vault cards.
- Changing, uploading, reordering, deleting, or restoring media during placement.
- Adding realtime partner updates, confirmation dialogs, audit history, or dedicated Supabase database
  test files.

## Decisions

### Use a dedicated version-checked placement mutation

The detail model will expose the existing encoded memory version. A new server boundary and API endpoint
will accept a target visibility plus that version, then call one transactional database RPC that verifies
the authenticated member's available active-space membership, source placement, active state, and
expected version before updating only `visibility` and `updated_at`.

This prevents a direct move from overwriting a concurrent edit or other completed mutation. Reusing the
multipart edit endpoint would make a simple placement action depend on full-form validation, retained
photo state, and edit-reservation cleanup, so it is rejected.

### Treat stale and unavailable states differently at the client boundary

An authorized active memory whose version changed returns a conflict outcome. The detail action refreshes
the route without navigation, allowing the member to retry from current state. Any state that is missing,
malformed, inactive, deleted, outside the active space, inaccessible, or already in the requested target
returns the existing generic unavailable outcome and discloses no state. Unexpected failures retain the
source detail and show a retryable error.

### Share one placement-action component across detail presentations

A client component receives the memory identifier, current visibility, and version from each direct
detail page. It derives the target label, disables itself during the request, invalidates
`memoryQueryKeys.all` after success, announces localized feedback, and pushes the destination detail
route. Both Timeline and Vault details retain their existing route-specific data loaders and layouts.

This avoids duplicating request, pending, conflict, error, and navigation behavior. Adding controls to
cards is rejected because the product decision scopes this interaction to direct detail pages.

## Risks / Trade-offs

- [Existing edit mutation can change visibility] → The placement RPC compares the expected version and
  updates only the placement column, so only one competing mutation can win.
- [Source detail becomes invalid after a successful move] → Invalidate client data before navigating to
  the destination-specific detail route.
- [A stale or unavailable outcome could leak placement state] → Use one generic unavailable response for
  all non-conflict eligibility failures and refresh only for the explicit stale-version conflict.
- [A 3rd-party double-click repeats a request] → Disable the control during submission and make the RPC
  source/target check reject a second completed request.

## Migration Plan

1. Add the transactional placement RPC and its least-privilege grants through a new Supabase migration.
2. Deploy server/API and detail action support together so the button never targets an absent endpoint.
3. Roll back application code by removing the detail action; the migration is additive and leaves memory
   placement data unchanged unless a member used the action. A rollback does not reverse completed moves.
