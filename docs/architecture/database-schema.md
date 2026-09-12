# Database Schema Design

Status: accepted design, not yet the implemented schema.

This document defines Leonly's provider-neutral relational data model. It describes domain data,
relationships, lifecycle state, and integrity rules without prescribing a hosting provider, queue,
worker runtime, CDN, or object-storage bucket layout. Until the migration is implemented, the
database migrations remain the source of truth for runtime behavior.

## Design decisions

- Memory creation and editing use one `memory_attempts` table.
- Memory creation and editing do not use request idempotency keys or request fingerprints.
- A memory asset is a logical image or video, not an individual stored object.
- Original, cover, and detail representations are rows in `memory_asset_objects`, distinguished by
  `variant_type` rather than separate columns.
- Processing status belongs to `memory_asset_objects`. `memory_assets` does not duplicate that
  derived state.
- New and retained assets selected by a create or edit operation are represented uniformly through
  `memory_attempt_assets`.
- Asset cleanup is persisted independently from the mechanism that performs it.
- Application-level rate-limit state uses one generic `rate_limits` table.
- Existing comment idempotency remains unchanged. Removing it requires a separate decision.

## Database overview

```text
users
  |
  +----< space_members >---- spaces
              |                 |
              |                 +----< memories
              |                           |
              |                           +----< memory_assets
              |                                      |
              |                                      +----< memory_asset_objects
              |
              +----< memory_attempts
                          |
                          +----< memory_attempt_assets >---- memory_assets

memories ----< memory_comments
memories ----< memory_reactions >---- space_members

memory_attempts ----< memory_asset_cleanup

rate_limits is independent because its subject may be a user, membership, address hash, or another
application-defined identity.
```

## Identity

### `users`

Stores the application profile for an authenticated identity. Authentication systems may change;
only their stable subject identifier crosses into this schema.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable application-owned identifier used by domain foreign keys. |
| `auth_subject` | Text | Yes | Unique | Stable identifier supplied by the authentication system without assuming a particular provider or identifier format. |
| `name` | Text | Yes |  | User-level profile name retained independently from a space-specific display name. |
| `email` | Text | Yes | Case-insensitive unique | Contact and account identity data. Uniqueness prevents two profiles from claiming the same normalized address. |
| `avatar_url` | Text | No |  | Optional profile image reference. It is not part of the memory asset lifecycle. |
| `deleted_at` | Timestamp | No |  | Supports reversible or auditable account deactivation without immediately removing referenced domain history. |
| `created_at` | Timestamp | Yes |  | Records when the profile entered the application. |
| `updated_at` | Timestamp | Yes |  | Supplies a reliable last-modified value for profile changes. |

Important rules:

- `name` must contain between 1 and 100 trimmed characters.
- `email` must not be blank and must be unique after normalization.
- Active application access excludes rows with `deleted_at` set.

## Shared spaces

### `spaces`

Represents the private shared context containing members and memories.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable identifier for all space-owned data. |
| `name` | Text | Yes |  | User-visible name of the shared space. |
| `start_date` | Date | Yes |  | Relationship date used by date-based product features. |
| `invite_code` | Text | No | Partial unique | Current invitation credential; null when no invitation is available. |
| `invite_code_expires_at` | Timestamp | No |  | Makes invitation validity explicit and independently enforceable. |
| `created_by_user_id` | UUID | Yes | Foreign to `users.id` | Preserves who created the space. |
| `updated_by_user_id` | UUID | Yes | Foreign to `users.id` | Preserves who last changed space-level settings. |
| `deleted_at` | Timestamp | No |  | Soft-deletes the space while retaining relational history. |
| `created_at` | Timestamp | Yes |  | Records creation time. |
| `updated_at` | Timestamp | Yes |  | Records the latest space-level change. |

Important rules:

- `name` must contain between 2 and 100 trimmed characters.
- An active non-null `invite_code` must be unique.
- `invite_code_expires_at` must be null when `invite_code` is null.

### `space_members`

