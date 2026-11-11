# NestJS Rule Examples And Exceptions

Apply these examples with the complete skill and general/backend rules. Snippets illustrate alternatives,
not standalone applications. Structure examples use `.test.ts`; preserve `.spec.ts` when established.

## Classify Services By Their Actual Contract

```ts
// Avoid: the identifier hides that this dependency is a service.
constructor(private readonly users: UsersService) {}
```

```ts
// Prefer:
constructor(private readonly usersService: UsersService) {}
```

```ts
// Accept: a repository is not a service.
constructor(
  @InjectRepository(User)
  private readonly usersRepository: Repository<User>,
) {}
```

An injected `ConfigService` is a service; a plain configuration value is not. Trace ambiguous provider
contracts instead of inferring responsibility from `@Inject()`, a token, or a class suffix alone.

## Custom Tokens And Factory Injection

```ts
// Avoid when this token resolves to a notification service.
@Inject(NOTIFICATION_SERVICE)
private readonly notifications!: NotificationContract;
```

```ts
// Prefer: preserve the token and contract; clarify the service identifier.
@Inject(NOTIFICATION_SERVICE)
private readonly notificationsService!: NotificationContract;
```

```ts
// Avoid for the same service contract in a factory provider.
useFactory: (notifications: NotificationContract) =>
  new AlertDispatcher(notifications),
```

```ts
// Prefer:
useFactory: (notificationsService: NotificationContract) =>
  new AlertDispatcher(notificationsService),
```

Preserve injection tokens, provider registration, and external contracts. Nest factory parameters stay
positional and match the `inject` array order; the TypeScript object-parameter rule does not override
framework-required signatures. Non-service clients, repositories, and configuration values keep their
appropriate names without an added `Service` suffix.

## Supporting Categories Always Have Folders

```text
# Avoid: supporting files remain flat just because each category has one file.
user/
  create-user.dto.ts
  create-user.dto.test.ts
  normalize-user-email.ts
  user.constants.ts
  user.types.ts
  user.docs.ts
  user-openapi.config.ts
  user.controller.ts
  user.service.ts
  user.module.ts
```

```text
# Prefer: group supporting files even with one production file per category.
user/
  dtos/
    create-user.dto.ts
    create-user.dto.test.ts
  utils/
    normalize-user-email.ts
    normalize-user-email.test.ts
  constants/
    user.constants.ts
  types/
    user.types.ts
  docs/
    user.docs.ts
  configs/
    user-openapi.config.ts
  user.controller.ts
  user.controller.test.ts
  user.service.ts
  user.service.test.ts
  user.module.ts
  user.module.test.ts
```

Use plural grouping folders: `dtos/`, not `dto/`, and `configs/`, not `config/`. Apply the same rule to
other supporting categories such as `guards/`, `decorators/`, and `entities/`. Create folders only for
files that exist; the example does not require new DTOs, tests, configuration, or empty directories.

## Group Controllers And Services Independently

```text
# Avoid: multiple services stay flat while a single controller gets a category folder.
user/
  controllers/
    user.controller.ts
    user.controller.test.ts
  user.service.ts
  user.service.test.ts
  user-invitations.service.ts
  user-invitations.service.test.ts
  user.module.ts
  user.module.test.ts
```

```text
# Prefer: each category has its own production-file threshold.
user/
  user.controller.ts
  user.controller.test.ts
  services/
    user.service.ts
    user.service.test.ts
    user-invitations.service.ts
    user-invitations.service.test.ts
  user.module.ts
  user.module.test.ts
```

With a second controller, move both controllers and their tests to `controllers/`. Keep the owning
module and its test at the root regardless of category counts. Tests and fixtures do not count as
production files. Nested modules own their own root, counts, supporting folders, and fixtures; their
files do not contribute to the parent module's counts.

## Tests Follow Production Files; Fixtures Belong In Tests

```text
# Avoid: separated unit tests and an extra fixtures subfolder.
user/
  dtos/
    create-user.dto.ts
    __tests__/
      create-user.dto.test.ts
  __tests__/
    user.module.test.ts
    fixtures/
      user.fixture.ts
  user.module.ts
```

```text
# Prefer: colocated tests and root-level module-owned fixtures.
user/
  dtos/
    create-user.dto.ts
    create-user.dto.test.ts
  controllers/
    user-1.controller.ts
    user-1.controller.test.ts
    user-2.controller.ts
    user-2.controller.test.ts
  services/
    user-1.service.ts
    user-1.service.test.ts
    user-2.service.ts
    user-2.service.test.ts
  tests/
    user.fixture.ts
  user.module.ts
  user.module.test.ts
```

The module-root `tests/` folder holds fixtures and test-only support, not relocated production unit
tests. Do not duplicate a shared fixture in each category or add `tests/fixtures/`. A fixture used by
only one test still belongs in the owning module's `tests/`. Do not create `tests/` without support
files. Preserve test filenames and update imports, exports, and runner discovery configuration
when moving files. Inspect existing discovery patterns before claiming a proposed move is safe.

### Application-Wide Suites And Test Support Have Their Own Owner

```text
# Avoid: arbitrarily assign a cross-module e2e suite to user/ and mix test helpers with production code.
src/user/
  utils/
    create-test-app.ts
  app.e2e-spec.ts
```

```text
# Prefer in a project whose application-wide test owner is test/:
src/user/
  utils/
    normalize-user-email.ts
  tests/
    user.fixture.ts
    users-service.mock.ts
    create-test-user.ts
  user.service.ts
  user.service.test.ts
  user.module.ts
  user.module.test.ts
test/
  app.e2e-spec.ts
  create-test-app.ts
  application.fixture.ts
```

Classify by actual use: production email normalization belongs in `utils/`; a user fixture, mock, or
test-only factory belongs in the module's `tests/`. Application-wide e2e setup and shared cross-module
fixtures belong to the application-wide testing owner. Preserve an existing `tests/` or other intentional
suite layout instead of renaming it to match this example. These files do not affect controller/service
production counts, and the example does not require adding tests or support files that do not exist.
