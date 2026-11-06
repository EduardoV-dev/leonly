---
name: ev-review-nestjs
description: "Trigger: implementing or reviewing NestJS or Nest.js. Enforce plural grouping, DTO validation, API/docs setup, health contracts, service naming, and test ownership."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV NestJS Review Rules

## Activation Contract

Use before NestJS implementation or with `ev-code-review`. Load general/backend rules through
`ev-coding-standards`; never initiate a separate review or delegate.

## Hard Rules

- Preserve assigned scope, baseline, read-only constraints, and general/backend rules.
- End injected service identifiers in `Service`, including constructor/property injection and custom
  tokens/factories. Classify actual provider contracts; exempt non-service dependencies and preserve
  framework-required names and external contracts.
- Group every supporting production category, even one file, in plural folders: `dtos/`, `utils/`,
  `constants/`, `types/`, `docs/`, `configs/`, `guards/`, `decorators/`, `entities/`, and equivalents.
- Keep one controller/service file at its module root; group two or more in `controllers/`/`services/`.
  Count production files independently, excluding tests, fixtures, and nested modules. Keep the owning
  module and its test at the root; apply layout rules independently to nested modules.
- Colocate unit tests with production files, preserving filenames. Put module-owned fixtures, mocks,
  factories, and test helpers directly in root-level `tests/`, without `fixtures/` or duplicate support.
  Create folders only when needed. Preserve application-wide suite ownership and test discovery.
- Require runtime DTO classes for request bodies unless explicitly overridden. Validate on DTOs with
  `class-validator`; use `class-transformer` for needed transformations/nested instances. Prefer these
  alone; separate validation files/additional validators require a concrete need. Static types do not suffice.
- Validate path parameters at the HTTP boundary using a matching built-in pipe inline in `@Param()`;
  avoid duplicate manual format checks in controllers or services. Preserve distinct domain validation
  and use custom pipes when built-ins cannot meet the contract.
- Require global `ValidationPipe` options `forbidNonWhitelisted: true`, `whitelist: true`, and
  `transform: true`. Custom pipes may extend, not weaken, this baseline.
- Set the global prefix to `api`; generate OpenAPI with `@nestjs/swagger` and serve Scalar at `/docs`,
  outside `/api`. Document prefixed operations and DTO schemas accurately.
- Use the shared [health contract](../ev-api-contracts/assets/contracts.md#health-check-exception)
  directly: `{ status, checks }`; all up = `ok`/200, mixed = `degraded`/503, all down = `down`/503.

## Decision Gates

| Scope | Action |
| --- | --- |
| Ambiguous injected dependency | Trace provider contracts before applying service naming. |
| Module files/tests | Apply independent category counts, plural grouping, and test ownership. |
| Body endpoint/bootstrap | Verify DTO metadata, global validation, `/api`, and OpenAPI/Scalar at `/docs`. |
| Path parameters | Verify format validation uses an appropriate inline built-in pipe when available. |
| Health endpoint | Verify actual checks, direct payload, aggregation, and 200/503 mapping. |

## Execution Steps

1. Read complete [layout examples](references/examples.md) and [HTTP rules/examples](references/http.md).
2. Inspect scoped modules, providers, endpoints, bootstrap, and tests; verify applicable rules.
3. Preserve imports/exports and discovery when moving files. Classify naming/layout as low-severity
   style findings; classify behavioral defects by impact. Record unresolved evidence as gaps.

## Output Contract

During reviews, return severity, `path:line`, rule, evidence, impact, and minimal fix, plus each assigned ID:
`nestjs-injected-provider-naming`;
`nestjs-module-layout`; `nestjs-colocated-tests-module-fixtures`; `nestjs-body-dto-validation`;
`nestjs-path-parameter-validation`; `nestjs-global-validation-pipe`; `nestjs-api-openapi-scalar`; `nestjs-health-checks`. Use
`ev-code-review/references/coverage.md`; let the coordinator consolidate.

## References

- [Paired examples and exceptions](references/examples.md): injected-service classification/naming,
  supporting folders, controller/service thresholds, colocated tests, and module-owned fixtures.
- [HTTP rules and examples](references/http.md): DTOs, global validation, API/docs setup, and health checks.