Associates a user with a space and stores identity that is specific to that space.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable membership identity used to attribute domain actions. |
| `space_id` | UUID | Yes | Foreign to `spaces.id` | Identifies the space in which the membership is valid. |
| `user_id` | UUID | Yes | Foreign to `users.id` | Identifies the participating user. |
| `display_name` | Text | Yes |  | Name displayed to the other member within this space. |
| `role` | Enum | Yes |  | Distinguishes `owner` from `partner` for role-sensitive behavior. |
| `onboarding_completed_at` | Timestamp | No |  | Records completion without deriving it from unrelated profile fields. |
| `deleted_at` | Timestamp | No |  | Deactivates membership while preserving attribution history. |
| `created_at` | Timestamp | Yes |  | Records when the membership was created. |
| `updated_at` | Timestamp | Yes |  | Records the latest membership change. |

Important rules:

- `display_name` must contain between 2 and 100 trimmed characters.
- A user may have only one active membership.
- A user may have only one active membership in a given space.
- A space may have only one active member for each role.
- Composite uniqueness on membership, user, and space supports ownership-preserving foreign keys.

## Rate limiting

### `rate_limits`

Stores bounded, application-level rolling-window state. It is intended for low-frequency business
operations whose limits depend on application identity. Infrastructure-level traffic protection is
outside this schema.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `scope` | Text | Yes | Composite primary | Names the limited operation, such as `space.join.failed`. Text allows new scopes without schema migrations. |
| `subject_key` | Text | Yes | Composite primary | Opaque identity being limited. Prefixes distinguish users, memberships, or hashed network identifiers. |
| `attempts` | Timestamp array | Yes |  | Retains only timestamps inside the rolling window so the application can calculate exact remaining capacity and retry time. |
| `blocked_until` | Timestamp | No |  | Represents an explicit penalty period when it differs from normal window exhaustion. |
| `expires_at` | Timestamp | Yes | Indexed | Allows inactive limiter state to be deleted without understanding each scope's policy. |
| `created_at` | Timestamp | Yes |  | Records when this subject first acquired state for the scope. |
| `updated_at` | Timestamp | Yes |  | Supports expiration, diagnostics, and stale-state inspection. |

Important rules:

- The primary key is (`scope`, `subject_key`).
- Both key components must contain non-blank text.
- The attempts array has a defensive global size bound.
- Sensitive subjects such as email addresses or network addresses are stored as hashes, not raw values.
- Limit size and window duration remain application policy rather than rows in another configuration table.

This table replaces `join_attempt_limits` and `invite_regeneration_attempt_limits`.

## Memories

### `memories`

Stores published memory content and references its selected logical cover asset.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable identifier for the memory aggregate. |
| `space_id` | UUID | Yes | Foreign to `spaces.id` | Enforces ownership by one shared space. |
| `creator_membership_id` | UUID | Yes | Composite foreign to `space_members` | Attributes creation to the membership that was active in the owning space. |
| `creator_user_id` | UUID | Yes | Composite foreign to `space_members` | Preserves direct user attribution and participates in the membership integrity constraint. |
| `cover_asset_id` | UUID | No | Composite foreign to `memory_assets` | Selects the logical asset used as the cover while allowing memories without assets. |
| `title` | Text | Yes |  | Required user-visible memory title. |
| `description` | Text | No |  | Optional long-form context. |
| `location` | Text | No |  | Optional human-readable place. |
| `memory_date` | Date | Yes | Indexed with listing order | Date represented by the memory, independent from record creation time. |
| `visibility` | Enum | Yes | Indexed with listing filters | Distinguishes timeline placement from private-vault placement. |
| `deleted_at` | Timestamp | No | Indexed with active filters | Soft deletion immediately removes the memory from active reads while preserving recovery and audit options. |
| `created_at` | Timestamp | Yes |  | Records persistence time and provides a stable listing tie-breaker. |
| `updated_at` | Timestamp | Yes |  | Acts as the optimistic concurrency version for edit, placement, and deletion operations. |

Important rules:

- `title` must contain between 1 and 120 trimmed characters.
- `description` may contain at most 2,000 trimmed characters.
- `location` may contain at most 150 trimmed characters.
- The creator membership, creator user, and space must identify the same membership row.
- `cover_asset_id`, when present, must identify an asset owned by the same memory.

## Memory attempts

### `memory_attempts`

