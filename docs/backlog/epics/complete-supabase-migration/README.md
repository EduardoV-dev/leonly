# Complete the Supabase Migration

Restore the remaining memory lifecycle operations on the current NestJS, Prisma, and private object
storage stack, then retire the Supabase paths. Priority: MVP migration completion.

## Items

- [US-008: move and restore memories](us-008-move-memory-to-vault.md)
- [US-014: soft-delete memories](us-014-delete-memory.md)
- [US-007: edit memories and photos](us-007-edit-memory.md)
- [Implement current-storage cleanup](implement-file-cleanup.md)
- [Recover unpublished image events](recover-unpublished-image-events.md)
- [Retire Supabase](retire-supabase.md) — runbook: [retire-supabase-runbook.md](retire-supabase-runbook.md)

Placement, deletion, and editing must use a compatible memory-version and locking contract. Resolve
the signed-media revocation decision before shipping deletion. Storage cleanup and event recovery are
independent operational work. Supabase retirement is in progress: the legacy frontend routes, helpers,
clients, dependencies, and tracked Supabase setup are being removed, and hosted shutdown is a separate
operator action after deployment verification. Legacy-data import is not required; the owner confirmed
nothing needs preservation.

Background: [detail migration design](../../../../openspec/changes/archive/2026-11-06-migrate-memory-detail-reads-to-nestjs/design.md),
[file infrastructure](../../../../infra/README.md), and [API operations](../../../../apps/api/README.md).
