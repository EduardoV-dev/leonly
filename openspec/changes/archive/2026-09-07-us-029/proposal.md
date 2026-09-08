## Why

The completed MVP features enforce active-space access through several tables, RPCs, routes, and
storage paths, but those boundaries have only been verified within their owning stories. A final
cross-feature audit is needed to prove that unauthenticated, inactive, and cross-space actors cannot
observe private records, infer aggregate data, or mutate records they do not own.

## What Changes

- Define one operation-by-resource authorization matrix for spaces, memberships, memories, photos,
  comments, reactions, shared settings, personal display names, and storage objects.
- Standardize inaccessible private-resource responses as HTTP `404` with the identifier-free body
  `{ "code": "not_found", "error": "Resource not found." }`, regardless of whether the target is
  missing, inactive, soft-deleted, malformed, or outside the active space.
- Audit product server paths so identity, active membership, space, and member ownership are derived
  from the authenticated session rather than submitted identifiers or service-role access.
- Review and close gaps in database RLS, storage policies, foreign keys, cardinality constraints, and
  uniqueness constraints across every exposed MVP resource.
- Add cross-feature migration-contract and web security coverage for reads, writes, direct routes,
  aggregates, altered IDs, storage access, inactive state, soft deletion, and database invariants.
- Preserve equal active-member access to shared records and settings while limiting member-owned
  comment, reaction, and display-name mutations to the authenticated owning membership.

## Capabilities

### New Capabilities

- `active-space-access-control`: Cross-feature authorization matrix, non-enumerating private-resource
  outcomes, aggregate isolation, database and storage enforcement, and security verification rules.

### Modified Capabilities

- None. Existing feature behavior remains authoritative; this change defines and verifies the
  cross-feature security contract and closes implementation gaps without expanding MVP features.

## Impact

- Supabase migrations and migration-contract checks for exposed tables, RPCs, constraints, and private
  storage.
- Next.js route handlers and server-only feature services that read or mutate private resources.
- Web application tests for direct-route denial and the standardized generic not-found response.
- A maintained authorization matrix mapping each resource and operation to its access and ownership
  rule.