Represents the temporary, durable boundary for both memory creation and memory editing. Its purpose
is operation coordination and atomic finalization, not request idempotency.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Correlates the operation, its staged assets, and eventual result. |
| `attempt_type` | Enum | Yes |  | Distinguishes `create` from `edit` while sharing one lifecycle model. |
| `status` | Enum | Yes | Indexed | Records `preparing`, `processing`, `completed`, `failed`, `conflict`, or `expired`. |
| `actor_membership_id` | UUID | Yes | Composite foreign to `space_members` | Identifies the membership performing the operation. |
| `actor_user_id` | UUID | Yes | Composite foreign to `space_members` | Preserves direct actor attribution and validates membership ownership. |
| `space_id` | UUID | Yes | Composite ownership key | Fixes the operation to one space for its entire lifetime. |
| `memory_id` | UUID | No | Composite foreign to `memories` | Identifies the edited memory, or the created memory after successful creation finalization. |
| `expected_updated_at` | Timestamp | No |  | Required for edits to prevent overwriting a memory changed after editing began; absent for creation. |
| `title` | Text | Yes |  | Persists the requested final title across the operation lifecycle. |
| `description` | Text | No |  | Persists the requested final description. |
| `location` | Text | No |  | Persists the requested final location. |
| `memory_date` | Date | Yes |  | Persists the requested final memory date. |
| `visibility` | Enum | Yes |  | Persists the requested final placement. |
| `failure_code` | Text | No |  | Stores a stable machine-readable failure category without coupling the database to log text. |
| `expires_at` | Timestamp | Yes | Indexed | Bounds how long an unfinished attempt may retain staged resources. |
| `completed_at` | Timestamp | No |  | Records terminal success separately from general update activity. |
| `created_at` | Timestamp | Yes |  | Records when the attempt began. |
| `updated_at` | Timestamp | Yes |  | Records its most recent lifecycle transition. |

Important rules:

- Create attempts have no `expected_updated_at`.
- Edit attempts require both `memory_id` and `expected_updated_at`.
- Completed attempts require `memory_id` and `completed_at`.
- `idempotency_key`, `request_fingerprint`, and reused-result fields do not exist.
- `memory_id`, when present, must belong to `space_id`.

## Memory assets

### `memory_assets`

Represents one logical media item, currently an image and potentially a video later. It does not
store processing status because that state belongs to its individual object representations.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable logical asset identifier shared by all representations. |
| `memory_id` | UUID | Conditional | Foreign to `memories.id` | Owns a finalized asset under a published memory. It is absent while the asset is staged. |
| `staging_attempt_id` | UUID | Conditional | Foreign to `memory_attempts.id` | Owns a new asset under an unfinished operation. It is absent after finalization. |
| `asset_type` | Enum | Yes |  | Distinguishes `image` from future media categories such as `video`. |
| `position` | Small integer | Conditional | Unique per memory | Defines display order after publication. Staged order belongs to `memory_attempt_assets`. |
| `created_at` | Timestamp | Yes |  | Records when the logical asset was introduced. |
| `updated_at` | Timestamp | Yes |  | Records ownership or metadata changes, including finalization. |

Important rules:

- Exactly one of `memory_id` and `staging_attempt_id` must be present.
- Published assets require a nonnegative `position`.
- Staged assets do not have a published `position`.
- (`memory_id`, `position`) must be unique.
- Composite uniqueness on (`id`, `memory_id`) supports the same-memory cover constraint.
- There is deliberately no `status` column; readiness is derived from required object rows.

### `memory_asset_objects`

Represents one physical object belonging to a logical asset. Adding another representation requires
a new row and variant type, not a new column on `memory_assets`.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable identifier for one physical representation. |
| `asset_id` | UUID | Yes | Foreign to `memory_assets.id` | Groups all physical representations under one logical image or video. |
| `variant_type` | Enum | Yes | Unique per asset | Identifies the representation: initially `original`, `cover`, or `detail`. |
| `object_path` | Text | Yes | Unique | Provider-neutral opaque locator for the stored bytes; it is not a public URL or bucket name. |
| `status` | Enum | Yes | Indexed | Records `pending`, `uploaded`, `processing`, `ready`, or `failed` for this representation. |
| `content_type` | Text | No |  | Records the validated media type when known rather than trusting a file extension. |
| `byte_size` | Big integer | No |  | Records validated object size for limits and diagnostics. |
| `failure_code` | Text | No |  | Records a stable processing failure category without storing user-facing or provider-specific messages. |
| `created_at` | Timestamp | Yes |  | Records when this representation was reserved. |
| `updated_at` | Timestamp | Yes |  | Records its latest upload or processing transition. |
| `ready_at` | Timestamp | No |  | Records when the representation became safe for finalization and delivery. |

