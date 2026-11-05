# File upload lifecycle

`POST /api/files/uploads` creates a private root file record and returns a signed `PUT` capability for its immutable object key in the application's configured storage bucket. File rows do not store a bucket; every storage operation uses `STORAGE_BUCKET`.

## Upload contract

- The response contains `id`, `putUrl`, `requiredHeaders`, and `expiresAt`.
- Send both required headers, including `If-None-Match: *`, so a retry cannot replace an existing object.
- `expiresAt` is the file's creation instant plus the existing 600-second upload policy. The row and signature use the same server-owned instant; the expiry is not persisted.
- URL expiry limits the upload capability only. It is not an attachment deadline, and the API does not return a separate attachment-expiry field.
- The upload remains a signed `PUT`; there is no separate completion endpoint.

## Verification states

| State | Meaning |
|---|---|
| `pending` | The backend has not confirmed the original object. |
| `uploaded` | The API confirmed object presence with HEAD. No content validation has run; a memory may attach the file. |
| `ready` | The worker validated the image and verified its quality-90 WebP replacement. |
| `failed` | Content is invalid or a permanent verification failure occurred. A corrected image needs a new file ID. |
| `deleting` | Durable removal intent; the file cannot be used. Cleanup execution is deferred. |

Verification and generation use expiring operation locks independent of file status. A transient storage or database error keeps a recoverable status and records a diagnostic code; presence alone never makes a file ready.

`FilesService.confirmUploaded` is a reusable, purpose-scoped presence operation. It does not download bytes or enforce image rules. Memory creation commits uploaded attachments and processing events without waiting for decoding. Image validation belongs to the worker; invalid files become failed without removing the committed memory.

The worker writes `original.webp`, verifies it, and atomically swaps the original file row's key, MIME type, size, and ready status. The file ID and memory associations do not change. A deleting `upload_source` derivative retains the superseded key for processing retries and future cleanup. Automated cleanup is deferred, so abandoned uploads and superseded sources remain stored. Unvalidated sources are never served.

The API and workers use the Prisma-generated `FileStatus` and `FilePurpose` constant maps from `@leonly/database/client` for persisted values and upload-purpose validation.
