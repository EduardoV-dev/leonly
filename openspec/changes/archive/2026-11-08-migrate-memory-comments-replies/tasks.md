# Tasks

## 1. Data model and migration preparation

- [x] 1.1 Add the Prisma comment model and SQL migration with scoped composite relationships, reply indexes, text constraints, and timestamp fields; verify schema validation and generated client/build succeed.
- [x] 1.2 Legacy comment transfer is not required; no inventory, mapping, or live-data operation is needed (user decision).

## 2. Shared locking contract

- [x] 2.1 Rename `expectedUpdatedAt` to `lastKnownUpdatedAt` in the shared DTO, settings services, API documentation, and all consumers; verify settings endpoint, validation, conflict, and frontend tests.
- [x] 2.2 Verify exact timestamp preservation across settings requests and reject the old or malformed field using focused API and client tests.

## 3. Comment API

- [x] 3.1 Define shared comment, placeholder, reply page, and cursor contracts; verify schemas validate complete timestamp precision and reject malformed cursors.
- [x] 3.2 Implement authorized root/reply cursor reads, scoped anchors, placeholders, counts, and reset handling; test timestamp ties, empty/final pages, stale anchors, cross-space access, and deleted content privacy.
- [x] 3.3 Implement comment/reply creation with validation, parent-depth checks, and root-row synchronization; test unauthorized parents and races with deletion.
- [x] 3.4 Implement author-only edit and soft delete with atomic `lastKnownUpdatedAt` comparison and strictly advancing timestamps; test stale and unauthorized requests, microsecond differences, timestamp collisions, and placeholder behavior.
- [x] 3.5 Expose and document all five comment endpoints with shared envelopes and safe errors; verify focused API and OpenAPI tests.

## 4. Comments interface

- [x] 4.1 Replace legacy comment queries and mutations with current API clients, timestamp locking, pending-submit prevention, and shared contracts; verify composer, edit, deletion, conflict, and retry tests.
- [x] 4.2 Add lazy reply expansion, creation, paging, author actions, count reconciliation, and deleted-root placeholders with localized accessible controls; verify interaction, pagination, error, and keyboard tests.
- [x] 4.3 Mount the migrated comments section on Timeline and Vault detail screens; verify both screens use current API and retain unsupported memory-action boundaries.
- [x] 4.4 Remove superseded legacy comment routes and helpers after checking callers; verify affected tests and build do not depend on them.

## 5. Integration verification

- [x] 5.1 Run backend CI gates sequentially for API, workers, and workspace dependencies, and record any failures. All four gates passed.
- [x] 5.2 Run web-app check, typecheck, test:run, and build; verify the complete cross-app change and record any failures. All four gates passed; one reaction UI test failed once and passed on focused and full-suite reruns.
- [x] 5.3 Legacy comment transfer is not required; import validation and live-data operations are not applicable (user decision).
