# Active-space authorization matrix

This matrix is the release inventory for US-029. Migration-contract checks verify the declared
persistence boundary, while web tests verify product callers and observable denial behavior.
Service-role access is valid only for bounded maintenance operations.

## Actor vocabulary

| Actor | Meaning | Default result for protected operations |
| --- | --- | --- |
| `anon` | No authenticated JWT | Denied without private data or mutation |
| `same` | Active member of the target's active space | Allowed according to access class |
| `cross` | Active member of another active space | Denied as not found |
| `inactive-member` | Target-space membership is soft-deleted | Denied as not found |
| `inactive-space` | Membership exists but its space is soft-deleted | Denied as not found |
| `soft-deleted` | Target or a required parent is soft-deleted | Denied as not found |
| `altered-id` | Validly shaped foreign ID, cursor, or object path | Denied as not found |
| `non-owner` | Same-space partner mutating a member-owned record | Denied as not found |

Direct private-resource HTTP denials use status `404` and exactly
`{"code":"not_found","error":"Resource not found."}`. Persistence denials return no row and make
no change.

## Operation matrix

Legend: `A` allowed, `D` denied, `O` owning member only, `S` setup-only, and `N/A` unsupported.

| Resource | Operation | Capability | Persistence boundary | Product boundary | Access | anon | same | cross | inactive-member | inactive-space | soft-deleted | altered-id | non-owner | Aggregate / concurrency evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Active space | Read | space setup/settings | `spaces` SELECT; `get_active_space()` | settings and setup pages | Shared | D | A | D | D | D | D | N/A | A | Active membership selects exactly one active space |
| Active space | Create | space setup | `create_space(...)` | `POST /api/spaces/create` | Setup-only | D | S | S | S | S | N/A | N/A | N/A | Concurrent setup preserves one active membership per user |
| Active space | Rename | settings | `rename_active_space(...)` | `PATCH /api/spaces/name` | Shared | D | A | D | D | D | D | N/A | A | Optimistic `updated_at` permits one current revision |
| Active space | Update start date | settings | `update_active_space_start_date(...)` | `PATCH /api/spaces/start-date` | Shared | D | A | D | D | D | D | N/A | A | Optimistic `updated_at` permits one current revision |
| Membership | Read | space setup/settings | `space_members` SELECT; settings RPC | settings and active-space services | Shared | D | A | D | D | D | D | N/A | A | Active collection contains at most owner and partner |
| Membership | Create | space setup | `create_space(...)`; `process_space_invite(...)` | create/join routes | Setup-only | D | S | S | S | S | N/A | altered invite: D | N/A | Concurrent joins preserve role and user uniqueness |
| Display name | Read | settings/comments | `space_members` SELECT; settings RPC | settings and comment presentation | Member-owned | D | A | D | D | D | D | N/A | A | Names come only from active same-space memberships |
| Display name | Update | settings | `update_active_membership_display_name(...)` | `PATCH /api/membership/display-name` | Current-member | D | O | D | D | D | D | altered member: D | D | Stale revision conflicts only after ownership authorization |
| Memory | Collection read | memories | `memories` SELECT | timeline and vault routes | Shared | D | A | D | D | D | D | cursor: D | A | Filter before order/page; hidden rows cannot anchor cursors |
| Memory | Direct read | memories | `get_available_memory(uuid)` | `GET /api/memories/:memoryId` | Shared | D | A | D | D | D | D | D | A | Related metadata and child totals use the same scope |
| Memory | Create | memories | creation-attempt RPC workflow | `POST /api/memories` | Shared | D | A | D | D | D | N/A | altered authority: D | A | Creator is `auth.uid()` membership; idempotency is unique |
| Memory | Edit | memories | edit-attempt RPC workflow | `PATCH /api/memories/:memoryId/edit` | Shared | D | A | D | D | D | D | D | A | Revision check is atomic; replacement preserves valid photos |
| Memory | Place | memories | `place_memory(...)` | `PATCH /api/memories/:memoryId/placement` | Shared | D | A | D | D | D | D | D | A | Conflict is visible only after target authorization |
| Memory | Soft-delete | memories | `delete_memory(...)` | `DELETE /api/memories/:memoryId` | Shared | D | A | D | D | D | D | D | A | One current revision wins; children become unavailable |
| Photo metadata | Read | memories | `memory_photos` SELECT | memory detail/edit services | Shared | D | A | D | D | D | parent deleted: D | D | A | Photo list excludes unavailable parents before ordering |
| Photo object | Upload | memories | private `memory-photos` INSERT | create/edit workflows | Shared | D | A | D | D | D | parent deleted: D | path: D | A | Attempt ownership and position/path uniqueness hold concurrently |
| Photo object | Read | memories | private `memory-photos` SELECT policy | photo variant route | Shared | D | A | D | D | D | parent deleted: D | path: D | A | Only committed paths attached to authorized photos are readable |
| Photo object | Replace | memories | private storage write plus edit RPC | edit workflow | Shared | D | A | D | D | D | parent deleted: D | path: D | A | Failed replacement leaves committed objects intact |
| Photo object | Delete | memories | maintenance cleanup only | no direct product route | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Service role removes only database-produced orphan paths |
| Comment | Collection read | memories/comments | `memory_comments` SELECT | `GET /api/memories/:memoryId/comments` | Member-owned | D | A | D | D | D | parent/row deleted: D | cursor: D | A | Counts and pages exclude deleted and other-space rows |
| Comment | Create | memories/comments | `create_memory_comment(...)` | comments POST route | Member-owned | D | A | D | D | D | parent deleted: D | altered authority: D | A | Author is current membership; idempotency is unique |
| Comment | Update | memories/comments | `update_memory_comment(...)` | comment PATCH route | Member-owned | D | O | D | D | D | parent/row deleted: D | D | D | Ownership precedes validation/conflict; one revision wins |
| Comment | Soft-delete | memories/comments | `delete_memory_comment(...)` | comment DELETE route | Member-owned | D | O | D | D | D | parent/row deleted: D | D | D | Ownership precedes conflict; repeated deletion changes nothing |
| Reaction | Summary read | memories/reactions | reaction summary RPC | detail, timeline, vault, reactions route | Member-owned | D | A | D | D | D | parent deleted: D | D | A | Summary excludes hidden rows and reveals own selection only |
| Reaction | Create/update/delete | memories/reactions | `toggle_memory_reaction(...)` | reactions POST route | Member-owned | D | O | D | D | D | parent deleted: D | D | D | Unique membership-memory pair survives concurrent toggles |

