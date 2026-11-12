# US-007: Edit Memory

**Remaining work:** None in the editor itself. The editor now reads and saves through the current
backend (`GET /api/memories/:memoryId/edit` and `PATCH /api/memories/:memoryId`): it reuses
creation's upload issuance, immutable PUT, exclusive attachment claims, version-checked commit, and
asynchronous image processing. Save success means commit, not image readiness; retained photos
keep their objects and ready variants, removed photos disappear at commit, and new photos process
independently with per-photo fallbacks. There is no edit-attempt model, historical result replay,
or automatic recovery: after a lost or uncertain response the editor offers a current-state reload
before another deliberate save. Legacy Supabase edit routes, upload grants, and preview readers
were removed with the migration. The [editing specification](../../../../openspec/specs/memory-editing/spec.md)
is authoritative where this historical story differs, including the ten-photo limit and concurrency rules.

**Priority:** Must


**Depends on:** US-004, US-005, US-006

## User Story

As an active member, I want to edit a memory in our active space so I can correct or improve its details after creation.

## Intended Outcome

Either active member can open an active memory in the active space, review its current values, and update its title, description, date, location, photos, cover, or timeline/shared Private Vault placement. A successful edit is reflected in every affected view without changing the memory's creator, comments, or reactions.

## Scope

- Prefilled edit fields for all create-memory inputs and current placement.
- Add, retain, remove, or replace photos within the create-memory limits, including removal of every photo.
- Select any retained or replacement photo as cover.
- Save, cancel, validation, pending, success, and recoverable failure behavior.

## Business Rules

- Editing uses the same trimmed text, browser-local date, timezone, file count, file size, and verified-content rules as creation.
- Missing, inactive, soft-deleted, and inaccessible memories cannot be read or edited and produce the same generic not-found outcome.
- Cancelling makes no change to the memory or its photos.
- Moving a visible memory to the shared Private Vault removes it from the timeline. Moving a hidden memory to the timeline restores it at the position determined by its memory date.
- At most ten retained and replacement photos may remain after the edit.
- If photos remain, the cover must reference one of them. If no photos remain, the memory has no cover and affected views use their fallback.
- An edit succeeds as one observable change. If a new upload or persistence step fails, existing memory data and existing photo access remain unchanged, and newly uploaded objects are removed.
- Removed photos become inaccessible only after the edit succeeds. Photos, comments, reactions, creator, and untouched metadata otherwise remain unchanged.
- While save is pending, repeated activation does not start another edit request.

## Acceptance Criteria

- Either active member sees current values prefilled and can save valid changes to an active memory in the active space.
- Valid changes appear consistently in timeline, shared Private Vault, detail, and dashboard views after refresh.
- Invalid fields, files, timezones, and future dates are rejected without changing the memory.
- A member can add, retain, replace, or remove photos, including removing all photos, without leaving an invalid cover.
- Placement changes move the memory between the timeline and shared Private Vault without changing related data.
- Cancelling leaves all data unchanged, and repeated activation while pending produces at most one successful edit.
- Failed uploads or persistence leave the prior memory and photo set intact, clean up new objects, and present a retryable error.
- Missing, inactive, soft-deleted, and inaccessible memories produce the same generic not-found outcome.

## Migration Acceptance

- Use the current authenticated user, active-space authorization, and Prisma memory/file models.
- Preserve version checks, idempotent retries, atomic observable edits, and safe failure cleanup.
- Restore the edit action for migrated detail pages and use current storage for retained and new photos.
- Cover cross-space denial, stale writes, retry, photo validation, and failed partial uploads.

## Verification Notes

- Verify prefilled values, shared-member editing, all reused validation, cancel, and affected-view refresh.
- Verify photo add, retain, replace, remove-all, cover validity, failed-upload cleanup, and failed-persistence rollback.
- Verify timeline/shared Private Vault transitions and preservation of creator, comments, reactions, and untouched metadata.
- Verify pending duplicate activation, version conflicts, and generic not-found behavior.
