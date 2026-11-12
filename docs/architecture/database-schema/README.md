# Database Schema Diagram

This directory documents the stateless memory-upload schema baseline, its editable DBML source,
and its rendered preview.

| File | Purpose |
| --- | --- |
| `database-schema.dbml` | DBML source for [dbdiagram.io](https://dbdiagram.io). |
| `implementation-plan.md` | Implemented baseline contracts. |
| `leonly-diagram.png` | Rendered diagram exported from dbdiagram.io. |

The current database source of truth is `packages/database/prisma/schema.prisma` with its migration
history under `packages/database/prisma/migrations/`. The DBML and rendered diagram mirror the
Supabase-era memory-upload baseline and remain as a historical design record; they do not include the
current Better Auth, file, or outbox models and must not be treated as the current schema. Update them
together only when documenting a new full-schema baseline.

Some documented rules are retained as DBML notes because DBML cannot faithfully model partial unique
indexes, check constraints, XOR ownership, or active-state cardinality bounds.

Memory create/edit grants are short-lived server-signed capabilities. They authorize temporary
original uploads, while finalized `memory_assets` and `memory_asset_objects` reference permanent
memory paths only. `resource_cleanup` is the generic deletion outbox: a daily service-role cron
queues expired temporary originals before processing leased cleanup work. This cleanup design was
retired with Supabase; current-storage cleanup remains deferred backlog work.
