# Memory file associations

`memory_files` is the ordered gallery association between a memory and uploaded or ready root files. A file can attach to only one memory, and PostgreSQL enforces that the memory and file share a space.

## Creation transaction

1. Create the memory with `cover_file_id` unset.
2. Attach each presence-confirmed root file in request order using `memory_files(memory_id, file_id, space_id, position)`.
3. Set `cover_file_id` to the selected attached file in the same transaction.
4. Insert one image-generation outbox event for each attached file in that transaction.

Attachments do not consume or change file status. The worker owns uploaded-to-ready validation. The composite cover foreign key references `(memory_id, file_id)` in `memory_files`, so a cover must belong to that memory. A memory without photos keeps a null cover.

## Edit transaction

Edits reuse the same models and one version-checked transaction:

1. Atomically update the available memory (identity, authorized active-space membership, and the
   exact submitted `updated_at` in the predicate) with the normalized metadata and placement. The
   strictly advancing trigger moves the token even for no-op saves; zero matched rows recheck
   availability and return generic unavailable or a stale conflict.
2. Validate retained references against current attachments, clear a removed cover before deleting
   associations, reserve negative temporary positions, and delete unselected associations.
3. Mark removed files and their derivative families `deleting` in the same transaction; keys and
   source attribution are preserved for deferred cleanup and fresh reads stop serving them.
4. Recheck each new upload's ownership, expiry, eligible unattached state, and same-space scope,
   clear its claim, append it after the retained photos, and persist one existing-shape image event
   per new attachment. Metadata-only, retained-only, removal-only, and cover-only edits create no
   image work.

Retained files are never rewritten or reprocessed; their objects and ready variants stay usable
while new attachments process independently. A failing new photo does not restore removed photos
or roll back the committed edit.

## Existing read paths

This change does not migrate memory readers. The current web-app detail, photo, timeline, Vault, and related-memory readers still use the legacy asset schema. Complete their separate reader migration before applying the schema migration that replaces those tables.

## Outbox contract

Persist events in `outbox_events` with `entity_type`, `entity_id`, `event_type`, `payload`, `created_at`, `published_at`, `publish_attempt_count`, and `last_publish_error_code`. Neither the table nor the image transport envelope has a schema-version field. The envelope uses `entityType` and `entityId`; its payload identifies `memoryId`, `spaceId`, and requested `variantNames`. Legacy asset-shaped messages must be drained or quarantined before enabling the new worker.
