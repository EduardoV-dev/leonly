# US-025: Enforce Active-Space Access Across MVP

**Priority:** Must<br>
**Depends on:** Authentication, active-space membership

## User Story

As an active member, I want data in my active space to remain private so no unauthenticated,
inactive, or cross-space user can observe or change it.

## Intended Outcome

Every protected read and mutation derives identity from the authenticated session and permits access
only when that identity has an active membership in the record's active space. Database RLS,
constraints, storage policies, and server boundaries enforce the invariant independently of browser
state or submitted ownership fields.

## Scope

- Spaces, memberships, memories, memory photos, comments, reactions, places, place ratings, settings, and storage objects.
- Read, create, update, soft-delete, direct routes, aggregate queries, and file access.

## Business Rules

- Unauthenticated users cannot access private data.
- Server code derives authorization context; it never trusts a submitted `space_id`.
- Inactive memberships, inactive spaces, and soft-deleted records are denied.
- Database constraints enforce cardinality and uniqueness rules in addition to RLS.
- Active members have equal access to shared records and settings regardless of the informational
  creator/owner attribute. Member-owned records may be mutated only by the authenticated membership
  that owns them.
- Missing, inactive, soft-deleted, and inaccessible record IDs return the same generic not-found
  outcome.
- Collection queries omit records outside the active space rather than revealing that they exist.
- Service-role access does not substitute for active-member authorization in product request paths.

## Acceptance Criteria

- Every exposed MVP table and storage bucket enforces reviewed and tested RLS or storage policies
  before its owning feature is available.
- An unauthenticated request cannot read, create, update, soft-delete, or download private data.
- An active member can access shared records only when those records belong to the member's active
  space.
- Changing a route parameter, record ID, `space_id`, owner ID, or storage path cannot grant access
  to another space or member-owned mutation.
- Inactive memberships and inactive spaces grant no product or storage access.
- Missing, inactive, soft-deleted, and inaccessible resource IDs produce the same generic not-found
  response shape and reveal no resource attributes.
- Aggregate and collection responses contain no counts, ratings, reactions, comments, or metadata
  from another space.
- Concurrent writes cannot bypass active-member, cardinality, ownership, or uniqueness constraints.

## Decision Required

- Define the operation-by-resource authorization matrix for member-owned comments, reactions,
  ratings, display names, and currency preferences.
- Define the HTTP status and response body used for the generic not-found outcome.

## Verification Notes

- For every resource, cover unauthenticated, cross-space read, cross-space write, altered ID,
  inactive-member, inactive-space, soft-deleted-record, aggregate, and direct-route attempts.
- Exercise RLS and storage policies with authenticated member clients, not service-role clients.
- Verify product server paths do not bypass RLS or replace membership checks with submitted IDs.
- Include concurrent mutation tests where cardinality or uniqueness could be bypassed.
