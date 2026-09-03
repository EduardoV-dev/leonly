## Why

Comments are currently immutable after submission. An author needs to correct or clarify their own text
without losing ownership, while shared editing must never silently overwrite a partner's newer change.

## What Changes

- Add an author-only comment edit action on Timeline and Private Vault memory details.
- Add versioned conditional updates that reject stale saves and preserve the author's local draft for
  reconciliation.
- Extend comment reads and mutation responses with server-owned update metadata.
- Add accessible edit, save, cancel, validation, pending, conflict, success, and retry states.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `memory-comments`: Allow comment authors to edit active accessible comments with optimistic concurrency.

## Impact

- Database migration for comment update metadata and an authorized update RPC.
- Comment server types, route handlers, query reconciliation, localized UI, and component styles.
- Focused migration, route, hook, and interface tests for authorization, validation, conflicts, and recovery.
