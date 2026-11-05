# Image processing retries and DLQ

The image queue allows five receives (`maxReceiveCount` in `infra/modules/image-queue/main.tf`). The worker returns per-record failures so successful records in the same batch are acknowledged independently.

## File state after a failure

| Outcome | File behavior |
|---|---|
| Transient storage, database, or ownership error | Keep eligible unfinished variants `pending` or `uploaded`; record a sanitized `lastErrorCode` when bookkeeping is available, then retry after the operation lock is released or expires. |
| Invalid uploaded original | Mark the original failed. The memory remains saved and its photo is unavailable. |
| Permanent variant/content error | Mark only the affected unfinished variant `failed`; ready and deleting files are not downgraded. |
| Fifth unsuccessful receive | Mark the unlocked uploaded original and requested unfinished variants `failed` with `PROCESSING_RETRIES_EXHAUSTED`, then return the record as failed so SQS moves it to the DLQ. |
| Missing, detached, or deleted memory context | Acknowledge as an unavailable no-op without reading storage or creating orphan variants. |

## Triage

1. Find the `image_processing_failed` log by message ID, event ID, or file ID. Logs contain sanitized error codes, not object keys or credentials.
2. Inspect file status, `lastErrorCode`, and operation-lock expiry before redriving a DLQ message.
3. Drain or quarantine legacy asset-shaped messages; the file parser rejects that old contract.

Ready files are never downgraded by retries. This change adds no automatic DLQ reconciler.

## Original replacement

Download and validate the source once, including declared size/MIME, full decoding, and the 40-million-pixel limit. Auto-orient and encode the full-resolution original as WebP quality 90, bounded to the existing 10 MiB generated-output limit. Cover/detail retain quality 85 and their 1024/1600 bounds; generate them from the same source buffer, not from the lossy replacement.

Write the immutable `original.webp` candidate and verify its stored bytes before swapping the original row. The swap and a deleting `upload_source` attribution row commit together. A crash before commit leaves the source authoritative; retry verifies the existing candidate. A crash after commit resumes using the retained source. Original readiness does not wait for every derivative.

Image Lambdas time out after 120 seconds, while per-file processing locks last 300 seconds and storage requests time out after 10 seconds.

## Cleanup deferred

Image processing is the only worker. Automated deletion and its Terraform resources are deferred for a separate, step-by-step implementation. Abandoned uploads, superseded sources, and pre-swap WebP candidates remain stored. Keep `upload_source` attribution for retries and eventual safe removal; a `deleting` row does not currently trigger a cleanup execution.