Important rules:

- (`asset_id`, `variant_type`) must be unique.
- `object_path` must contain non-blank text and be globally unique.
- `byte_size`, when known, must be nonnegative.
- `ready_at` is required exactly when `status` is `ready`.
- Initial variant types are `original`, `cover`, and `detail`; new media needs add rows rather than columns.

### `memory_attempt_assets`

Defines the exact final asset selection and order requested by an attempt. During editing it contains
both retained assets and newly staged assets.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `attempt_id` | UUID | Yes | Composite primary, foreign to `memory_attempts.id` | Associates the desired selection with one create or edit operation. |
| `asset_id` | UUID | Yes | Composite primary, foreign to `memory_assets.id` | Identifies either an existing retained asset or a new staged asset. |
| `position` | Small integer | Yes | Unique per attempt | Defines the requested final order independently from the currently published order. |
| `is_cover` | Boolean | Yes | Partial unique per attempt | Identifies the requested logical cover without referencing a specific object variant. |
| `created_at` | Timestamp | Yes |  | Records when the asset entered the operation's desired set. |

Important rules:

- The primary key is (`attempt_id`, `asset_id`).
- (`attempt_id`, `position`) must be unique.
- At most one row per attempt may have `is_cover` set.
- `position` must be nonnegative.
- Finalization verifies retained assets belong to the edited memory and staged assets belong to the
  attempt.

### Asset finalization

```text
New asset before finalization
  memory_id          = null
  staging_attempt_id = current attempt
  position           = null

New asset after finalization
  memory_id          = finalized memory
  staging_attempt_id = null
  position           = memory_attempt_assets.position

Retained asset during edit
  remains attached to the memory
  receives memory_attempt_assets.position

Existing asset omitted from edit
  object paths are recorded for cleanup
  logical asset and object metadata are removed atomically
```

Finalization succeeds only when every required object for every newly staged asset is `ready`.

## Asset cleanup

### `memory_asset_cleanup`

Persists object paths that are no longer referenced but cannot be removed atomically with relational
data. The table says what requires cleanup, not which infrastructure component performs it.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | Generated big integer | Yes | Primary | Provides stable ordering and efficient bounded cleanup scans. |
| `attempt_id` | UUID | No | Foreign to `memory_attempts.id` | Links cleanup caused by a failed or completed operation while also permitting cleanup caused by memory deletion. |
| `object_path` | Text | Yes | Unique | Preserves the opaque locator after its asset metadata is removed. |
| `cleanup_after` | Timestamp | Yes | Indexed | Allows delayed cleanup and retry without coupling timing to request execution. |
| `cleaned_at` | Timestamp | No |  | Null means pending; a value records successful cleanup without a redundant status column. |
| `created_at` | Timestamp | Yes |  | Records when the cleanup obligation was created. |

Important rules:

- `object_path` must contain non-blank text and be unique.
- Cleanup must confirm the path is no longer referenced by `memory_asset_objects` before removal.
- A failed cleanup leaves `cleaned_at` null so it remains retryable.

## Comments

### `memory_comments`

Stores member-authored discussion attached to an available memory.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable comment identifier. |
| `memory_id` | UUID | Yes | Composite foreign to `memories` | Identifies the parent memory. |
| `space_id` | UUID | Yes | Composite ownership key | Enforces that comment and memory belong to the same space. |
| `author_membership_id` | UUID | Yes | Composite foreign to `space_members` | Attributes the comment to a membership in the owning space. |
| `author_user_id` | UUID | Yes | Composite foreign to `space_members` | Preserves direct user attribution and validates membership ownership. |
| `body` | Text | Yes |  | Stores comment content. |
| `version` | Integer | Yes |  | Supports optimistic concurrency for editing and deletion. |
| `idempotency_key` | UUID | Yes | Unique per author | Prevents duplicate comments after an ambiguous create response. This remains an explicit existing behavior. |
| `request_fingerprint` | Text | Yes |  | Prevents reuse of a comment idempotency key with different content. |
| `deleted_at` | Timestamp | No | Indexed with active history | Soft-deletes comments without losing thread history immediately. |
| `created_at` | Timestamp | Yes | Indexed with history order | Defines chronological order and pagination. |
| `updated_at` | Timestamp | Yes |  | Records edits independently from creation. |

