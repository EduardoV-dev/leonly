## 1. Secure Reaction Persistence

- [x] 1.1 Add a Supabase migration for private memory reactions with supported-type validation, one-row-per-membership-and-memory uniqueness, RLS, restricted grants, and an atomic security-definer toggle RPC.
- [x] 1.2 Add migration tests for uniqueness, add/change/remove semantics, current aggregate counts, active membership, available-memory checks, cross-space isolation, forged owner/space data, and concurrent member reactions.
- [x] 1.3 Add server-side reaction input validation, typed read/mutation models, and authorized summary resolution for available Timeline and Vault memories.
- [x] 1.4 Add a strict memory reaction API route that accepts only the memory identifier and supported reaction type, maps unavailable targets to the generic not-found outcome, and logs unexpected failures without leaking target state.
- [x] 1.5 Add server and route tests for valid mutations, unsupported types, unauthenticated/inactive members, malformed/deleted/inaccessible memories, altered payloads, generic failures, and same-member overlapping request reconciliation.

## 2. Memory Projection Integration

- [x] 2.1 Extend Timeline, Vault, and detail read models with the caller's confirmed reaction and fixed authoritative counts without weakening existing signed-media or visibility behavior.
- [x] 2.2 Update Timeline, Vault, and detail query/server tests to assert authorized reaction projections, zero counts, and absence of reaction data on unavailable reads.
- [x] 2.3 Add reaction query keys and a client mutation/query hook that serializes one rendered control's pending action, classifies unavailable versus recoverable errors, and invalidates/refetches affected memory projections after settlement.
- [x] 2.4 Add hook tests for add/change/remove results, pending suppression, success reconciliation, failure rollback and refetch, unavailable handling, and two-client completion-order convergence.

## 3. Accessible Shared Reaction Controls

- [x] 3.1 Add feature-owned reaction types, constants, translations, and one shared keyboard-operable reaction control with named choices, selected state, visible counts, pending disablement, and polite async feedback.
- [x] 3.2 Integrate the control into Timeline and Vault card extension regions outside their detail links, preserving card layout and independent interaction.
- [x] 3.3 Integrate the control into the Timeline and Vault detail reaction slot, routing generic unavailable outcomes through the existing not-found boundary.
- [x] 3.4 Add responsive styling that follows the existing Leonly card/detail visual system, preserves focus visibility, communicates state without color alone, and works at mobile, 640 px, 768 px, and 1024 px widths.
- [x] 3.5 Add component tests for card and detail summaries, keyboard operation, accessible names and selected states, pending controls, success announcements, failure rollback/refetch/retry, and partner reaction independence.

## 4. Verification

- [x] 4.1 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, and targeted reaction tests while implementing.
- [x] 4.2 Run `pnpm --filter web-app test:run` and `pnpm --filter web-app build` before handoff.
