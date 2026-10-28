# Memory upload and creation contracts

These contracts define the new creation flow. They do not add endpoints or change existing readers. See `design.md` for transactions, promotion, and worker behavior.

## Existing integration boundaries (task 1.1)

| Boundary | Current implementation | Integration requirement |
|---|---|---|
| Authentication | Global `AuthGuard` in `apps/api/src/auth/auth.guard.ts` obtains the Better Auth user and assigns `request.authUser` | Use the authenticated string user ID; never accept uploader or creator identity from JSON |
| Available membership | `SpacesService.getActiveSpace` filters both membership and space by `deletedAt: null`; existing writes lock space/member rows in transactions | Resolve membership and space server-side and recheck their availability at consumption |
| HTTP transport | `createApiApp` uses `/api`, credentialed CORS, and CSRF protection | Preserve these controls on both new endpoints |
| Responses | Global `ApiResponseInterceptor` and `ApiExceptionFilter` return `{ ok, data, error, message }`; errors have code/message and optional field | Return data from controllers; preserve field errors and sanitized server failures |
| Validation | Global `apiValidationPipe` transforms DTOs without implicit conversion and strips unlisted fields | Explicitly reject storage paths and identity fields instead of relying on silent stripping |
| Database identity | `apps/api/prisma/schema.prisma`: `User.id` is text; `Space.id` and `SpaceMember.id` use `private.uuid_v7()` and PostgreSQL UUID | Add models without replacing users/spaces; reuse existing membership composite unique targets |
| Workspace | `pnpm-workspace.yaml` includes `apps/*` and `packages/*`; API generation outputs to `apps/api/src/generated/prisma` | Keep future worker runtime independent of Nest bootstrap and web server-only modules |
| Deployment | `infra/modules/api/main.tf` deploys an x86_64 container Lambda, 512 MB, 10-second timeout, through HTTP API Gateway | Measure promotion/decoding before retaining these limits; infrastructure sizing belongs to section 7 |
| Local services | `apps/api/docker-compose.yml` runs Floci on port 4566 and PostgreSQL 18 on port 5434 | Floci is running locally; compose does not bootstrap upload buckets or queues |
| Creation client | `use-create-memory-form.ts` prepares multipart details and calls shared `uploadStagedMemoryPhotos`; that helper also serves editing and uploads to Supabase | Replace only creation plumbing in section 8; preserve editing and existing read paths |
| Authenticated API client | `apps/web-app/src/lib/axios/api.ts` uses the API base URL, credentials, and a 5-second timeout | Reuse authenticated transport for issuance/creation; direct PUTs use the signed storage URL |
| Image policy | `constants/create-memory.ts`, `memory-input-validation.ts`, and `create-memory-photo-variants.ts` | Preserve count, byte, extension/type, text/date/cover rules, and the Sharp recipe |

## Upload issuance (task 1.2)

`POST /api/files/uploads`, authenticated JSON:

```json
{
  "purpose": "memory_image",
  "files": [
    { "filename": "photo.jpg", "contentType": "image/jpeg", "byteSize": 123456 }
  ]
}
```

- Accept 1–10 descriptors, JPEG/PNG/WebP, positive integer sizes up to 5,242,880 bytes each, and matching JPG/JPEG/PNG/WebP filename extensions.
- Preserve descriptor order in the response. Persist every upload before returning capabilities.
- Derive category `image`, uploader, active space, staging key, and final key server-side. Reject client-controlled identity/storage fields and unsupported purposes.
- Descriptor checks do not establish actual image validity. Final bytes must later satisfy bounded format detection and decoding with a 40,000,000-pixel limit.

Success: HTTP 201 with the standard envelope; `data` contains:

```json
{
  "uploads": [
    {
      "id": "01900000-0000-7000-8000-000000000001",
      "putUrl": "https://<storage-host>/<signed-staging-object>",
      "requiredHeaders": { "Content-Type": "image/jpeg" },
      "expiresAt": "2026-10-11T00:10:00.000Z",
      "attachmentDeadline": "2026-10-11T01:10:00.000Z"
    }
  ]
}
```

