# Migration Review Checkpoints

Each record in this directory is the authoritative approval receipt for one platform-migration
implementation batch. Create the record before requesting review and update it only with the
user's explicit decision. No next batch may begin until the current record is approved.

## Rules

- A batch contains fewer than 800 total changed textual lines: additions plus deletions.
- Count source, tests, migrations, configuration, lockfiles, generated text, and documentation.
- Requested revisions remain in the current batch and consume its remaining line allowance.
- An indivisible change over the limit requires an explicit, recorded user exception before work.
- The user must approve every implementation choice. Silence, acknowledgement, or an incomplete
  review is not approval.

## Record Template

Create `NNN-short-description.md` from this template.

```markdown
# Checkpoint NNN: <short description>

## Scope

- Baseline revision: `<commit>`
- Review revision: `<commit>`
- Status: `pending | approved | changes-requested | exception-approved`
- Changed lines: `<additions> additions + <deletions> deletions = <total>`
- Limit: `800`
- Exception: `<none | explicit user-approved exception and reason>`

## Complete Diff

`<commit-range or immutable diff artifact>`

## File Inventory

| File | Additions | Deletions | Purpose |
| --- | ---: | ---: | --- |
| `<path>` | `<n>` | `<n>` | `<why it changed>` |

## Decision Ledger

| Choice | Options considered | User decision | Approval evidence |
| --- | --- | --- | --- |
| `<choice>` | `<options>` | `<decision>` | `<explicit user message or link>` |

## Verification

| Check | Command or evidence | Result |
| --- | --- | --- |
| `<check>` | `<command or receipt>` | `<pass | fail | not run>` |

## Risks And Open Questions

- `<risk, unresolved choice, or none>`

## User Review Outcome

- Requested changes: `<none or exact request>`
- Explicit decision: `<continue | change direction | reject | exception approval>`
- Approved by: `<user>`
- Recorded at: `<timestamp>`
```
