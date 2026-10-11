---
name: ev-review-nestjs
description: "Trigger: NestJS or Nest.js code review with ev-code-review. Check injected service naming in scoped NestJS classes."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV NestJS Review Rules

## Activation Contract

Use as an optional `ev-code-review` companion for scoped NestJS classes and their injection contracts
and tests. Supply technology rules to the active review; do not start an independent review or delegate.

## Hard Rules

- Preserve the coordinator's scope, baseline, read-only constraints, and general/backend rules.
- Require every injected service property or constructor parameter to end in `Service`, such as
  `private readonly usersService: UsersService`. Apply the rule to constructor and property injection,
  including services injected through custom tokens or factory providers.
- Identify services by their actual provider contract and use, not merely an injection token or type
  name. Do not require a `Service` suffix for non-service dependencies such as repositories,
  configuration values, or clients; preserve framework-required names and external contracts.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| NestJS class with injected services | Check injected service identifiers for the `Service` suffix. |
| Custom injection token or factory provider | Trace the provider contract before classifying the dependency. |
| Non-service dependency or plain utility | Do not impose the injected-service naming rule. |

## Execution Steps

1. Identify scoped NestJS classes, constructor parameters, property injection, and relevant providers.
2. Trace ambiguous tokens and contracts; check service identifiers and their references, including tests.
3. Report naming violations as style findings with the smallest consistent rename; record unresolved
   provider contracts as verification gaps.

## Output Contract

Return evidence-backed candidates with severity, `path:line`, rule wording, impact, and smallest fix,
plus checks/gaps. Checklist: constructor injection, property injection, custom-token service
classification, and consistent `Service` suffixes. Let `ev-code-review` consolidate the report.
