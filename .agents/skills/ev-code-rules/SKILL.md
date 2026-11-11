---
name: ev-code-rules
description: "Trigger: implementing code or checking coding standards. Apply general, frontend, and backend coding and security rules."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "2.0"
---

# EV Code Rules

## Activation Contract

Use through `ev-coding-standards` before code changes or for an explicitly requested standards check.
These rules guide implementation; use other skills for functional code reviews.

## Hard Rules

- Read the complete general rules and applicable domain and technology rules, including exceptions.
- Prioritize correctness, security, accessibility, and data integrity.
- Select rules from actual behavior, runtime, imports, and ownership; tests follow their subject.
- Reuse unchanged guidance; reload missing, changed, or newly applicable rules before affected edits.
- Keep checks read-only unless fixes are requested. Preserve user changes and respect plan mode.
- Work in the current agent thread. Do not install missing skills or invent technology-specific rules.

## Decision Gates

| Scope | Rules |
| --- | --- |
| Any code | General rules. |
| UI/browser behavior | Add frontend rules. |
| Server/data operations | Add backend rules. |
| Mixed code | Add both domain rules. |
| Relevant technology | Add the applicable installed companion. |

## Execution Steps

1. Inspect the task, project instructions, affected code, contracts, tests, and tooling.
2. Load applicable rules and their referenced examples; apply them to the requested work.
3. Run relevant checks and verify affected integrations. For requested standards checks or fixes, use
   `ev-coding-standards/references/check-and-fix.md`.

## Output Contract

Report relevant verification and material gaps. For explicit standards checks or fixes, report every
finding with severity, location, rule, evidence, impact, and minimal fix; include fix status when applicable.

## References

- [General](references/general.md): shared code, security, and completion checks.
- [Frontend](references/frontend.md): UI/browser behavior, security, accessibility, and performance.
- [Backend](references/backend.md): server validation, access, data, and operational security.
- [Implementation checks](references/generation-review.md): coding guidance and context recovery.
- [Workflow verification](references/generation-verification.md): verification of workflow changes.
