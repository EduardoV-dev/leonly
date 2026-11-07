# Tasks

## 1. Persistence and shared contracts

- [x] 1.1 Add the reaction enum and `MemoryReaction` model with UUID v7 IDs, `reactedByMemberId` mapped to `reacted_by_member_id`, timestamps, same-space composite foreign keys, cascades, uniqueness, and the memory index; verify the forward migration expresses each constraint without importing or deleting legacy data.
- [x] 1.2 Generate the shared Prisma client with `pnpm --filter @leonly/database prisma:generate` and verify the database package typecheck passes; keep generation sequential with other backend preparation and add no database test suite.
- [x] 1.3 Export shared reaction types/constants and add required `reaction` to `MemoryDetail`; update affected fixtures and consumers so shared-package and application typechecks pass without duplicate reaction contracts or changes to list/related-card shapes.

## 2. Reaction API and transaction behavior

- [x] 2.1 Add an API-owned reaction service that authorizes current membership, memory, and space and derives complete summaries from active reacting memberships; verify focused service tests cover empty data, all types, current selection, sorted current names, duplicate display names, inactive members, and unexpected lookup failures.
- [x] 2.2 Implement transactional add/replace/remove semantics with a memory-row lock before reading the current reaction and in-transaction authorization checks; verify API-owned tests cover each transition, partner isolation, first-reaction overlap, ordering through the transaction boundary, and rollback on failure without claiming that mocks prove PostgreSQL scheduling.
- [x] 2.3 Add and register authenticated GET/POST reaction routes with validated DTOs, HTTP 200 success, shared envelopes, and `Cache-Control: no-store`; verify application HTTP tests cover supported bodies, malformed JSON, missing/invalid types, forbidden extra fields, 401, generic 404 including malformed UUIDs, cross-space access, deleted resources, and safe server failures.
- [x] 2.4 Add OpenAPI schemas/examples and error documentation for both reaction operations; verify API documentation tests or generated-schema assertions match the routes, body, nullable selection, summary maps, status codes, and response envelopes.

## 3. Detail response integration

- [x] 3.1 Populate `reaction` through the shared summary service in both visibility-specific detail responses; verify detail service and HTTP tests cover initial summaries, zero counts, authorization, unavailable memories, and safe failure instead of fabricated empty data when summary lookup fails.
- [x] 3.2 Update detail OpenAPI schemas, examples, and affected fixtures; verify documentation assertions include the required reaction field while list and related-memory summaries continue omitting social data.

## 4. Frontend migration and legacy cleanup

- [x] 4.1 Replace the reaction mutation's legacy fetch with the existing credentialed Axios client and add summary reads using shared `ApiResponse` types; verify focused client/hook tests cover request paths, body, envelopes, 401/404 handling, and safe network/server failures with automatic POST retries disabled.
- [x] 4.2 Seed authoritative reaction state from detail, confirm successful mutations from the response, and refetch summaries after settlement; verify tests cover no duplicate initial GET, updated detail props, optimistic rollback, later authoritative data, failed refreshes, and a lost POST response followed by GET rather than a repeated toggle.
- [x] 4.3 Mount the existing reaction control in Timeline and Vault detail reaction slots; verify page/component tests show initial counts, current selection, member names, add/change/remove behavior, and unchanged memory visibility while edit/delete/move/restore/comment controls stay absent.
- [x] 4.4 Preserve keyboard interaction, semantic selection/count feedback, visible focus, disabled pending choices, accessible success/failure messages, and unavailable-memory recovery; verify focused Testing Library tests and inspect both detail screens in the browser when a runnable environment is available, recording any browser verification gap.
- [x] 4.5 Trace and retire the legacy Next.js reaction route, Supabase RPC service, reaction-only validation/types, and obsolete tests; update retained callers or remove only unused helpers, then verify reference searches and affected tests show no current reaction path to Supabase and no broken legacy editor/comment callers. Preserve historical SQL migrations.

## 5. Integration gates and handoff

- [x] 5.1 Run `pnpm --filter 'api...' --filter 'workers...' check`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build`; verify all gates pass sequentially against the completed changes.
- [x] 5.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; verify all four gates pass against the completed frontend integration.
- [x] 5.3 Run `openspec validate migrate-memory-reactions-to-nestjs --strict` and document the verified behavior, any browser/live-database concurrency gaps, and schema/API/frontend release order; verify no live migration or deployment was performed as part of implementation checks.

## Workflow follow-up

- At release, apply the additive database migration, deploy the API, then deploy the frontend. No Supabase backfill is required.
- If rolling back, revert the frontend before the API and retain the new table and collected reactions.
- Archive this change after implementation and required verification are complete.
- Browser verification gap: no authenticated running application was available to inspect either detail screen; focused Testing Library checks cover interaction.
- Live PostgreSQL lock scheduling and rollback were not exercised; transaction tests use mocked boundaries. No migration or deployment was performed.
