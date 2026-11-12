# 02. Implement Current-Storage Cleanup

**Release:** MVP. **Prerequisites:** current file/upload and worker contracts; agree retention before
deleting any object. Independent of image-event recovery.

## Work to do

1. Define which abandoned uploads, detached files, and `deleting` file families are eligible, with
   retention windows that protect retained and in-use data.
2. Implement scheduled cleanup with safe claiming, rechecks, retries, and visible failures.
3. Test race and failure cases, then verify the deployed schedule and real storage integration.

## Outcome

Abandoned uploads and superseded, unreferenced objects in current private storage are cleaned up
without deleting retained or in-use files. There is no current-storage cleanup schedule to rely on;
retiring the legacy Supabase job does not provide one.

## Acceptance criteria

- Define eligible objects, retention windows, scheduling, retry, and operational visibility.
- Recheck attachment, active processing, and concurrent claims before deleting; make retries safe.
- Cover failed deletion, retries, active files, and concurrent processing with focused tests.
- Verify the deployed schedule and storage integration before retiring legacy cleanup.

References: [infrastructure deferral](../../../../infra/README.md) and
[file upload lifecycle](../../../../openspec/specs/file-upload-lifecycle/spec.md).
