# Proposal

## Why

Comments still depend on legacy Supabase routes while memory reads and reactions use the current API. Members also need a way to follow focused conversations without deeply nested threads.

## What Changes

- Migrate comment creation, listing, editing, and deletion to the authenticated NestJS API and current database, and enable comments on Timeline and Vault detail screens.
- Add single-level replies, fetched on demand and displayed beneath their root comment.
- Preserve visible replies when a root comment is deleted, replacing the root content with a placeholder.
- Replace numeric comment versions with precision-preserving `updatedAt` optimistic locking.
- **BREAKING**: Rename the shared optimistic-lock request field from `expectedUpdatedAt` to `lastKnownUpdatedAt` for existing settings endpoints and their consumers.
- Preserve existing comment validation, authorization, accessibility, and idempotent submission requirements while adopting the shared API and cursor contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-comments`: Migrate comment operations, enable detail interaction, add one-level replies, cursor pagination, and timestamp-based editing.
- `comment-deletion`: Use timestamp locking and preserve deleted root placeholders with visible replies.
- `memory-detail`: Enable the migrated comments region on Timeline and Vault detail screens.
- `api-endpoints`: Specify comment routes and the renamed shared optimistic-lock request field.

## Impact

The change affects the shared Prisma schema and migrations, NestJS memory and settings endpoints, shared API contracts, the web application's memory and settings clients, localization, and tests. Legacy comment data transfer needs verified identity and memory mappings before execution. API clients using the old settings field must be updated together.
