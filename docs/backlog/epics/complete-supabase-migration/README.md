# Complete the Supabase Migration

Restore the remaining memory lifecycle operations on the current NestJS, Prisma, and private object
storage stack, then retire the Supabase paths. Priority: MVP migration completion.

## Items

- [US-008: move and restore memories](us-008-move-memory-to-vault.md)
- [US-014: soft-delete memories](us-014-delete-memory.md)
- [US-007: edit memories and photos](us-007-edit-memory.md)
- [Implement current-storage cleanup](implement-file-cleanup.md)
- [Recover unpublished image events](recover-unpublished-image-events.md)
- [Retire Supabase](retire-supabase.md)

Placement, deletion, and editing must use a compatible memory-version and locking contract. Resolve
the signed-media revocation decision before shipping deletion. Storage cleanup and event recovery are
independent operational work; retirement depends on migrating or explicitly retiring every live
Supabase consumer. Legacy-data import is a separate decision, not an implicit requirement here.

Background: [detail migration design](../../../../openspec/changes/archive/2026-11-06-migrate-memory-detail-reads-to-nestjs/design.md),
[file infrastructure](../../../../infra/README.md), and [API operations](../../../../apps/api/README.md).
