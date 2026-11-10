# Review Coverage Contract

This formal plan/results contract applies to explicit review/check/fix requests, including a formal
review report requested during generation. Ordinary implementation uses
[coding guidance and relevant project checks](generation-review.md) instead; it does not require review
coverage records, JSON artifacts, or the validator. Both workflows use the same substantive rules.

Build the plan before analysis. Select checks relevant to the requested scope; technologies outside
scope need no placeholder groups or results. Every planned check must receive exactly one result.
If a planned check is later found inapplicable, retain it with `NOT_APPLICABLE` and a reason rather
than silently dropping it. IDs are stable categories, not proof of every individual rule.
Use descriptive lowercase kebab-case check IDs prefixed by domain or technology, never numeric sequences.
Keep each ID tied to its meaning rather than its position; use the same slug in rules, plans, and results.

## Check inventory

| Reviewer | Check IDs and scope |
| --- | --- |
| `core` | `general-ownership-structure`; `general-correctness-naming-boundaries`; `general-configuration-async-side-effects`; `general-errors-trust-boundaries-security`; `general-tests-verification` |
| `frontend` | `frontend-ui-boundaries-state-rendering`; `frontend-xss-url-browser-security`; `frontend-accessibility`; `frontend-performance` |
| `backend` | `backend-input-validation-errors`; `backend-api-contracts-pagination`; `backend-injection-query-construction`; `backend-authorization-data-isolation`; `backend-browser-facing-security`; `backend-service-operational-resilience`; `backend-worker-structure`; `backend-optimistic-locking`; `backend-transactions-locking` |
| `typescript` | `typescript-exported-api-contracts`; `typescript-trust-narrowing-state-types`; `typescript-function-signatures-object-types`; `typescript-imports-configuration-environment` |
| `react` | `react-component-ownership-props`; `react-hooks-state-derived-values`; `react-safe-rendering-accessibility-testing` |
| `nextjs` | `nextjs-routes-rendering-client-boundaries`; `nextjs-server-only-imports-environment`; `nextjs-server-entry-validation-authorization` |
| `nestjs` | `nestjs-injected-provider-naming`; `nestjs-module-layout`; `nestjs-colocated-tests-module-fixtures`; `nestjs-body-dto-validation`; `nestjs-path-parameter-validation`; `nestjs-global-validation-pipe`; `nestjs-api-openapi-scalar`; `nestjs-health-checks` |

Select `core` for every review, plus applicable domain and installed technology companions. Select the
relevant check IDs within those groups; justify exclusions during planning rather than omitting a
required check for convenience. Do not select a group merely because its technology is installed.
The legacy JSON field `reviewers` names logical check groups evaluated sequentially by the same agent,
not additional agents. Preserve this format for validator compatibility; do not delegate.

```text
// Avoid: add React placeholder results to a plain TypeScript-only review.
// Also avoid: remove a planned pagination check after discovering there is no pagination in scope.
// Prefer: leave React unselected; retain the planned pagination check as NOT_APPLICABLE with a reason
// that the scoped endpoint returns one resource. Other planned checks still need their own results.
```

## Check result statuses

- `PASS`: the prescribed check was performed; include concrete evidence such as `path:line` or a
  command and result. This is scoped evidence, not a guarantee of correctness.
- `FAIL`: include evidence and one or more finding IDs present in the findings list.
- `NOT_APPLICABLE`: include a short reason grounded in the reviewed scope.
- `UNVERIFIED`: include the missing evidence or limitation. Revisit high-risk cases or report them as
  open coverage gaps.

Each logical check group records its ID and files reviewed, plus one result for every planned check ID.
Each finding has a unique ID, severity, file/line, evidence, impact, and minimal fix. Consolidation may
deduplicate findings, but must preserve all related check IDs and affected sites.
For explicit review/check/fix requests, render every consolidated finding in chat with its severity,
location, rule, evidence, impact, minimal fix, and fixed/remaining status when fixes are requested.
Never apply a five-finding or other top-N cap. Generation records may reuse these check IDs and statuses
without adopting the formal artifact schema; never substitute them for a requested formal review.

## Validator files

The plan JSON has `reviewers`, each with a unique `id` and its `check_ids`. The results JSON has
`reviewers` (each with `id` and `files_reviewed`), `checks` (each with `reviewer_id`, `id`, `status`,
and status-specific `evidence`, `reason`, or `finding_ids`), and `findings` (each with a unique `id`).
Findings also carry severity, file/line, evidence, impact, and a minimal fix. Example:

```bash
{"reviewers":[{"id":"core","check_ids":["general-errors-trust-boundaries-security"]}]}
{"reviewers":[{"id":"core","files_reviewed":["src/auth.ts"]}],"checks":[{"reviewer_id":"core","id":"general-errors-trust-boundaries-security","status":"FAIL","evidence":"src/auth.ts:42: ownership is not checked before the read","finding_ids":["missing-resource-ownership"]}],"findings":[{"id":"missing-resource-ownership","severity":"HIGH","file":"src/auth.ts","line":42,"evidence":"...","impact":"...","fix":"..."}]}
```

See the validator's error messages for required fields. Run `python <path-to-ev-code-review>/assets/validate_coverage.py
--plan /path/to/plan.json --results /path/to/results.json` from any directory.

The validator checks completeness and referential consistency only; it cannot establish that the plan
selected every relevant reviewer or that evidence supports the reviewer's judgment.