Important rules:

- `body` must contain between 1 and 1,000 trimmed characters.
- `version` must be positive and increments on each edit.
- The memory, author membership, author user, and space must describe one valid ownership chain.
- (`author_user_id`, `idempotency_key`) must be unique.

## Reactions

### `memory_reactions`

Stores the current reaction selected by one membership for one memory.

| Column | Type | Required | Key | Rationale |
| --- | --- | --- | --- | --- |
| `id` | UUID | Yes | Primary | Stable reaction identifier. |
| `membership_id` | UUID | Yes | Composite foreign to `space_members` | Identifies the member whose current selection this row represents. |
| `space_id` | UUID | Yes | Composite ownership key | Ensures membership and memory belong to the same space. |
| `memory_id` | UUID | Yes | Composite foreign to `memories` | Identifies the reacted-to memory. |
| `reaction_type` | Text | Yes |  | Stores one of `heart`, `laugh`, `cry`, or `star`. |
| `created_at` | Timestamp | Yes |  | Records when the member first reacted. |
| `updated_at` | Timestamp | Yes |  | Records the latest reaction change. |

Important rules:

- (`membership_id`, `memory_id`) must be unique, representing one current reaction.
- `reaction_type` is restricted to the four supported values.
- Composite foreign keys guarantee the membership and memory share `space_id`.

## Lifecycle diagrams

### Attempt lifecycle

```text
preparing ----> processing ----> completed
    |                |
    |                +---------> failed
    |                |
    |                +---------> conflict  (edit only)
    |
    +--------------------------> expired
```

### Asset-object lifecycle

```text
pending ----> uploaded ----> processing ----> ready
   |              |              |
   +--------------+--------------+----------> failed
```

Not every object needs every intermediate state. A generated representation may transition directly
from `pending` to `processing`, while an uploaded original passes through `uploaded`.

## Table changes

| Existing structure | New structure | Reason |
| --- | --- | --- |
| `join_attempt_limits` | `rate_limits` | One bounded mechanism supports multiple business scopes. |
| `invite_regeneration_attempt_limits` | `rate_limits` | Avoids one table per limited operation. |
| `memory_photos` | `memory_assets` and `memory_asset_objects` | Separates logical media from physical representations and permits future video assets. |
| `memory_creation_attempts` | `memory_attempts` | Creation and editing share one operation lifecycle. |
| `memory_edit_attempts` | `memory_attempts` | Removes duplicated attempt infrastructure. |
| `memory_photo_staging` | `memory_assets` owned by an attempt | A staged asset differs by ownership, not by entity type. |
| `memory_edit_photo_staging` | `memory_assets` owned by an attempt | Create and edit use the same staging model. |
| `memory_photo_cleanup` | `memory_asset_cleanup` | Uses media-neutral terminology and provider-neutral paths. |
| `cover_photo_id` | `cover_asset_id` | The cover references a logical asset rather than one physical representation. |
| `object_path`, `cover_object_path`, `detail_object_path` columns | `memory_asset_objects` rows | New variants no longer require columns or table migrations. |

## Final table catalog

```text
Identity
  users

Spaces
  spaces
  space_members

Application safeguards
  rate_limits

Memories
  memories
  memory_attempts
  memory_assets
  memory_asset_objects
  memory_attempt_assets
  memory_asset_cleanup

Engagement
  memory_comments
  memory_reactions
```

## Infrastructure-neutral boundary

The schema intentionally does not define:

- Queue names, message formats, or publication timestamps.
- Worker ownership, execution leases, or retry-provider semantics.
- Storage bucket names, public URLs, CDN domains, or signing mechanisms.
- Hosting-provider deployment details.
- Authentication-provider tables or token formats.

Those decisions may change independently. The database retains only domain ownership, desired state,
object identity, processing readiness, cleanup obligations, and consistency constraints.
