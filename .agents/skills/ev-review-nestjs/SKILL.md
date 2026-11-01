---
name: ev-review-nestjs
description: "Trigger: implementing or reviewing NestJS or Nest.js. Apply service naming, module layout, colocated tests, and module-owned fixtures."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV NestJS Review Rules

## Activation Contract

Use before implementing NestJS modules/classes/injection/tests, or as an optional `ev-code-review`
companion. Load general/backend rules through `ev-coding-standards` for implementation; do not start an
independent review or delegate. Review output/check assignments apply only during reviews.

## Hard Rules

- Preserve the coordinator's scope, baseline, read-only constraints, and general/backend rules.
- Require every injected service property or constructor parameter to end in `Service`, such as
  `private readonly usersService: UsersService`. Apply the rule to constructor and property injection,
  including services injected through custom tokens or factory providers.
- Identify services by their actual provider contract and use, not merely an injection token or type
  name. Do not require a `Service` suffix for non-service dependencies such as repositories,
  configuration values, or clients; preserve framework-required names and external contracts.
- Group supporting production files in responsibility-specific folders even when there is only one:
  `dto/` (singular), `utils/`, `constants/`, `types/`, `docs/`, `config/` (including OpenAPI configuration),
  and corresponding folders for other categories such as `guards/`, `decorators/`, and `entities/`.
  Only controllers, services, and the owning module file use the module-root exceptions below.
- Keep one `.controller.ts` or `.service.ts` file at its owning module root. With two or more production
  files in that category, group them in `controllers/` or `services/` respectively. Count files, not
  symbols, independently for each category; exclude tests/fixtures and nested modules' files.
- Keep the owning `.module.ts` file and its test at that module's root. Nested modules follow these
  rules independently; do not flatten their boundaries or group module files into a category folder.
- Keep module-owned unit tests directly beside their production files, including inside supporting,
  controller, and service folders. Preserve test filenames and existing `.test.ts` or `.spec.ts`
  conventions. Do not move them
  into `__tests__/` or the test-support `tests/` folder.
- Place module-owned fixtures, mocks, factories, and test-only helpers directly in that module's
  root-level `tests/` folder, creating it only when support files exist. Share them across that module's
  tests rather than duplicating them; do not add a `fixtures/` subfolder. Keep production utilities in
  their production category folders; exclude test-only support from production-file counts.
- Application-wide integration/e2e suites and support files retain their established testing owner and
  discovery layout, such as project-root `test/` or `tests/`. Do not force cross-module suites into an
  arbitrary module. Update affected imports and preserve working test discovery when files move.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| NestJS class with injected services | Check injected service identifiers for the `Service` suffix. |
| Custom injection token or factory provider | Trace the provider contract before classifying the dependency. |
| Non-service dependency or plain utility | Do not impose the injected-service naming rule. |
| Supporting file, even a single DTO/utility/constant/type/documentation/configuration file | Use its responsibility-specific folder; DTOs use `dto/`. |
| One controller or service production file in its category | Keep it at the owning module root. |
| Two or more controllers or services in one category | Use `controllers/` or `services/` for that category, with colocated tests. |
| Owning module file and its test | Keep both at that module's root. |
| Production file has a module-owned unit test | Place the test directly beside it, preserving its filename. |
| Module-owned fixtures, mocks, factories, or test-only helpers | Place directly in the module's root-level `tests/`, without a `fixtures/` subfolder. |
| Application-wide integration/e2e suite or support file | Preserve its established testing owner and discovery layout. |

## Execution Steps

1. Identify scoped NestJS modules, file categories, tests, classes, injection points, and providers.
   Read the [paired examples and exceptions](references/examples.md).
2. Trace ambiguous tokens and contracts; check service identifiers and their references, including tests.
3. Inspect each owning module independently: supporting folders, controller/service counts, root module
   files, colocated tests, and root-level `tests/` fixtures. Tests and fixtures do not affect production counts.
4. Report naming and layout violations as low-severity style findings with the smallest consistent
   rename or move. Account for imports, exports, and test discovery when recommending moves; record
   unresolved contracts or discovery configuration as verification gaps.

## Output Contract

Return evidence-backed candidates with severity, `path:line`, rule wording, impact, and smallest fix,
plus a result for each assigned coverage ID: `nestjs-injected-provider-naming`;
`nestjs-module-layout`; `nestjs-colocated-tests-module-fixtures`. Each result must use the shared
status/evidence contract in `ev-code-review/references/coverage.md`. Let `ev-code-review` consolidate
the report.

## References

- [Paired examples and exceptions](references/examples.md): injected-service classification/naming,
  supporting folders, controller/service thresholds, colocated tests, and module-owned fixtures.
