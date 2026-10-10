---
name: ev-review-typescript
description: "Trigger: TypeScript code review with ev-code-review. Supply TypeScript contract and environment-module rules for scoped TypeScript code."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV TypeScript Review Rules

## Activation Contract

Use as an optional `ev-code-review` companion for TypeScript source, declarations, and their tests.
Supply technology rules to the active review; do not start an independent review or delegate.

## Hard Rules

- Preserve the coordinator's scope, baseline, read-only constraints, and general/domain rules.
- Use strict TypeScript and explicit types at exported boundaries.
- Consume first-party API responses using documented response types. Avoid speculative response-shape
  parsers for repository-owned contracts; handle HTTP and domain errors. This does not remove runtime
  validation of untrusted input required by general rules.
- Avoid `any`; use `unknown` and narrow it. Avoid assertions unless runtime validation or a documented
  invariant justifies them.
- Avoid double assertions such as `value as unknown as Memory`. When an assertion is justified, use a
  direct assertion such as `value as Memory`; if it is rejected, fix or validate the value rather
  than bypassing the type compatibility check.
- Use discriminated unions for mutually exclusive states instead of combinations of optional fields.
- Prefer one destructured object parameter over multiple positional parameters. Use an inline object
  type for parameter or return objects with one or two properties; use a named `<FunctionName>Params`
  or `<FunctionName>Return` type for three or more properties. Use a named type at any size when
  another function reuses or extends that contract. Assess parameter and return objects separately.
- If the owning application/package has no environment constants module, recommend
  `src/constants/environment-variables.ts`. Reuse an established module even at another path; preserve
  the general configuration-boundary exceptions and evaluation timing.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| TypeScript source/declarations or related configuration/tests | Apply relevant type/contract rules. |
| JavaScript-only code or TypeScript merely installed | Do not apply TypeScript requirements. |
| Untrusted runtime input | Apply general validation rules; static types are not validation. |

## Execution Steps

1. Read scoped contracts, consumers, owning TypeScript configuration, and relevant tests.
2. Check exported types, narrowing, state modeling, response contracts, function parameter/return
   object shapes, and environment ownership.
3. Use the project's documented non-writing typecheck when assigned by the coordinator; report gaps.

## Output Contract

Return evidence-backed candidates with severity, `path:line`, rule wording, impact, and smallest fix,
plus checks/gaps. Checklist: strictness, exported contracts, narrowing, discriminated states, object
parameter/return type reuse and size, and environment-module ownership. Let `ev-code-review`
consolidate the report.
