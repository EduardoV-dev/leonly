# Database Schema Diagram

This directory contains the implemented database schema, its editable DBML source, and its rendered
preview.

| File | Purpose |
| --- | --- |
| `database-schema.dbml` | DBML source for [dbdiagram.io](https://dbdiagram.io). |
| `implementation-plan.md` | Ordered migration and application cutover plan. |
| `leonly-diagram.png` | Rendered diagram exported from dbdiagram.io. |

`supabase/migrations/20260915000000_database_schema.sql` is the runtime source of truth.
`database-schema.dbml` and `leonly-diagram.png` mirror that implemented baseline and must be updated
when its physical schema changes.

Some documented rules are retained as DBML notes because DBML cannot faithfully model partial unique
indexes, check constraints, XOR ownership, or active-state cardinality bounds.
