---
name: ev-nestjs-rules
description: "Trigger: implementing or checking NestJS code. Apply NestJS coding rules and exceptions."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV NestJS Rules

## Activation Contract

Apply these rules when implementing or checking NestJS code. Load general/domain rules through
`ev-coding-standards`; preserve project guidance and applicable exceptions.

## Hard Rules

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
- Require the selected [optimistic-locking token](references/http.md#require-an-optimistic-locking-token-on-updates)
  on updates requiring stale-edit protection, including PATCH: prefer a suitable integer version; otherwise require a timezone-qualified
  timestamp at stored precision. Apply the backend atomic update/409 rule and document the conflict response.
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
| Resource update | Verify concurrency strategy; when optimistic locking applies, verify token validation, atomic comparison, and documented HTTP 409. |
| Path parameters | Verify format validation uses an appropriate inline built-in pipe when available. |
| Health endpoint | Verify actual checks, direct payload, aggregation, and 200/503 mapping. |

## Execution Steps

1. Read complete [layout examples](references/examples.md) and [HTTP rules/examples](references/http.md).
2. Inspect scoped modules, providers, endpoints, bootstrap, and tests; verify applicable rules.
3. Preserve imports/exports and discovery when moving files. Verify relevant behavior and report unresolved evidence as gaps.

## Output Contract

Report relevant checks and material gaps. For requested standards checks, report evidenced violations.

## References

- [Paired examples and exceptions](references/examples.md): injected-service classification/naming,
  supporting folders, controller/service thresholds, colocated tests, and module-owned fixtures.
- [HTTP rules and examples](references/http.md): DTOs, optimistic locking, global validation, API/docs
  setup, and health checks.
