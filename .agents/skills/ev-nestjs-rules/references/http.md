# NestJS HTTP Rules And Examples

Apply with the complete NestJS skill and general/backend rules. Examples are scoped fragments, not
standalone applications. Preserve existing application contracts and installed-version compatibility.

## Validate Request Bodies On DTO Classes

Every endpoint accepting a body requires a concrete DTO class unless the user explicitly instructs
otherwise. Keep validation decorators on the DTO in `dtos/`; prefer `class-validator` and
`class-transformer` alone. Do not create parallel schema/validation files or add another validation
library when these libraries can satisfy the requirement. Separate custom validation files are allowed
only when a concrete requirement needs them, such as a reusable custom constraint.

```ts
// Avoid: an inline type has no runtime validation metadata.
@Post()
createUser(@Body() body: { email: string }) {
  return this.usersService.createUser(body);
}
```

```ts
// dtos/create-user.dto.ts
import { Type } from "class-transformer";
import { IsDefined, IsEmail, IsString, ValidateNested } from "class-validator";

export class UserProfileDto {
  @IsString()
  displayName!: string;
}

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile!: UserProfileDto;
}
```

```ts
// Controller fragment: import the DTO as a runtime value, not with import type.
import { CreateUserDto } from "./dtos/create-user.dto";

@Post()
createUser(@Body() body: CreateUserDto) {
  return this.usersService.createUser(body);
}
```

Use appropriate validation decorators for each accepted field; Swagger decorators and TypeScript types
alone do not validate. Add `@ValidateNested({ each: true })`, `@Type(() => ChildDto)`, and array constraints
for nested collections when applicable. Do not introduce coercion decorators when no transformation is
needed. Interfaces, utility types that erase runtime metadata, and scalar `@Body("field")` extraction
alone do not replace validation of the complete body.

## Require An Optimistic-Locking Token On Updates

Apply the backend concurrency decision rule to resource updates. When stale-edit protection requires
optimistic locking, apply `backend-optimistic-locking`. Prefer a suitable integer version
column, with a required validated last-read version DTO field matching its actual database range and
representation; do not convert large integers to unsafe JavaScript numbers. Otherwise reuse this runtime
timestamp DTO at the narrowest shared owner, in `dtos/`, and keep its field required even for PATCH.

```ts
// dtos/optimistic-lock.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsISO8601, IsString, Matches } from "class-validator";

export class OptimisticLockDto {
  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-09-05T16:00:00.123Z",
  })
  @IsDefined()
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/)
  lastKnownUpdatedAt!: string;
}
```

Extend or compose this DTO with the update's writable fields. Apply `PartialType` only to editable
fields, not to `OptimisticLockDto` or the final combined DTO. Do not add `@IsOptional()` or conditional
validation that skips the token: these can bypass its requiredness even with `@IsDefined()`.
`@IsDefined()` preserves the required field when validation skips missing properties. This example is
for millisecond precision; retain an exact string and appropriate validation for existing microsecond
contracts until safely migrated. Do not pass microsecond tokens through `Date`.

Use the [shared atomic update contract](../../ev-api-contracts/references/optimistic-locking.md).
Separate the chosen token from writable properties before persistence. On a failed conditional
match, raise `ConflictException` from `@nestjs/common` (or the existing mapped domain conflict) with
"This resource was updated elsewhere. Refresh it and try again." Preserve existing access/not-found
policy, map the error to HTTP 409 in the shared failure envelope, and document that response in OpenAPI.
On success, return the persisted new token; never silently retry with a refreshed token.

## Validate Path Parameters With Pipes

Prefer a matching built-in pipe directly on `@Param()` rather than manually validating the HTTP
parameter's format in the controller or service.

```ts
// Avoid: manual format validation in the controller.
@Get(":id")
findOne(@Param("id") id: string) {
  if (!isUUID(id)) throw new BadRequestException("Invalid user ID");
  return this.usersService.findOne(id);
}
```

```ts
// Avoid: HTTP parameter format validation in the service.
@Get(":id")
findOne(@Param("id") id: string) {
  return this.usersService.findOne(id);
}

// Service fragment
findOne(id: string) {
  if (!isUUID(id)) throw new BadRequestException("Invalid user ID");
  return this.usersRepository.findOneBy({ id });
}
```

