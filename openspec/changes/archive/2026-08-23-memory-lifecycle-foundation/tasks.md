# Tasks: Memory Lifecycle Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–500 authored lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | One migration-revision and application-verification unit |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending user approval |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: not needed
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Revise baseline and foundation migrations for UUID identifiers, `deleted_at` availability, integrity, indexes, grants, RLS, helper, and lookup RPC | One unit | Local database reset and application verification | Use the available local database tooling | Reset the local database and revise migrations before data exists |

TDD is not enabled in `openspec/config.yaml`. No SQL tests are authored for this change; verification is a
local migration reset followed by application-level checks. The design threat matrix is explicitly N/A,
so no threat-specific RED tasks apply.

## Phase 1: Migration Revision

- [x] 1.1 Revise the existing baseline migration so `spaces` and `space_members` use UUID primary keys and `users`, spaces, and members use nullable `deleted_at` availability; leave UUID `users` and transient `join_attempt_limits` unchanged.
- [x] 1.2 Revise `supabase/migrations/20260823180000_memory_lifecycle_foundation.sql` so `memories` and `memory_photos` use UUID primary keys, memories use nullable `deleted_at` availability, photos inherit parent availability, and all application/RPC identifiers are UUID strings.
- [x] 1.3 Update ownership, authorization, unique, and timeline indexes so available-record predicates use `deleted_at is null`, and the timeline partial index also requires `visibility = 'timeline'`.
- [x] 1.4 Update SELECT-only RLS, grants, the fixed-search-path available-membership helper, and security-invoker `get_available_memory(uuid)` so deleted users, spaces, members, or memories are unavailable and the RPC returns SQL `null` for every unavailable UUID.

## Phase 2: Reset and Application Verification

- [x] 2.1 Reset the local database after revising the baseline and foundation migrations; do not preserve or backfill existing data.
- [x] 2.2 Verify through the application that UUID-string identifiers, available-member authorization, inherited photo availability, non-enumerating unavailable outcomes, and timeline-only ordering behave as specified.
- [x] 2.3 Run `openspec validate memory-lifecycle-foundation --strict --no-interactive`.

## Phase 3: Private Cover Previews

- [x] 3.1 Revise the foundation migration to create the private `memory-photos` Storage bucket and a SELECT-only `storage.objects` policy that matches each object name to `memory_photos.object_path`, requires its parent memory, space, and membership to be available through `deleted_at`, and grants no public or write access.
- [x] 3.2 Add a server-only cover-preview resolver that establishes available-memory authorization before using the persisted cover `object_path` to create a bounded-lifetime signed URL; do not accept client object paths or expose service-role credentials.
- [x] 3.3 Update the timeline cover handoff to use the authorized signed URL instead of a raw object path, without adding creation/upload UI or binary validation/cleanup behavior.
- [x] 3.4 Add focused application coverage for authorized private cover previews and the generic unavailable outcome; confirm no signed URL is returned for missing, deleted, other-space, or unauthorized memories.
- [x] 3.5 Reset the local database and verify the private bucket, object RLS, server resolver, and timeline preview behavior, then run `openspec validate memory-lifecycle-foundation --strict --no-interactive`.
