## 1. Build the authorization inventory

- [x] 1.1 Add a checked-in operation-by-resource matrix for spaces, memberships, memories,
  photos, comments, reactions, settings, and storage objects, including owning capability,
  persistence boundary, product boundary, access class, and denied response.
- [x] 1.2 Inventory every exposed table, private bucket, policy, grant, security-definer function,
  foreign key, check, uniqueness rule, and cardinality rule against the matrix.
- [x] 1.3 Map each applicable operation to anonymous, same-space, cross-space, inactive-member,
  inactive-space, soft-deleted, altered-ID, ownership-mismatch, aggregate, and concurrent cases;
  record an explicit rationale for each non-applicable cell.

## 2. Prove and harden persistence boundaries

- [x] 2.1 Add forward-only migrations that close every discovered policy, grant, function,
  parentage, ownership, cardinality, or uniqueness gap, with fixed search paths and
  schema-qualified references.

## 3. Remove product authorization bypasses

- [x] 3.1 Replace user-initiated service-role reads and mutations with request-scoped authenticated
  Supabase clients and RPCs that derive actors from `auth.uid()` rather than actor, owner,
  membership, or space parameters.
- [x] 3.2 Restrict remaining service-role usage to non-product maintenance operations using only
  server-produced identifiers, and add tests proving privileged access is never the sole
  authorization check for a product request.
- [x] 3.3 Audit all route parameters, payload schemas, cursors, owner fields, and storage paths so
  submitted identity cannot select a space or member-owned mutation target.
- [x] 3.4 Revoke obsolete function grants and remove superseded privileged RPC signatures after all
  authenticated callers have migrated.

## 4. Standardize non-enumerating HTTP boundaries

- [x] 4.1 Introduce the smallest shared server contract needed for HTTP `404` responses with
  `{ "code": "not_found", "error": "Resource not found." }` and no resource attributes.
- [x] 4.2 Update every direct private-resource route to map unauthenticated, malformed, missing,
  inactive, soft-deleted, cross-space, and ownership-inaccessible IDs to that exact response.
- [x] 4.3 Ensure mutable-field validation and `409` conflicts are returned only after the target and
  mutation ownership are authorized; preserve existing session-only redirects or `401` behavior.
- [x] 4.4 Add route tests comparing status and complete response bodies across all inaccessible
  variants and confirming denied responses expose no counts, metadata, state, or ownership.

## 5. Complete cross-feature release verification

- [x] 5.1 Run the migration-contract, service, route, and aggregate suites and resolve every uncovered
  or failing cell without weakening assertions; apply the full migration chain to a clean local database.
- [x] 5.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`.
- [x] 5.3 Review the completed matrix against US-029 acceptance criteria and document evidence for
  each criterion, including confirmation that product authorization never relies on service-role access.
