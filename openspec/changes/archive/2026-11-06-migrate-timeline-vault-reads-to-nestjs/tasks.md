# Tasks

## 1. Shared contracts and pagination foundation

- [x] 1.1 Add shared memory summary/page types through `@leonly/utils/contracts`, reusing `ApiResponse`; verify API and browser consumers can import the same contract and that social fields are absent.
- [x] 1.2 Implement schema-aware cursor encode/decode utilities with a strict memory cursor schema, a 2,048-character input bound, and separate client/internal failure attribution; verify focused tests for round trips, invalid encoding/JSON/fields/version, extra fields, sort, and microsecond preservation.
- [x] 1.3 Add an additive partial feed-index migration for `(space_id, visibility, memory_date, created_at, id) WHERE deleted_at IS NULL`; verify migration/schema tooling accepts the migration without changing timestamp precision or existing data, and record any unavailable database execution evidence.

## 2. Authorized Timeline and Vault endpoints

- [x] 2.1 Add validated list query DTOs and thin GET methods to the existing Memories module; verify API-owned HTTP tests cover allowed parameters, Timeline limits 1–20, fixed Vault size, default/newest/oldest sort, unsupported parameters, and HTTP 400 validation envelopes.
- [x] 2.2 Implement the shared read service using Better Auth identity and current active-space membership constraints; verify API tests deny missing sessions, absent/deleted memberships, deleted spaces, cross-space records, wrong visibility, and deleted memories without invoking Supabase.
- [x] 2.3 Implement parameterized precision-safe page and anchor reads, tuple comparisons, lookahead, stale/sort reset behavior, and batched ready-cover metadata; verify API-owned tests cover timestamp ties and microseconds, both directions, empty/final/full pages, a smaller recent limit, stale/cross-list anchors, and `cursorReset` without database test suites.
- [x] 2.4 Return the shared page contract through the existing response interceptor and preserve generic unexpected-failure envelopes; verify HTTP tests assert exact item fields, nullable fields, no social enrichment, no double wrapping, and safe 500 responses without adding cache-policy changes.
- [x] 2.5 Document the two GET routes, query DTOs, page/item contract, cursor-reset rules, and error statuses in OpenAPI; verify generated prefixed paths and schemas against the HTTP contract tests.

## 3. Signed new-backend list covers

- [x] 3.1 Add GET URL signing to the existing configured storage integration using the installed SDK; verify focused tests assert object-specific GET signing for 300 seconds without public bucket access or reusable credential exposure.
- [x] 3.2 Sign authorized ready-cover variants through `MemoryFile`/`File` in Timeline/Vault responses; verify API tests cover ready signed URLs, null pending/failed/absent covers, cross-space exclusion, safe signing failures, newly issued expiry on later backend reads, and rejection of new list requests after access revocation.
- [x] 3.3 Render list covers directly from signed storage URLs and remove list dependencies on the legacy image route; verify Timeline/Vault/recent-memory tests make no application image requests and add no NestJS image endpoint, Next.js image proxy, expiry timer, image-error refetch, or React Query policy changes.
- [x] 3.4 Document nullable five-minute signed URLs, earlier credential expiry, and bearer-URL revocation limits in OpenAPI; verify the reference advertises only the list operations and no replacement cover-bytes endpoint.

## 4. Frontend cutover and legacy list cleanup

- [x] 4.1 Add typed feature API calls through the existing credentialed Axios client and migrate both list hooks/page consumers to the shared contract; verify component/hook tests cover infinite loading, newest/oldest changes, cursor resets, empty states, and initial/load-more retries.
- [x] 4.2 Remove comment counts and reaction controls from migrated list card composition without weakening legacy detail types or interactions; verify Timeline/Vault tests assert no social metadata, placeholder zeros, or social network requests and run affected detail tests when shared files change.
- [x] 4.3 Preserve the dashboard recent variant's four-item newest-first request and ready-cover/fallback rendering; verify dashboard/recent-list tests exclude Vault, deleted, cross-space, and legacy records and handle failed requests without fabricated content.
- [x] 4.4 Remove obsolete Next.js Timeline/Vault list routes, Supabase list readers, list-only cursor exports, and superseded tests after migrating all callers; preserve the legacy photo route and helpers/tests used by detail, edit-preview, and related-memory consumers. Verify references resolve, typechecking passes, and migrated lists use no Supabase auth, storage, RPCs, or legacy image endpoint.
- [x] 4.5 Retain existing UUID detail links and document their separate legacy-backend compatibility limitation; verify links preserve their Timeline/Vault destinations without implementing detail reads or claiming new-backend detail success.

## 5. Cross-application verification and handoff

- [x] 5.1 Run backend gates sequentially: `pnpm --filter 'api...' --filter 'workers...' check`, `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`, `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run`, and `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build`; record results and blockers.
- [x] 5.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; verify the final integrated frontend state and record results and blockers.
- [x] 5.3 Exercise the available local integration from NestJS-created memories and worker-generated variants through Timeline, Vault, recent memories, direct signed covers, the five-minute signing configuration, and list access denial after membership revocation; verify legacy detail/edit/related-memory images keep their existing route. Document actual evidence, unavailable services, accepted URL-expiry/cache limitations, backend-first deployment order, rollback limits, and the out-of-scope detail-page gap.
- [x] 5.4 Run `openspec validate migrate-timeline-vault-reads-to-nestjs --strict` and reconcile completed task checkboxes with verified implementation evidence before handoff.

## Workflow follow-up

- Migrate new-backend memory-detail reads and other legacy memory interactions in separate changes.
- Remove the legacy image endpoint only when its detail, edit-preview, and related-memory callers have migrated; do not port it to NestJS.
- Revisit signed-URL cache expiry and renewal only if they become a demonstrated problem; no recovery mechanism is included here.
- Archive this change only after implementation and the project's requested review workflow are complete.

## Verification evidence

- Backend check passed in the working tree. Backend typecheck, test:run, and build passed sequentially
  in an isolated copy with the current changes. API: 312 tests passed; workers: 37 tests passed.
- Web check, typecheck, test:run, and build passed in the isolated copy; 569 tests passed. The first
  isolated build failed because Turbopack rejected external dependency symlinks; copying dependencies
  into the isolated copy resolved that environment issue.
- Prisma schema validation passed. All five migrations, including the additive feed index, applied
  successfully to a disposable PostgreSQL 18 container; no existing database was modified.
- Disposable PostgreSQL 18 and in-memory S3-compatible storage smoke: NestJS creation produced 25
  Timeline memories, a Vault memory, another-space memory, and a deleted memory. Both pagination
  directions, microsecond ordering, four-item limit, filtering, stale/cross-list anchor resets, and
  denial after membership or space deletion passed. The image worker generated cover/detail variants;
  a subsequent list returned a direct signed GET with `X-Amz-Expires=300`, and the cover download
  returned HTTP 200. The issued URL also remained usable after membership revocation in the emulator.
- HTTP contract and frontend tests used mocked boundaries; an authenticated browser session was not
  available for a live browser smoke. The legacy photo route and detail/edit/related-memory suites
  passed in the web test run. Expired cached URLs are not renewed automatically; a signed URL may
  remain usable until effective expiry after revocation, or expire earlier with signing credentials.
- Deploy the database index and backend before the frontend. Rollback may require reverting both
  deployments; the old frontend reads only legacy data, and new-backend detail pages remain a separate
  migration. The additive index may remain on rollback.
