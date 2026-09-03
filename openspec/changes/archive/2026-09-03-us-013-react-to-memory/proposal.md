## Why

Members need a lightweight way to acknowledge a shared memory without adding a comment. Reactions must
remain private to the active space, keep each member's choice independent, and show authoritative counts
consistently wherever the memory appears.

## What Changes

- Add one active reaction per active membership and available memory, with the choices `heart`, `laugh`,
  `cry`, and `star`.
- Add an authenticated mutation that adds, changes, or removes the caller's reaction while deriving
  membership, space, and ownership solely from the server.
- Add reaction summaries and an accessible pending, success, and recovery experience to Timeline cards,
  Vault cards, and Timeline and Vault detail views.
- Refresh reaction state from the authoritative source after every local action; realtime partner updates
  remain out of scope.
- Define deterministic same-member concurrency: a client serializes its own requests, and concurrent
  clients reconcile to the persisted last completed mutation through a post-mutation refresh.

## Capabilities

### New Capabilities
- `memory-reactions`: Secure per-member memory reactions, aggregate summaries, mutation semantics, and
  accessible recovery behavior.

### Modified Capabilities
- `memories-timeline`: Populate the Timeline card reaction extension region with current reaction data and
  controls.
- `private-vault`: Populate the Vault card reaction extension region with current reaction data and
  controls.
- `memory-detail`: Populate the Timeline and Vault detail reaction extension region with current reaction
  data and controls.

## Impact

- Affects Supabase schema, RLS/grants, an authorized reaction read/mutation boundary, memory list and detail
  projections, TanStack Query reconciliation, shared reaction UI, localized feedback, and focused tests.
- Reuses existing active-space authorization, available-memory lookups, card and detail extension regions,
  and memory query invalidation. No external dependency or public API is introduced.
