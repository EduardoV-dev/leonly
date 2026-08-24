# Design: Memory Lifecycle Foundation

## Technical Approach

Revise the baseline and foundation Supabase migrations to establish UUID-keyed memory and ordered
photo-metadata storage and replace `is_active` lifecycle semantics with `deleted_at`. Authenticated reads
fail closed through RLS and a session-derived lookup RPC. A private Storage bucket binds each object name
to `memory_photos.object_path` under its owning space prefix, and the server creates short-lived cover
preview URLs only after that lookup boundary succeeds. The model supplies US-003's eligibility and
total-order columns without implementing its pagination or UI. Creation, uploads, validation, cleanup,
retries, and all product screens remain outside this change.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|----------|-------------------------|-----------|
| Use UUID primary keys for all application-owned records | Bigint identities; mixed key types | UUID aligns `spaces`, `space_members`, `memories`, and `memory_photos` with existing UUID users and is the only application/RPC identifier representation. |
| Store `memories` and `memory_photos` separately, with `memory_visibility` values `timeline` and `vault` | One table; text visibility | Normalized ordered metadata avoids repeating memory data, while an enum prevents unsupported visibility states. |
| Enforce cover ownership with composite key `(cover_photo_id, id)` referencing `memory_photos(id, memory_id)` | Trigger; application check | A declarative foreign key makes cross-memory covers impossible on every write path. Cover-photo deletion is restricted until the cover is cleared or replaced. |
| Represent lifecycle availability with nullable `deleted_at` | `is_active`; a separate availability flag | `NULL` consistently means available for users, spaces, members, and memories, avoiding conflicting lifecycle states. Photos inherit their parent memory's availability; rate-limit records remain transient. |
| Apply SELECT-only RLS and expose `get_available_memory(p_memory_id uuid)` as `security invoker` | Application filtering; `security definer` read RPC | RLS remains authoritative. The RPC accepts no space/user identity, inherits RLS, and returns SQL `null` for absent, deleted, other-space, or unauthorized UUIDs. |
| Use a private `memory-photos` bucket and Storage SELECT policy joined through `memory_photos` and `memories` | Public bucket; path-only authorization; application-only authorization | A private bucket makes every object read subject to RLS. The policy matches `storage.objects.name` to persisted `object_path` and requires the same available parent memory and available-space membership as metadata reads. |
| Sign cover URLs in a server-side resolver after `get_available_memory` succeeds | Public URL; browser-side signing; signing from a client-supplied path | The resolver preserves the memory availability boundary before granting a time-limited capability. Browser clients retain only the user session and receive a URL, never the service-role credential. |
| Use targeted foreign-key and partial timeline indexes | Separate boolean indexes; one broad full index | Indexes use `deleted_at is null` predicates and match available-membership checks, referential actions, and US-003's exact timeline eligibility/order. |

## Data Flow

    authenticated session ──→ get_available_memory(memory_id)
                                   │ security invoker
                                   ▼
    auth.uid() ──→ available membership helper ──→ memories RLS ──→ memory_photos RLS
                                                      │
                              server preview resolver ──→ signed URL for object_path
                                                      │
                                   unavailable ───────┴──→ generic not found

`private.is_available_space_member(space_id)` checks `auth.uid()`, available `space_members`, and an
available `spaces` row. Policies additionally require the memory to have `deleted_at is null`.
Vault records remain readable to either active member through the lookup boundary but are omitted by
the timeline partial index and future timeline predicate.

The bucket remains private. Its object SELECT policy restricts `bucket_id` and joins an object name to
`memory_photos.object_path`, then to an available memory in an available space for `auth.uid()`. The
server resolver receives a memory UUID, not an object path. It first uses the available-memory boundary,
reads the cover metadata under the authenticated session, and then uses server-only signing capability to
create a short-lived URL. Neither a public bucket nor a direct public URL is introduced.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| Existing baseline migration | Modify | UUID primary keys for application-owned records and `deleted_at` lifecycle fields for users, spaces, and members. |
| `supabase/migrations/20260823180000_memory_lifecycle_foundation.sql` | Modify | UUID memory/photo keys, private bucket, space-scoped object policy, deleted-at availability, constraints, indexes, grants, RLS, helper, and UUID lookup RPC. |
| `apps/web-app/src/features/memories/` | Modify | Server-only authorized cover-preview resolver and signed URL handoff for timeline consumers. |

## Interfaces / Contracts

`spaces`, `space_members`, `memories`, and `memory_photos` use UUID primary keys. Existing `users` and
`join_attempt_limits` retain UUID identifiers. `users`, spaces, members, and memories expose nullable
`deleted_at`; `NULL` means available and replaces every `is_active` semantic. `memories` stores UUID
`space_id`, `creator_user_id`, and optional `cover_photo_id`; title; nullable description and location;
date-only `memory_date`; visibility; and UTC `created_at`/`updated_at`. `memory_photos` uses UUID `id`
and `memory_id`, nonblank `object_path`, zero-based `position`, and timestamps. Availability of a photo
is inherited from its parent memory. `join_attempt_limits` remains transient and unchanged. No five-photo
or file-content validation belongs here.

Authenticated receives SELECT only on both tables and EXECUTE only on
`get_available_memory(uuid)`. Public and anon receive neither. The private helper has a fixed empty
`search_path`, schema-qualified references, and the minimum authenticated execution privilege needed
by policies. No INSERT, UPDATE, or DELETE policy is introduced. The `memory-photos` bucket is private;
`storage.objects` grants SELECT only where its object name equals a photo `object_path` and the parent
memory, space, and membership are available. It grants no public object access and no write policy.

The server-only cover-preview resolver accepts a memory UUID, calls the available-memory boundary before
using its cover photo, and signs only that persisted path with a bounded lifetime. It does not persist the
URL, accept an object path from the client, or expose service-role credentials to a browser.

Indexes are: `memories(space_id)`, `memories(creator_user_id)`, partial
`memories(cover_photo_id, id)` for cover-FK checks, unique `memory_photos(memory_id, position)`, and
partial `memories(space_id, memory_date DESC, created_at DESC, id DESC)` where
`visibility = 'timeline'` and `deleted_at is null`. Every partial unique/index predicate for available
records uses `deleted_at is null`; photo ordering is unique per parent memory because photos inherit that
memory's availability.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Migration | UUID keys, `deleted_at` lifecycle model, constraints, indexes, private bucket, and RLS | Revise both migrations and reset the local database; no SQL test suite is authored. |
| Application | UUID-string RPC boundaries, available-member authorization, photo inheritance, signed cover previews, and non-enumerating unavailable results | Verify through the consuming application after the reset. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary.

## Migration / Rollout

Revise the existing baseline and foundation migrations, then reset the local database. No data must be
preserved or backfilled. Verify that the private bucket and its policies are recreated by the reset, then
run application checks for authorized and unavailable cover previews. A future change affecting populated
environments requires a separate data-safe migration plan.

## Open Questions

None.
