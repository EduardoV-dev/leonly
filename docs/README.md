# Leonly Documentation

This directory records durable Leonly product intent. User stories describe outcomes, scope, and
observable behavior that OpenSpec can turn into requirements, scenarios, and implementation tasks;
they do not track delivery.

- [MVP user stories](user-stories/mvp/README.md)
- [Frontend design guide](../DESIGN.md)

## Sources of truth

| Concern | Source of truth |
| --- | --- |
| Durable product intent | `docs/user-stories/` |
| Normative behavior and acceptance scenarios | `openspec/specs/` |
| Proposed changes and implementation tasks | `openspec/changes/` |
| Frontend visual and interaction rules | `DESIGN.md` |
| Actual implementation | application code, migrations, policies, and tests |

User stories are inputs to OpenSpec, not substitutes for it. OpenSpec specifications define normative
behavior and acceptance scenarios, while OpenSpec changes define proposed work and implementation
tasks. Link a story to its relevant OpenSpec artifact when one exists.
