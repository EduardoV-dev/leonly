# US-025: Enforce Active-Space Access Across MVP

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** Authentication, active-space membership

## User Story

As a Leonly user, I want my shared-space data to remain private so only active members of my space can access memories, places, comments, reactions, and settings.

## Intended Outcome

Every protected feature applies one invariant: a user can access a record only if they are an active member of that record's active space. This is enforced by database RLS and server-side checks, not browser state.

## Scope

- Spaces, memberships, memories, memory photos, comments, reactions, places, place ratings, settings, and storage objects.
- Read, create, update, delete/soft-delete, direct routes, aggregate queries, and file access.

## Business Rules

- Unauthenticated users cannot access private data.
- Server code derives authorization context; it never trusts a submitted `space_id`.
- Inactive memberships, inactive spaces, and inactive records are denied.
- Database constraints enforce cardinality and uniqueness rules in addition to RLS.

## Acceptance Criteria

- [ ] Each MVP table and storage bucket has reviewed, tested RLS policies before use.
- [ ] Users cannot read or mutate another space's data by URL, API call, or payload changes.
- [ ] Users cannot create a record in another space or act on inactive/deleted records.
- [ ] Direct routes, aggregates, comments, reactions, ratings, and uploads enforce the same invariant.
- [ ] Authorization failures return safe errors without leaking data.

## Verification

- [ ] For every resource, test unauthenticated, cross-space read, cross-space write, altered ID, inactive-member, deleted-record, and direct-route attempts.
- [ ] Review RLS with an authenticated test client, not a service-role client.
