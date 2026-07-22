# US-005: Edit Memory

**Priority:** Must


**Depends on:** US-004, US-025

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
- At most five retained and replacement photos may remain after the edit.
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

## Decision Required

- Define conflict behavior when both active members edit the same memory or when an edit overlaps a delete, move, or restore.
- Define the destination after save or cancel when editing began from timeline, shared Private Vault, or detail.
- Define whether photo reordering is supported and, if so, how retained and replacement photos are ordered.

## Verification Notes

- Verify prefilled values, shared-member editing, all reused validation, cancel, and affected-view refresh.
- Verify photo add, retain, replace, remove-all, cover validity, failed-upload cleanup, and failed-persistence rollback.
- Verify timeline/shared Private Vault transitions and preservation of creator, comments, reactions, and untouched metadata.
- Verify pending duplicate activation, decided conflict behavior, and generic not-found behavior.
