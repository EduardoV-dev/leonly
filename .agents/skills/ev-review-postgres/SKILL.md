---
name: ev-review-postgres
description: "Trigger: PostgreSQL functions, privileges, or SQL code review with ev-code-review. Supply privileged-function hardening rules."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV PostgreSQL Review Rules

## Activation Contract

Use as an optional `ev-code-review` companion for PostgreSQL SQL, functions, migrations, privileges,
and their tests. Supply rules to the active review; do not start an independent review or delegate.

## Hard Rules

- Preserve coordinator scope, baseline, read-only constraints, and general/backend rules.
- Review every scoped `security definer` function: set a safe `search_path`, schema-qualify referenced
  objects, and restrict execution to intended callers.
- Enforce general/backend requirements for physical SQL line counts, parameterized queries,
  allowlisted dynamic identifiers, least privileges, and cross-account isolation. Do not duplicate
  those rules with weaker PostgreSQL-specific alternatives.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| PostgreSQL SQL/function/privilege changes | Apply matching PostgreSQL rules. |
| `security definer` function | Inspect resolution paths, object qualification, and execution grants. |
| Supabase SDK usage without PostgreSQL-specific code | Do not infer a privileged-function review. |
| Another SQL dialect | Use backend rules, not PostgreSQL syntax requirements. |

## Execution Steps

1. Verify the SQL dialect and inspect scoped function definitions and relevant grants/migrations.
2. Trace referenced objects and effective privileges; verify safe resolution and intended callers.
3. Inspect isolation tests and assigned non-writing checks; never apply migrations during a read-only review.

## Output Contract

Return candidates with severity, `path:line`, rule wording, evidence/impact, and smallest fix, plus gaps.
Checklist: safe `search_path`, qualified objects, restricted execution, and applicable backend data
controls. The coordinator consolidates findings.
