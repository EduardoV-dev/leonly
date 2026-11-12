# Design

## Context

The editor shares `MemoryEditorForm` with creation but still loads and saves through Supabase.
Current-backend creation already issues immutable uploads, confirms them, commits `MemoryFile`
associations and outbox events, and processes images asynchronously. Editing will use that lifecycle.

`Memory.updatedAt` is `timestamptz(3)` with a strictly advancing database trigger. Placement uses exact
`lastKnownUpdatedAt`. The worker processes committed attachments with expiring file leases and
independent cover/detail readiness. File records retain keys and attribution for deferred cleanup.

The completed `migrate-memory-deletion-to-nestjs` change remains unsynced. Preserve its detail Delete
action, bodyless deletion, ordered cascade, and `deleting` file state. Sync/archive deletion before
syncing this change's overlapping deltas.

## Goals / Non-Goals

**Goals:**
- Reuse existing models and the creation upload/outbox/worker lifecycle.
- Keep retained photos usable while newly added photos process independently.
- Atomically save metadata, final photo selection, cover, and removal state with stale-write protection.
- Make save completion, later image failure, and uncertain transport outcomes explicit.
- Preserve the shared form, both-member access, signed previews, and affected-view refresh.

**Non-Goals:**
- No `MemoryEdit`, attempt history, durable replacement reservation, or other new persistence model.
- No pre-commit image preparation, edit-status resource, resume/finalize protocol, or readiness polling.
- No delayed photo swap, old-to-new replacement mapping, or restoration of removed photos on failure.
- No synchronous image processing, long storage transaction, new image proxy, physical cleanup,
  automatic outbox reconciler, realtime updates, manual reordering, or legacy data import.

## Decisions

### 1. Save the selection now; process only additions afterward

The final selection consists of retained current attachments followed by newly added uploads. Retain
existing `File` identities and variants unchanged. Preserve retained relative persisted order and
append additions in file-selection order; do not regenerate retained files merely because an edit
also adds photos.

```text
Current photos:     A, B, C
Submitted selection: retain A and C; remove B; add D
After Save commits: A, C, [D fallback while processing]
After D is ready:   A, C, D
If D fails:        A, C, [D unavailable fallback]
```

Explicit removals take effect when Save commits, regardless of new-photo readiness. B is not kept
until D finishes, and a failure of D does not restore B. Adding a photo does not imply removing any
existing photo: the retained selection controls removal independently.

Ready retained photos continue to render normally. Missing or failed variants have a per-photo
accessible fallback; a pending new file must not blank the entire gallery. If the selected cover is
new and not ready, cover consumers may show their normal fallback without changing cover identity or
hiding other ready gallery photos. Refresh/retry reads can obtain newly ready URLs; automatic updates
or processing polling are not added.

**Alternative:** privately prepare replacements and publish only when all are ready. Rejected because
the user accepts creation-style asynchronous processing and does not want edit-attempt models.

### 2. Two API operations using shared contracts

Public paths include the existing `/api` prefix:

| Route | Behavior |
| --- | --- |
| `GET /api/memories/:memoryId/edit` | Authorized editable snapshot, persisted photo order, explicit cover, exact timestamp, nullable signed previews; 200 |
| `PATCH /api/memories/:memoryId` | Validate and commit the selected edit; 200 with `{ id, visibility, updatedAt }` after commit |

Use `ApiResponse<T>` and shared contracts from `@leonly/utils/contracts`. Editor responses use
`Cache-Control: no-store`. There are no `/edits` operation resources, 202 preparation responses, or
status/resume/finalization endpoints.

The strict save body contains only `title`, `description`, `location`, `memoryDate`, `timezone`,
`visibility`, `lastKnownUpdatedAt`, `retainedPhotoIds`, ordered `uploadIds`, and nullable `coverFileId`.
It has no edit idempotency key, client-owned storage paths, creator fields, or social fields. Required
empty collections mean retain/add none. Normalize text as creation does and UUIDs consistently. Reject
duplicate or overlapping photo references instead of silently deduplicating them.

Validate title/optional text limits, real dates, IANA timezone, server-derived current date in that
timezone, timestamp precision, at most ten final photos, retained attachment membership, eligible
requester-owned uploads, and cover membership. If photos remain select one final photo as cover;
otherwise cover is null. Upload confirmation establishes object existence and claim eligibility;
binary decoding and actual image-content verification remain asynchronous as in creation.

Derive active-space access from the session and allow either active member to edit. Malformed editor
memory IDs, absent membership, missing/deleted/cross-space/inaccessible memories return generic 404.
Keep existing deletion parameter behavior separate. Unexpected lookup failures remain safe errors.

### 3. Reuse existing upload claims and exclusive attachment

Use `FilesService` issuance, immutable PUT, upload confirmation, and expiring file claims. New files
must be same-space, requester-uploaded, purpose-compatible, unattached eligible roots. Do not require
requester upload ownership for retained photos belonging to the authorized memory: either member can
retain their partner's existing photos.

Creation and editing use the same file-claim/attachment rules and existing exclusive root attachment
constraint. Recheck claim ownership/expiry and unattached state in the save transaction. Concurrent
creation/edit or edit/edit requests cannot consume the same upload. Release owned claims after a
pre-commit failure; never release a worker's newer claim. No durable reservation table is needed
because accepted new uploads become committed attachments immediately.

### 4. One short version-checked save transaction

Confirm uploads outside the transaction. Inside the transaction:

1. Atomically update the available memory with identity, authorized active-space membership, and exact
   `lastKnownUpdatedAt` in the predicate. Require exactly one row and return the persisted advancing
   timestamp. The existing trigger advances it even for rapid or no-op saves.