```ts
// Prefer: reject invalid UUIDs before the controller method runs.
@Get(":id")
findOne(@Param("id", new ParseUUIDPipe()) id: string) {
  return this.usersService.findOne(id);
}
```

```ts
// Prefer: validate and convert integer identifiers.
@Get(":id")
findOne(@Param("id", new ParseIntPipe()) id: number) {
  return this.usersService.findOne(id);
}
```

Import pipes from `@nestjs/common` and select the pipe and options matching the identifier contract.
Format validation does not establish resource existence or authorization. Preserve distinct domain
validation, including requirements for non-HTTP callers; use a custom pipe when built-ins cannot meet
the contract. Preserve existing API error contracts.

## Register One Effective Global Validation Baseline

```ts
import { ValidationPipe } from "@nestjs/common";

app.useGlobalPipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    whitelist: true,
    transform: true,
  }),
);
```

Register before listening, or use equivalent global `APP_PIPE` registration. A shared custom pipe may
add `transformOptions: { enableImplicitConversion: false }` and an `exceptionFactory`, but must retain
all three baseline options. Extend the existing global pipe rather than stacking duplicate pipes.
`whitelist` alone strips unknown fields; `forbidNonWhitelisted` also rejects them.

When the application uses `ev-api-contracts`, preserve its shared `ApiError` and `ApiResponse<T>`.
A custom exception factory may internally emit `{ errors: validationErrors(errors) }` only when the
exception filter converts it into the ordinary failure envelope (`error`, singular). Preserve HTTP 400,
safe constraint messages, and dotted nested field paths, including array indices. The formatter and
separate validation helper are optional, not mandatory application scaffolding.

## Prefix API Routes And Serve Scalar Separately

```ts
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

app.setGlobalPrefix("api");

const openApiConfig = new DocumentBuilder()
  .setTitle("Application API")
  .setVersion("1.0")
  .build();
const document = SwaggerModule.createDocument(app, openApiConfig);

app.use("/docs", apiReference({ content: document }));
```

Set the global prefix before generating the document. Do not set `ignoreGlobalPrefix: true` or add
`api` to each controller path; operation paths must include `/api` exactly once. Scalar must be served
at `/docs`, not `/api/docs`; mounting its middleware separately does not require excluding API routes.
For Fastify, use Scalar's `withFastify: true` option and verify compatibility with the installed adapter.
Reuse existing bootstrap helpers; configuration files belong in `configs/` when extracted.

Document body properties, constraints, and required/optional fields with `@ApiProperty` /
`@ApiPropertyOptional` or the configured Swagger CLI plugin. Verify the generated schema actually
includes DTO fields; class-validator decorators alone do not guarantee OpenAPI schema generation.
Swagger UI is not a substitute for the required Scalar UI.

## Health Endpoints Use The Shared Health Contract

Use [HealthResponse and its aggregation table](../../ev-api-contracts/assets/contracts.md#health-check-exception)
directly, including for liveness/readiness endpoints. A controller declared with `@Controller("health")`
is reached at `/api/health`; do not exclude it from the API prefix by default.

Report actual dependency results: all up is `ok`/200, a mix is `degraded`/503, and all down is `down`/503.
Handle failed checks and timeouts as `down` without abandoning the remaining check results. Do not
wrap health responses in the ordinary envelope or let a global exception filter/interceptor rewrite
their shape. Framework health helpers' default output must be adapted to this contract.

## Verification

- Body validation rejects invalid fields, unknown fields, and invalid nested objects/arrays, while
  accepting valid input and preserving intended transformation behavior.
- For updates requiring optimistic locking, DTOs require the selected token even after partial-update composition; verify invalid/missing
  tokens, exact round trips at stored precision, HTTP 409 envelopes, and one winner for concurrent updates.
- Path parameters accept valid identifiers and reject invalid formats before the controller method;
  integer pipes also deliver numbers to the service.
- API routes use `/api` once; Scalar loads at `/docs` and documents prefixed operation paths and DTOs.
- Health checks return the exact direct shape and HTTP status for all-up, mixed, and all-down results,
  including failed/timed-out checks through the real application response pipeline.
