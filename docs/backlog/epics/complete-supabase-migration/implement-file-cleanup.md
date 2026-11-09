# Implement Current-Storage Cleanup

**Priority:** MVP operational completion. **Dependencies:** current file/upload and worker contracts;
coordinate with memory editing and the agreed retention policy.

## Outcome

Abandoned uploads and superseded, unreferenced objects in current private storage are cleaned up
without deleting retained or in-use files. The existing Supabase cleanup only handles legacy objects.

## Acceptance criteria

- Define eligible objects, retention windows, scheduling, retry, and operational visibility.
- Recheck attachment, active processing, and concurrent claims before deleting; make retries safe.
- Cover failed deletion, retries, active files, and concurrent processing with focused tests.
- Verify the deployed schedule and storage integration before retiring legacy cleanup.

References: [infrastructure deferral](../../../../infra/README.md) and
[file upload lifecycle](../../../../openspec/specs/file-upload-lifecycle/spec.md).
