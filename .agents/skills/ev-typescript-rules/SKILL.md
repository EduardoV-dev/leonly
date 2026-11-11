---
name: ev-typescript-rules
description: "Trigger: implementing or checking TypeScript code. Apply TypeScript coding rules and exceptions."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV TypeScript Rules

## Activation Contract

Apply these rules when implementing or checking TypeScript code. Load general/domain rules through
`ev-coding-standards`; preserve project guidance and applicable exceptions.

## Hard Rules

- Use strict TypeScript. Explicitly type exported function parameters and return values; ordinary
  exported constants may use inference. Preserve framework-required, overloaded, and generic contracts.
- Prefer absolute imports using established project aliases when the module specifier is shorter than
  the equivalent relative import, especially for deep `../../` paths. Keep relative imports when shorter
  or equal; preserve package boundaries and public entry points.
- Inspect the owning `tsconfig.json`, including inherited settings, and runtime/bundler/test resolution.
  If alias support is missing, recommend merging `"paths": { "@/*": ["./src/*"] }` into
  `compilerOptions`, adapting the alias and source root to the project. Do not add `baseUrl` solely for
  this mapping. TypeScript `paths` does not rewrite emitted imports: recommend the corresponding
  resolver configuration where needed, and require working resolution before adopting aliases.
  Once supported, prefer shorter absolute imports in new or changed code. Offer a separate refactor
  of existing imports; do not expand review scope or edit files without a request.
- Consume first-party API responses using documented response types. Avoid speculative response-shape
  parsers for repository-owned contracts; handle HTTP and domain errors. Crossing an HTTP boundary alone
  does not require a new parser. Preserve required ingress validation from general rules.
- Require shared exported `ApiError = { code: string; message: string; field?: string }` and
  `ApiResponse<T> = { ok: true; data: T; error: []; message: string } | { ok: false; data: null; error: ApiError[]; message: string }`.
  Use these types across first-party JSON API producers/consumers, including paginated payloads;
  do not redefine endpoint-local envelopes. Preserve protocol-defined non-JSON/bodyless responses.
  Health-check endpoints instead use the shared
  [HealthResponse](../ev-api-contracts/assets/contracts.md#health-check-exception) directly, without
  an envelope: all checks up = `ok`/200, mixed = `degraded`/503, all down = `down`/503.
- Check offset/cursor page types against backend metadata rules. Infer cursor types from extendable
  Zod object schemas; require schema-aware shared encode/decode methods without unchecked assertions.
- Avoid `any`. Preserve established TypeScript contracts throughout the call chain: accept and use
  existing DTOs, response types, SDK types, and workflow contracts directly. Reserve `unknown` for values
  genuinely lacking a trustworthy contract. Do not widen known values to `unknown`, replace them with
  generic records, repeat guaranteed checks, or reconstruct the same guarantees with handwritten parsers.
  Flag `unknown` combined with `typeof`, property checks, or shape detection when an existing contract
  already supplies those guarantees; those checks are not a smell at genuinely uncontracted boundaries.
- Type annotations alone do not validate input. Preserve required validation at untrusted ingress and
  checks outside the declared guarantees, including decoded content, business invariants, and authorization.
  Prefer narrowing or parsing when validation is needed. Allow assertions only when runtime validation
  or an independently established, documented invariant justifies them; a comment alone is not evidence.
- Avoid double assertions such as `value as unknown as Memory`. When an assertion is justified, use a
  direct assertion such as `value as Memory`; if it is rejected, fix or validate the value rather
  than bypassing the type compatibility check.
- Use discriminated unions when valid properties depend on mutually exclusive states. Independent optional
  fields do not require a union; do not invent states the feature does not have.
- For one input, use a directly typed positional parameter. For two or more inputs, use one object
  destructured in the signature with a named `<FunctionName>Params` type, using PascalCase for the type.
  Do not keep an `options` or `params` object and access its properties in the body. Preserve externally
  required signatures, including framework and native callbacks.
- Return a single value directly using its existing type. When combining multiple outputs, return an
  object with a named `<FunctionName>Return` type, using PascalCase. An existing entity or collection
  counts as one value even if it has multiple fields or elements; do not add a wrapper or redundant alias.
  Assess inputs and outputs separately and preserve existing shared contracts rather than duplicating them.
  Count independently supplied inputs and combined outputs, not wrappers: a newly constructed parameter
  or result bundle is not an existing domain contract merely because it is one object. Use named
  `Params`/`Return` types for those bundles; see the contrasting examples.
- If the owning application/package has no environment constants module, recommend
  `src/constants/environment-variables.ts`. Reuse an established module even at another path; preserve
  the general configuration-boundary exceptions and evaluation timing.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| TypeScript source/declarations or related configuration/tests | Apply relevant type/contract rules. |
| JavaScript-only code or TypeScript merely installed | Do not apply TypeScript requirements. |
| Untrusted runtime input | Apply general validation rules; static types are not validation. |
| Value with an established concrete contract | Preserve its type; flag redundant widening, validation, and parsing without removing checks outside its guarantees. |
| One input/output versus multiple inputs/outputs | Use direct values for one; named `Params`/`Return` object contracts for multiple, subject to existing-contract and external-signature exceptions. |

## Execution Steps

1. Read scoped contracts, consumers, owning TypeScript configuration, relevant tests, and the
   [rule examples and exceptions](references/examples.md).
2. Check exported types, contract preservation, necessary narrowing, state modeling, response/page contracts and cursor schemas, function parameter/return
   object shapes, shorter absolute imports and alias resolution, and environment ownership.
3. Use the project's documented non-writing typecheck when relevant; report gaps.

## Output Contract

Report relevant checks and material gaps. For requested standards checks, report evidenced violations.

## References

- [Rule examples and exceptions](references/examples.md): exported contracts, contract preservation,
  assertions, state modeling, and parameter/return conventions.
