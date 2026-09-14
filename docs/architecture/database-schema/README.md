# Database Schema Diagram

This directory contains the accepted database-schema design, its editable DBML source, and its
rendered preview.

| File | Purpose |
| --- | --- |
| `database-schema.dbml` | DBML source for [dbdiagram.io](https://dbdiagram.io). |
| `implementation-plan.md` | Ordered migration and application cutover plan. |
| `leonly-diagram.png` | Rendered diagram exported from dbdiagram.io. |

`database-schema.dbml` is the accepted design-time contract. It is not the runtime source of truth.
Until the design is implemented, migrations describe current runtime behavior; after implementation,
generate this DBML from migrations to prevent drift.

Some documented rules are retained as DBML notes because DBML cannot faithfully model partial unique
indexes, check constraints, XOR ownership, or active-state cardinality bounds.
