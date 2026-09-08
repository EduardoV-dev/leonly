## Context

The MVP now exposes private space, membership, memory, photo, comment, reaction, and settings data through
Supabase queries, RPCs, storage access, and Next.js routes. The owning stories established local access
rules, but implementations mix authenticated clients with service-role RPCs and use several unavailable
error shapes. US-029 is the final integration audit: it must make the authorization chain explicit, prove
tenant isolation at persistence and HTTP boundaries, and close discovered gaps without changing product
features.

## Goals / Non-Goals

**Goals:**

- Make the user-to-active-membership-to-active-space chain authoritative for every product operation.
- Define ownership consistently for shared and member-owned resources.
- Make missing and inaccessible private identifiers indistinguishable at HTTP boundaries.
- Prove RLS, storage, constraints, routes, aggregates, and concurrent writes with a maintainable matrix.
- Remove product-path reliance on service-role access wherever it bypasses authenticated policies.

**Non-Goals:**

- Add roles or unequal permissions between active MVP members.
- Add new product workflows, moderation, hard deletion, or account administration.
- Replace focused feature tests; the cross-feature suite supplements them.
- Treat browser UI visibility as authorization evidence.

## Decisions

### Use one checked-in authorization matrix

Create a reviewable matrix beside the security tests. Each row names the resource, operation, access class,
owning capability, persistence boundary, product boundary, expected denied response, and required actor
fixtures. Tests consume the same case vocabulary, but the matrix remains readable without executing code.
An explicit not-applicable rationale is required where an operation does not exist.

The access classes are:

| Access class | Rule |
| --- | --- |
| Shared | Either active membership in the active space may read and mutate. |
| Member-owned | Same-space active members may read shared presentation; only the owning membership mutates. |
| Current-member | Only the authenticated active membership may read or mutate the personal value. |
| Setup-only | Creation is governed by the existing create/join invariant rather than an active-space operation. |

This is preferable to separate per-feature checklists because drift in actor names, denial expectations, and
coverage is visible in one review surface.

### Standardize private-resource denials

Introduce one server-only response constant or helper only if multiple route files require it. A private
resource denial is always:

```json
{"code":"not_found","error":"Resource not found."}
```

with status `404`. Validation may return `400` only after authorization establishes that the caller may
operate on the addressed resource. Conflict may return `409` only to the authorized mutation owner. This
ordering prevents malformed IDs, revisions, or payloads from becoming an enumeration side channel.

Authentication pages and session-only endpoints may retain redirects or `401`; once a route addresses a
private identifier, absent authentication is folded into the same `404` resource outcome.

### Enforce authorization with the request's authenticated Supabase identity

User-initiated database and storage operations use the request-scoped authenticated Supabase client so RLS,
storage policies, and `auth.uid()` participate in the decision. Product RPCs derive the actor from
`auth.uid()` and do not accept actor, owner, membership, or space parameters. Security-definer RPCs retain a
fixed empty search path, schema-qualified references, least-privilege grants, and internal authorization.

Existing service-role product paths are audited and migrated to authenticated queries or RPCs. Service-role
access remains valid for explicitly non-product maintenance work such as bounded orphan cleanup, but it
cannot be the authority for a user-requested read or mutation. If privileged cleanup follows an authorized
operation, it must consume only server-produced identifiers and cannot affect the user-visible authorization
result.

### Verify persistence contracts without a SQL test suite

Keep persistence verification within the existing web-app Vitest suite. Migration-contract tests inspect the
forward migration for RLS policies, storage policies, fixed search paths, authenticated grants, actorless RPC
signatures, revoked privileged signatures, and database constraints. Route and service tests verify that
product callers use request-scoped clients, reject submitted authority, preserve authorization ordering, and
map inaccessible outcomes without disclosure. A clean local database reset proves that the migration chain
applies, but the release does not add SQL or pgTAP test infrastructure.

### Verify from persistence outward

Implement and review in this order:

1. Inventory tables, buckets, functions, grants, constraints, and existing tests.
2. Correct persistence policies and authenticated RPC contracts.
3. Remove privileged or identifier-trusting product paths.
4. Normalize route denials after authorization ordering is correct.
5. Add aggregate, direct-route, storage, and concurrency cases.

This order avoids polishing HTTP responses over a persistence boundary that still permits forbidden access.

## Risks / Trade-offs

- **Broad audit surface**: A single change can become difficult to review. Mitigation: organize work and
  tests by matrix row and keep each fix with its regression case.
- **Service-role migration changes RPC signatures**: Server services and migration tests may fail together.
  Mitigation: replace each call path atomically and revoke obsolete execute grants in the same migration.
- **Uniform `404` reduces diagnostic detail**: Clients lose resource-specific unavailable codes.
  Mitigation: preserve structured internal logs while returning no target detail to callers.
- **Authorization-before-validation costs an extra lookup**: Some malformed requests may require a guarded
  resource check. Mitigation: reject impossible identifier syntax with the same generic `404`, then authorize
  before validating mutable fields.
- **Migration-contract tests do not execute RLS behavior**: Static checks cannot prove runtime policy
  semantics. Mitigation: keep policies narrow, derive product identity inside reviewed RPCs, verify callers
  and denial behavior through web tests, and require a clean local migration reset before release.

## Migration Plan

1. Add the authorization inventory and migration-contract tests for current gaps.
2. Ship additive policy and RPC replacements, authenticated execute grants, and missing constraints.
3. Update server services and routes to use authenticated identity and the standard denial contract.
4. Revoke obsolete product RPC grants and remove superseded service-role call paths.
5. Run the full policy, web verification, and build gates; retain migrations as the rollback boundary.

Rollback reverts application callers first, then applies a forward migration restoring only the required
grants or functions. Existing migrations are never edited after deployment.

## Open Questions

- None. US-029 resolves the operation ownership matrix and generic HTTP outcome in this design.
