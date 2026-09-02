## Why

Memories can already be created, viewed, edited, and browsed in the shared Private Vault, but members
cannot deliberately change a memory's placement without entering the full editor. A direct, safe
placement action completes the shared Vault workflow while preserving every memory and its related data.

## What Changes

- Add a direct, idempotent action to move an active Timeline memory to the shared Private Vault.
- Add the inverse action to restore an active Vault memory to the Timeline.
- Show exactly one contextual placement button on each authorized memory detail page: "Move to Private
  Vault" for Timeline memories or "Move to Timeline" for Vault memories.
- Disable repeated activation while a placement request is pending; show recoverable failures without
  changing placement.
- Invalidate affected Timeline and Vault data after success, announce success, and navigate to the
  matching destination detail route.

## Capabilities

### New Capabilities
- `memory-placement`: Move an active memory between the Timeline and shared Private Vault while
  preserving its content and authorized detail access.

### Modified Capabilities

None.

## Impact

- Memory detail action regions and localized copy.
- A new authorized memory-placement API and server workflow, including a Supabase migration for atomic
  placement updates.
- Timeline and Vault query-cache invalidation, destination-detail navigation, and focused server, API,
  component, and route tests.
