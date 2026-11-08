# Design

## Context

See `proposal.md`. Existing comment history and mutation routes use Supabase; current memory detail and reactions use the authenticated API. Existing Timeline and Vault details intentionally do not mount comments. The new schema must not assume legacy users, memberships, or memories have identical IDs in the current backend.

## Goals / Non-Goals

**Goals:** Preserve existing comment guarantees while enabling the agreed thread behavior, current-backend authorization, and full-precision optimistic concurrency.

**Non-Goals:** Deep nesting, realtime synchronization, changing memory visibility, or automatic production data transfer without verified mappings and an authorized execution plan.

## Decisions

### One table, one parent level

Add `memory_comments` with UUID v7 `id`, `memory_id`, `space_id`, `author_membership_id`, nullable `parent_comment_id`, `body`, `deleted_at`, `created_at`, and `updated_at`. Use composite foreign keys for memory/space, membership/space, and parent/memory/space; index eligible root and reply traversal. Keep parent immutable. Validate that the parent is an undeleted root in the same transaction as creation; serialize reply creation and root deletion on the same root row so ordering is deterministic. A self-referencing foreign key alone cannot enforce depth. A separate reply table duplicates authorization and mutation logic.

Comment creation does not enforce idempotency. The composer prevents duplicate submissions while a request is pending; a retry after an uncertain response can create another comment.

### Placeholder and retrieval

Top-level listing includes active roots and deleted roots with at least one active reply. Deleted roots return a distinct placeholder representation without body or author actions; their active replies remain readable. Deleted replies are excluded. Return active reply counts with root pages; no reply bodies are included until requested. Creation under deleted roots is forbidden. A tombstone preserves conversation context without cascading another author's content; deleting the thread would lose that context.

### Cursor pages

Reuse shared schema-validated cursor utilities and `ApiResponse<CursorPage<T>>`; use `nextCursor` and `resetCursor`. Roots sort `(created_at DESC, id DESC)`; replies sort `(created_at ASC, id ASC)`. Use complete tuple predicates and lookahead. Scope each cursor to its memory and thread as needed, validate anchor eligibility and authorization, and reset invalidated chains. Malformed input is a 400, not a reset. Preserve all six timestamp fractional digits; avoid JavaScript `Date` round trips. The old comment feature's malformed-cursor reset and `cursorReset` name are intentionally replaced by the shared contract.

### Timestamp concurrency and field rename

Reuse `OptimisticLockDto`, renamed to accept `lastKnownUpdatedAt`. Rename consumers for space name, start date, and display name as well as frontend requests, tests, and documentation. Comment reads return canonical full-precision `updatedAt`; edit and delete use atomic authorized predicates against the exact timestamp. Return generic unavailable before disclosing conflict; an authorized stale target yields 409. Advance `updated_at` on every successful edit and deletion, ensuring a strictly newer value even for same-timestamp or clock-regression cases. A numeric revision would also work but the user chose the existing timestamp-based convention.

### Frontend ownership

Mount comments on Timeline and Vault detail; use current API clients and shared response types. Keep root and reply query keys separate, fetch replies only on expansion, and reconcile affected lists and counts following mutations. Preserve drafts and focus on errors or conflicts, support keyboard operation, and localize new labels. Remove legacy comment-only routes and helpers only after verifying remaining callers and replacing tests.

## Risks / Trade-offs

- [Precision loss] → Use exact database timestamp strings end to end, including cursors and optimistic-lock tokens; test microsecond differences.
- [Timestamp collision or clock rollback] → Guarantee strictly increasing `updated_at` during successful mutations, not merely a clock read.
- [Data loss or misattribution] → Inventory legacy data and verify memory and identity mappings, counts, and referential integrity before any import; stop on unmapped records. Do not execute a live transfer without authorization.
- [Breaking settings clients] → Coordinate API, web, documentation, and tests in one deployment; identify other consumers before rollout.
- [Uncertain submission outcome] → A retry can create a duplicate comment; preserve the draft so the member can decide whether to retry.
- [Concurrent deletion and reply] → Lock the same parent row and validate after acquiring the lock; test both commit orders.

## Migration Plan

1. Add the schema migration and API support, then coordinate the renamed settings clients and comments frontend deployment.
2. If legacy data exists and migration is required, prepare and independently validate a mapping/import plan; preserve identities, content, timestamps, and deletion state where mapped. Do not execute destructive or live data operations as part of ordinary deployment without approval.
3. Verify counts, ownership, ordering, conflict handling, and current-backend reads. Roll back application traffic and the coordinated field rename together if needed; retain data and use a reviewed forward corrective migration rather than dropping comments.