2. Validate retained membership and new-file claims; clear the old cover before deleting associations.
   Preserve retained associations where possible, handle unique-position collisions, and establish
   contiguous retained-then-new positions and the selected final cover, including remove-all.
3. Detach explicitly removed files and mark their original/derivative families `deleting`. Preserve
   keys, source attribution, and file records. Never rewrite or downgrade retained files.
4. Persist one existing-shape image-processing outbox event per newly attached upload. Metadata-only,
   removal-only, retained-only, and cover-only edits create no image work.

Any failure before commit rolls back metadata, token advancement, associations, cover, retirement,
and events. Storage uploads themselves are not rolled back; unconsumed files remain private and
attributed. Do not hold database locks while calling storage or the queue.

Use the conditional memory update as the lifecycle serialization boundary; do not add a separate
memory lock solely to check staleness. Preserve the existing consistent lock order for membership,
memory lifecycle, and necessary file claims. Zero matched rows require an availability recheck:
deleted/inaccessible returns generic unavailable; accessible stale returns 409 requiring reload.
Placement-first makes the edit stale; deletion-first makes it unavailable. Edit-first does not add
a version precondition to subsequent bodyless deletion.

### 5. Commit success is independent of queue and image success

Publish persisted new-photo events after commit using the existing bounded outbox publisher. Keep the
deployed event shape: attached root `entityId`, parent `memoryId`, `spaceId`, and requested variants.
Do not add edit context, schema versions, recipe versions, or worker memory-edit authority.

The worker authorizes committed attachments for both creation and editing. It reuses verified ready
outputs, existing recipes, leases, retries, and dead-letter evidence. Recheck root eligibility before
publishing metadata; removal/deletion during processing must not revive a `deleting` family. Retain
attribution for writes that finish after eligibility is lost.

After commit, publication or image-processing failure does not undo the edit or turn the save into
a claimed rollback. Preserve outbox failure evidence and the existing publication budget; no automatic
reconciler, explicit edit resume, or unattended completion guarantee is introduced. New photos may
remain unavailable. Retained photos, saved metadata, and explicit removals remain committed.

### 6. Timestamp concurrency replaces durable submission replay

There is no edit request hash, attempt ID, edit idempotency key, or stored historical result. Preserve
creation's existing key/hash contract unchanged. A repeated edit using the old timestamp cannot
commit twice because the first committed write strictly advances the token; a subsequent eligible
request using that token conflicts. This does not promise replay of the original successful response.

On a lost response, timeout, abort, or other uncertain transport outcome, freeze conflicting saves
and offer reload of the current memory. Do not claim failure proves rollback, automatically retry,
silently refresh the timestamp, or infer which request committed from a changed timestamp alone.
Reload reauthorizes and shows current state; the user can then make a new deliberate edit. Local
values/files may be kept until the user chooses reload, but stale content must not overwrite the
reloaded snapshot. No automatic rebase or durable cross-session recovery is added.

For a definite pre-commit validation/authorization/conflict failure use the corresponding safe error;
for a confirmed rollback from a retryable failure preserve inputs/files and offer retry with the
same observed timestamp and already issued upload identities where still eligible. Corrected bytes
require a fresh upload identity. PUT 412 means an immutable object already exists, not proven content
validity. Requests remain single-flight only through upload and the save response, not image processing.

### 7. Preserve shared form, detail actions, and signed-media policy

Keep the editor route, shared controls, localized accessible feedback, and version-scoped drafts.
Cancel before submission changes no memory data and returns to initial-placement detail. Do not
advertise an in-flight request as server-side cancellable.

After a confirmed commit, toast save success and navigate to final-placement detail immediately,
without waiting for new variants. Reset affected list chains to page one and refresh dashboard,
detail, and related reads. Restore Edit only on authorized Timeline/Vault detail alongside migrated
Delete and contextual placement. Summary surfaces have no Edit action.

Editor previews use existing private storage and 300-second signed GET URLs, subject to earlier
credential expiry. Fresh reads never sign detached/deleting or inaccessible files. Earlier URLs can
work until effective expiry; do not promise immediate revocation. Removed, failed, abandoned, and
superseded outputs remain durably attributed for deferred physical cleanup.

## Risks / Trade-offs

- Saved additions may fail or remain pending: show per-photo fallbacks; saving does not certify images.
- A removed photo disappears at commit even if its intended replacement later fails: no delayed swap.
- A selected pending cover can temporarily show a cover fallback while retained gallery photos work.
- Lost responses cannot recover an original operation result: reload before another deliberate save.
- Unpublished events and unused objects can accumulate: preserve evidence without promising cleanup
  or automatic publication recovery. Previously signed removed-photo URLs can outlive removal briefly.

## Migration Plan

1. Keep existing persistence models and creation event contracts; discard the unimplemented attempt/
   reservation schema direction. No new database migration is required by the revised design.
2. Add snapshot/save contracts and API endpoints with atomic timestamp-checked attachment updates;
   verify existing workers process new edit attachments and respect retirement races.
3. Integrate the current-backend shared editor and detail actions, preserving retained photos and
   isolating fallbacks to unavailable variants. Remove only verified edit-only Supabase paths.
4. Update US-007 and API/application documentation; run serial backend and full web gates plus the
   local edit scenarios. Sync/archive deletion before syncing this change when user-directed.
5. Roll back by hiding Edit and stopping new edit requests. Preserve committed changes, attributed
   files, and compatible consumers; do not redirect current-backend editor data to Supabase.