The example timestamps assume issuance at `2026-10-11T00:00:00.000Z`. Required headers are the exact headers the signer requires, not a client-selected policy. No final-key capability or bucket credentials are returned.

| Timing | Approved duration |
|---|---|
| Presigned PUT URL | Exactly 600 seconds from issuance |
| Attachment eligibility | 4,200 seconds from issuance, one hour after the 600-second URL expires |
| Finalization lease | 120 seconds from successful claim |
| Image-processing lease | 300 seconds from successful claim |

Lease tokens fence stale writes and consumption; expiration allows reclaiming, not unconditional updates. Attachment expiration rejects creation without deleting tracked objects. Renewal is forbidden once finalization starts; a renewal endpoint is not part of these contracts.

## Memory creation (task 1.2)

`POST /api/memories`, authenticated JSON:

```json
{
  "title": "A day together",
  "description": null,
  "location": null,
  "memoryDate": "2026-10-10",
  "timezone": "America/Argentina/Buenos_Aires",
  "visibility": "timeline",
  "uploadIds": ["01900000-0000-7000-8000-000000000001"],
  "coverUploadId": "01900000-0000-7000-8000-000000000001",
  "idempotencyKey": "01900000-0000-7000-8000-000000000002"
}
```

- Normalize CRLF/CR to LF and trim text. Title is required and must remain nonempty. Blank description/location normalize to null. Limits: title 120, description 2,000, location 150 characters. Description/location may be omitted.
- Require a real `YYYY-MM-DD` calendar date not later than today in the supplied valid timezone; visibility is `timeline` or `vault`.
- Require an ordered array of 0–10 distinct UUID upload IDs. Zero images require no cover. With images, the optional cover must identify an entry in the array when supplied, preserving existing cover validation. An omitted cover normalizes to null.
- Require a UUID idempotency key. Identity, space, keys, paths, and object metadata are server-controlled.
- Hash normalized details, date/timezone, visibility, ordered IDs, and cover using SHA-256 and fixed property order. Exclude the idempotency key and storage responses. Missing optional text and explicit null have the same canonical representation.

Success: HTTP 201 with standard envelope data `{ "id": "<memory-uuid>", "visibility": "timeline" }`. Matching committed retries return the same data, independently of publication/variant readiness. Changed-input key reuse is HTTP 409. Claim contention is a retryable HTTP 409 with application error code `CREATION_IN_PROGRESS`; unavailable uploads do not expose ownership or object metadata.

## Image event, schema version 1 (task 1.2)

The outbox and SQS use the same stable envelope. The outbox ID is the event ID; replay preserves ID, creation time, and payload.

```json
{
  "id": "01900000-0000-7000-8000-000000000003",
  "aggregateType": "memory_asset",
  "aggregateId": "01900000-0000-7000-8000-000000000001",
  "eventType": "ImageVariantsRequested",
  "schemaVersion": 1,
  "createdAt": "2026-10-11T00:15:00.000Z",
  "payload": {
    "memoryId": "01900000-0000-7000-8000-000000000004",
    "spaceId": "01900000-0000-7000-8000-000000000005",
    "assetId": "01900000-0000-7000-8000-000000000001",
    "originalKey": "memories/01900000-0000-7000-8000-000000000005/01900000-0000-7000-8000-000000000001/original",
    "generationRecipeVersion": 1
  }
}
```

`schemaVersion` describes the event payload; `generationRecipeVersion` describes image processing. Recipe 1 uses auto-orientation, bounded decoding, aspect-preserving resize without enlargement, WebP quality 85, and maximum cover/detail dimensions of 1024/1600. The worker validates supported versions and checks IDs/key against persisted metadata before storage access. Generic aggregate IDs remain text even though this event identifies a UUID asset. Payloads contain no signed URLs or secrets.
