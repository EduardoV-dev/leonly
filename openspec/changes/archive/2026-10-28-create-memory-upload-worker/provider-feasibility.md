# Immutable promotion verification

Task 1.3 is closed for the locally verified scope by the user-approved 2026-10-28 archive reconciliation. Live R2 verification remains a pre-deployment follow-up, not a verified result. The user requires the same promotion code on R2 and Floci.

## Local Floci results

Tested the running `api-floci-1` container (`floci/floci:latest`) at `http://localhost:4566` on 2026-10-11. An isolated bucket, `leonly-copy-probe-20261011-002510`, retains the probe objects; no existing bucket was changed or deleted. Requests used Floci's local unauthenticated S3 endpoint, not production signing.

| Probe | Observed result |
|---|---|
| Write staging bytes `first-original`; copy to absent final with `cf-copy-destination-if-none-match: *` | HTTP 200; copied first bytes |
| Replace staging with `replacement-original`; repeat destination-conditional copy | HTTP 200; final became `replacement-original` |
| PUT `must-not-overwrite` to existing final with `If-None-Match: *` | HTTP 412 `PreconditionFailed`; final retained `replacement-original` |

The running Floci does not enforce the R2 destination-copy extension. Using that header on Floci would violate immutable originals. A HEAD check followed by unconditional copy is prohibited.

Use bounded GET of staging followed by destination PUT with `If-None-Match: *`, then validation of final bytes, on both providers. This retains staging/final separation but transfers bytes through the API instead of using provider-side copying. There are no provider-specific promotion branches.

Eight simultaneous conditional PUTs to the initially absent `final-race` key returned exactly one HTTP 200 and seven HTTP 412 responses. GET returned the successful writer's bytes (`race-original-3`). This verifies the running Floci's concurrent destination-create-only primitive; full application promotion/reuse and live R2 behavior remain unverified.

## Application storage and finalization probe (sections 3 and 4)

On 2026-10-11, `node /tmp/opencode/leonly-memory-provider-probe.cjs` exercised the built `ObjectStorage` and `UploadFinalizationService` against the same running Floci at `http://localhost:4566`. It created only the isolated bucket `leonly-memory-probe-1791681994493`, using Floci test credentials. Objects remain stored; no existing bucket was changed and no deletion was performed.

| Application path | Result |
|---|---|
| Sign staging PUT with `Content-Type: image/png` and `X-Amz-Expires=600`, then upload via the returned URL | HTTP 200 |
| Claim upload, bounded staging GET, conditional final PUT, final GET and pixel decode | Verified PNG MIME/byte size; finalized bytes equal original |
| Replace staging through the still-valid URL, release/reclaim and finalize again | Accepted final original unchanged; destination reused |
| Eight concurrent `ObjectStorage.putObjectIfAbsent` calls to a new destination | One `created`, seven `exists`; GET equals the winner's bytes |

This probe uses controlled upload persistence, not an application-database transaction. The API behavioral suite exercises transaction rollback, consumption, and idempotency with controlled dependencies. Browser CORS and live R2 remain unverified. The probe source is temporary; the permanent regression checks live beside their owners in `apps/api/src/modules/files` and `apps/api/src/modules/memories`.

## R2 evidence and outstanding checks

[Cloudflare's S3 extensions documentation](https://developers.cloudflare.com/r2/api/s3/extensions/) describes `cf-copy-destination-if-none-match`, HTTP 412 on a failed condition, and checking destination conditions when committing bucket state. The destination extension is documented as beta. Source conditions and destination conditions are checked at different times; source `CopySourceIfNoneMatch` is not destination-create-only protection.

[Cloudflare's S3 compatibility documentation](https://developers.cloudflare.com/r2/api/s3/api/) also lists `If-None-Match` support for PutObject, permitting the common promotion primitive. R2 may return rate-limit failures for concurrent writes to the same key; these must not trigger unconditional writes.

Documentation was retrieved through Context7 on 2026-10-11. Live R2 sequential/concurrent conditional PUT and reuse checks have not run. Documentation support alone is not a verified provider result. No production credentials, bucket, or endpoint were selected.

## Floci infrastructure and local queue runner (section 7.3)

On 2026-10-11, started the existing Floci service through the API Docker Compose
configuration. An isolated Terraform probe under
`/tmp/opencode/leonly-floci-infra-probe` applied six additive resources to Floci:
S3 bucket, public-access block, PUT-only CORS, image queue, DLQ, and the DLQ
redrive allowance. It used the repository's `infra/modules/image-queue` with
AWS provider 6.66.0. The bucket and queue names are
`leonly-infra-probe-20261011-234000`; these are probe fixtures, not selected
application environment names. No existing infrastructure was altered or
destroyed. Probe resources and its failed message remain retained.

`node /tmp/opencode/leonly-local-worker-probe.cjs` exercised the built
`runLocalImageBatch` against that live SQS queue. It verified retained queue
attributes (visibility 720, receive limit 5, SSE configuration requested), a
valid event for a controlled unavailable asset acknowledged through the same
production processor, and malformed JSON diagnosed as `INVALID_JSON` without
acknowledgment. Floci reported one message still in flight after failure.

An HTTP OPTIONS request for upload from `http://localhost:3000` returned 200
with that allowed origin and PUT method. This is HTTP preflight evidence, not
a completed browser upload or production provider security verification.
The processor probe used a controlled missing-asset database boundary: it did
not query application PostgreSQL or verify the full creation-to-variants flow.
Permanent worker tests cover actual variant completion and acknowledgment-loss
redelivery with controlled external dependencies. Local Lambda emulation was
not used; the separately runnable processor is the supported local path.
