# Active-Space Authorization Matrix

The implemented baseline migration is the persistence source of truth. This inventory records the
tenant boundary enforced by RLS, storage policies, and authenticated RPCs.

## Actors

| Actor | Result for protected resources |
| --- | --- |
| `anon` | Denied without data or mutation. |
| `same` | Active member of the resource's active space. |
| `cross` | Active member of another space; receives no resource data. |
| `inactive` | Soft-deleted user, membership, space, or resource; receives no resource data. |

Private-resource HTTP routes return `404` with
`{"code":"not_found","error":"Resource not found."}` for unavailable resources.

## Product Boundaries

| Resource | Read | Mutation | Authority | Concurrency / integrity |
| --- | --- | --- | --- | --- |
| Users | Current active user only | `syncCurrentUser` upserts by `auth_subject` | Verified `auth.uid()` subject | Internal `users.id` never equals the auth UUID by assumption. |
| Spaces and memberships | Active members of the same active space | Setup, invite, and settings RPCs | Verified session resolves one internal user and membership | One active membership per user; one owner and at most one partner per space. |
| Rate limits | No product reads | Setup RPCs only | Authenticated subject key | Rolling timestamps are row-locked and bounded. |
| Memories | Active same-space members | Prepare/finalize, placement, and deletion RPCs | Current active membership from the verified session | `updated_at` guards placement and edit finalization. |
| Assets and objects | Published, ready variants in an authorized memory | Exact pre-authorized original paths; server publishes variants | Object -> asset -> space -> active membership chain | One owner per asset; one optional cover; unique published positions. |
| Comments | Active same-space members | Author-only edit/delete; member create | Current internal membership | Comment creation retains `(author_user_id, idempotency_key)` idempotency and version checks. |
| Reactions | Active same-space summary | One current reaction per membership and memory | Current internal membership | Unique `(membership_id, memory_id)`. |
| Cleanup | No product reads | Service-role maintenance only | Claimed lease | `FOR UPDATE SKIP LOCKED`, retries, and idempotent completion. |

## Persistence Inventory

| Boundary | Implemented contract |
| --- | --- |
| Tables | `users`, `spaces`, `space_members`, `rate_limits`, `memories`, `memory_attempts`, `memory_assets`, `memory_asset_objects`, `memory_attempt_assets`, `memory_comments`, `memory_reactions`, and `resource_cleanup` all have RLS enabled. |
| Identity | `users.auth_subject` is the unique provider link; all domain foreign keys use internal user IDs. |
| Memory lifecycle | `prepare_memory_attempt`, asset-object state RPCs, and `finalize_memory_attempt` replace creation/edit attempts and photo staging. Create/edit have no idempotency key or request fingerprint. |
| Storage | Private `memory-photos` policies authorize exact object paths through the active user, membership, space, asset, and object chain. |
| Cleanup | `claim_resource_cleanup`, `complete_resource_cleanup`, and `fail_resource_cleanup` are service-role-only. Missing external objects are a successful cleanup result. |
| Privileges | Public table/function defaults are revoked; application mutations execute only through authenticated RPCs that derive authority from `auth.uid()`. |

Every security-definer function uses `search_path = ''`, schema-qualified references, and verified
session authority. Product callers never submit user, membership, role, or space authority.

## Verification

```bash
pnpm dlx supabase db reset
pnpm --filter web-app check
pnpm --filter web-app typecheck
pnpm --filter web-app test:run
pnpm --filter web-app build
```
