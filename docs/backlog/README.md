# Backlog

This backlog contains unfinished product stories and technical work, grouped under `epics/<epic-name>/`.
Each item has its own Markdown file; each epic README lists its active items and dependencies.

## Epics

- [Complete the Supabase migration](epics/complete-supabase-migration/README.md) — memory lifecycle and operational cutover.
- [Shared space](epics/shared-space/README.md) — day-counter status verification.
- [Security and global states](epics/security-and-global-states/README.md) — global UI verification.
- [Places and currency](epics/places-and-currency/README.md) — future release.
- [Dashboard expansion](epics/dashboard-expansion/README.md) — future release.

## Lifecycle

1. Record the outcome, scope, acceptance criteria, dependencies, and unresolved decisions in an item.
2. Link its OpenSpec change when created. Keep the item while work is in progress or verification is incomplete.
3. Remove the item only after implementation and required verification are complete **and** its OpenSpec change is archived. Remove an epic when no unfinished items remain.

OpenSpec specifications define normative behavior; archived changes provide delivery history. Stable
story IDs may refer to work already completed and therefore no longer present in the backlog. Confirm
uncertain completion status before removing an item.
