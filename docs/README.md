# Leonly Documentation

This directory records durable Leonly product and architecture intent. User stories describe
outcomes, scope, and observable behavior that OpenSpec can turn into requirements, scenarios, and
implementation tasks; architecture documents record accepted system designs without replacing the
implementation as runtime truth.

- [MVP user stories](user-stories/mvp/README.md)
- [Database schema design](architecture/database-schema/README.md)
- [Terraform learning path for the API](architecture/terraform-learning-path.md)
- [Target platform architecture](architecture/platform-migration/README.md)
- [Platform migration plan](architecture/platform-migration/migration-plan.md)

## Sources of truth

| Concern | Source of truth |
| --- | --- |
| Durable product intent | `docs/user-stories/` |
| Accepted database design | `docs/architecture/database-schema/` |
| API infrastructure learning plan | `docs/architecture/terraform-learning-path.md` |
| Target platform and migration sequence | `docs/architecture/platform-migration/` |
| Normative behavior and acceptance scenarios | `openspec/specs/` |
| Proposed changes and implementation tasks | `openspec/changes/` |

User stories are inputs to OpenSpec, not substitutes for it. OpenSpec specifications define normative
behavior and acceptance scenarios, while OpenSpec changes define proposed work and implementation
tasks. Link a story to its relevant OpenSpec artifact when one exists.