## Persistence inventory

### Tables and constraints

| Table | RLS / grants | Parentage and integrity | Audit result |
| --- | --- | --- | --- |
| `users` | RLS; authenticated own SELECT/INSERT/UPDATE | PK references `auth.users`; normalized email uniqueness; name/email checks | Partner profile presentation needs an active same-space read rule |
| `spaces` | RLS; authenticated SELECT | creator/updater FKs; name/invite checks; active invite uniqueness | Mutations correctly use authenticated RPCs |
| `space_members` | RLS; authenticated SELECT | space/user FKs; display-name check; partial user, space-user, and space-role uniqueness | Role uniqueness caps an active space at two members |
| `join_attempt_limits` | RLS; no product table grants | user PK/FK; failed-attempt bound | Internal setup rate-limit state; direct operations N/A |
| `invite_regeneration_attempt_limits` | RLS; no product table grants | user PK/FK; request-history bound | Internal rate-limit state; direct operations N/A |
| `memories` | RLS; authenticated SELECT only | space/user FKs; `(id, space_id)` unique; same-memory cover FK | Missing maximum field/date checks and creator-space relationship |
| `memory_photos` | RLS; authenticated SELECT only | memory FK; position/path checks and uniqueness; `(id, memory_id)` unique | Product writes currently bypass authenticated policy |
| `memory_creation_attempts` | RLS; no product table grants | creator/space/memory FKs; creator-idempotency unique | Creator-space and memory-space relationships depend on RPC code |
| `memory_photo_staging` | RLS; no product table grants | attempt FK; position/path uniqueness | Authenticated upload must prove attempt ownership |
| `memory_edit_attempts` | RLS; no product table grants | editor/space/memory FKs; editor-idempotency and state checks | Editor-space and memory-space relationships depend on RPC code |
| `memory_edit_photo_staging` | RLS; no product table grants | attempt FK; bounded position and path uniqueness | Authenticated replacement must prove attempt ownership |
| `memory_photo_cleanup` | RLS; service maintenance only | attempt FK; unique nonblank path | Direct product operations N/A by explicit maintenance rationale |
| `memory_comments` | RLS; authenticated SELECT only | same-space memory FK; body/fingerprint checks; author-idempotency unique | Author-space ownership and positive version need hardening |
| `memory_reactions` | RLS; no authenticated grants or policies | membership/memory FKs; type check; membership-memory unique | Independent FKs permit cross-space parentage |

### Storage

| Bucket | Policies | Audit result |
| --- | --- | --- |
| private `memory-photos` | Authenticated SELECT for committed variant paths with active user, membership, space, memory, and photo chain | Missing authenticated INSERT/UPDATE policy and behavioral policy tests; cleanup DELETE stays maintenance-only |

### Function and grant groups

| Group | Functions | Effective grant | Audit result |
| --- | --- | --- | --- |
| Setup | `create_space`, `get_active_space`, `process_space_invite`, `complete_space_setup`, `regenerate_space_invite` | authenticated | Identity derived from `auth.uid()`; `get_active_space` and `complete_space_setup` still need empty search paths |
| Settings | `get_active_space_settings`, `rename_active_space`, `update_active_space_start_date`, `update_active_membership_display_name` | authenticated | Compliant actorless product contracts |
| Memory read | `get_available_memory` | authenticated | Security invoker backed by RLS |
| Memory creation | reserve, stage variants, mark uploaded, finalize | service role | Product bypass; reservation trusts `p_creator_user_id` |
| Memory editing | reserve, stage variants, mark uploaded, finalize | service role | Product bypass; reservation trusts `p_editor_user_id` |
| Memory mutation | `place_memory`, `delete_memory` | service role | Product bypass; trusts `p_actor_user_id` |
| Comments | create, update, delete comment | service role | Product bypass; trusts `p_author_user_id` |
| Reactions | summary and toggle | service role | Product bypass; trusts `p_user_id` |
| Creation cleanup | fail attempt, list stale staging, mark cleaned | service role | N/A to product access; retain for bounded server-produced paths |
| Edit cleanup | fail attempt, list stale/cleanup, mark cleaned/completed | service role | N/A to product access; retain for bounded server-produced paths |
| Obsolete | `stage_memory_photo(uuid,uuid,integer)` | service role | Drop after callers use variant staging |

Every security-definer product or maintenance function must use `set search_path = ''`, fully
schema-qualified references, explicit revocation from `public` and `anon`, and the least privileged
execute grant listed above.

## Non-applicable rationale

- Hard deletion is not an MVP product operation; records use soft deletion where supported.
- Spaces and memberships are created only through create/join setup invariants, not active-space CRUD.
- A display name belongs to the current membership, so a submitted membership identifier is not an
  applicable operation input.
- Photos have no independent product delete route. Replacement is part of an authorized memory edit;
  physical deletion is bounded maintenance using database-produced paths.
- Reactions expose aggregate counts and the current member's selection, never a collection of other
  members' reaction records.
- Setup and current-resource settings routes may return `401` for a missing session because they do
  not address a submitted private resource identifier.
- Aggregate and cursor cells apply only to collection-bearing reads; they are not applicable to
  scalar settings or write-only maintenance state.

## Release evidence

Each product boundary and persistence contract above must have a migration-contract, service, route, or
aggregate assertion, or an explicit not-applicable rationale. The release does not add SQL or pgTAP tests.

### Verified on 2026-09-07

- `pnpm dlx supabase db reset`: passed; all forward migrations apply from an empty database.
- Direct private-resource route suites: 80 tests passed, including authorization-before-validation
  cases and exact generic denial bodies.
- `pnpm --filter web-app check`: passed with four existing `noImgElement` warnings.
- `pnpm --filter web-app typecheck`: passed.
- `pnpm --filter web-app test:run`: 99 files and 599 tests passed.
- `pnpm --filter web-app build`: passed.
- Product code audit: `createAdminClient` remains only in creation/edit cleanup modules; authenticated
  product RPC calls contain no submitted actor, owner, membership, or space authority argument.

### Acceptance review

- Active-space and ownership rules are represented in the matrix and in forward database constraints.
- Product RPCs derive identity from `auth.uid()` and accept no actor, owner, membership, or space authority
  argument.
- Authenticated storage policies bind staged object paths to the current member's active attempt.
- Direct private-resource routes return the exact generic `404` body before mutable validation.
- Aggregate and collection services use authenticated clients and active-space-scoped persistence paths.
- Cardinality, parentage, idempotency, reaction uniqueness, and optimistic revisions are database-enforced.
- Service-role access remains only in bounded cleanup modules operating on database-produced identifiers.
