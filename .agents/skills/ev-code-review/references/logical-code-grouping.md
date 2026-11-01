# Logical Code Grouping

Apply `general-logical-code-grouping` from the general rules before generation and during review.
These fragments demonstrate spacing, not changes to contracts, validation, concurrency, or behavior.

## Separate Meaningful Phases

Avoid compressing validation, calculation, and the result into one visual block:

```ts
function calculateTotal(order: Order): number {
  if (order.items.length === 0) {
    throw new Error("Cannot calculate an empty order");
  }
  const subtotal = calculateSubtotal(order.items);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;
  return total;
}
```

Prefer one blank line between those phases, with related calculations together:

```ts
function calculateTotal(order: Order): number {
  if (order.items.length === 0) {
    throw new Error("Cannot calculate an empty order");
  }

  const subtotal = calculateSubtotal(order.items);
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  return total;
}
```

Do not pad every line or force an extra group into a short function:

```ts
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

## Keep Related Setup Together

An upload-issuance workflow can keep request validation and membership lookup together, then
separate the membership guard. An asynchronous call alone does not require a new group.
The related timestamps form another single group:

```ts
const issuedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
const expiresAt = new Date(issuedAt.getTime() + UPLOAD_URL_SECONDS * 1000);
const attachmentDeadline = new Date(issuedAt.getTime() + ATTACHMENT_SECONDS * 1000);
```

Inside a mapping callback, separate local preparation from the substantial record being returned:

```ts
const records = descriptors.map((descriptor) => {
  const id = uuidv7();

  return {
    id,
    uploaderUserId: userId,
    spaceId: membership.spaceId,
    originalFilename: descriptor.filename,
    declaredMimeType: descriptor.contentType,
    declaredByteSize: descriptor.byteSize,
  };
});
```

That record is an abbreviated fragment, not a replacement for the full upload contract.
Likewise, keep signing and adding each response in readable groups inside the loop, with a blank
line between the finished loop and the final `return { uploads };`. Do not reorder operations,
change error handling, or introduce concurrency to satisfy a spacing rule.

## Discover The Target Project's Tools

1. Inspect applicable guidance, the owning package/workspace manifest, lockfile, scripts, CI, and
   formatter/linter configuration. Resolve inherited/shared configs, overrides, ignored paths, and
   installed versions. `.editorconfig` alone does not establish statement-grouping enforcement.
2. Identify what actually formats and checks the scoped language: for example Prettier, Biome,
   ESLint with stylistic rules, or language-native tools. Use documentation matching that version;
   do not assume a JavaScript rule works for Python, SQL, or another language.
3. Inspect the effective rules for blank-line removal or mandatory padding that could conflict
   with intentional grouping. Reconcile policy/tool conflicts before affected edits; do not disable
   the formatter, introduce ignore directives, or replace project conventions to bypass them.

## Enforce The Supported Subset

- Use the installed toolchain first. Where configuration changes are in scope, add the smallest
  compatible rule to the existing configuration, keeping its syntax, overrides, and plugin ownership.
  Otherwise report the proposed change. Do not install a dependency or migrate tooling implicitly.
- Prettier preserves existing statement blank lines, collapses consecutive blank lines, and removes
  blank padding at block boundaries. It does not infer semantic processing phases; do not invent a
  Prettier option for automatic logical grouping. Generate the groups before formatting, then inspect
  the output for preservation with the installed version and applicable plugins.
- If ESLint Stylistic is already installed and supports the scoped language, evaluate
  `@stylistic/padding-line-between-statements`. It can enforce structural boundaries, not determine
  whether adjacent declarations belong to different semantic phases. Avoid blanket rules requiring
  a blank line after every statement or `const` declaration.

For example, this rule entry enforces the before-return subset when that policy is compatible with
the project. Merge it into the existing rules only after checking plugin registration, installed
version, effective overrides, and whether its unconditional return spacing is acceptable for short
functions. It is not a complete grouping configuration or a reason to install the plugin:

```json
{
  "@stylistic/padding-line-between-statements": [
    "error",
    { "blankLine": "always", "prev": "*", "next": "return" }
  ]
}
```

For other tools, verify equivalent capabilities rather than translating this configuration by guess.
If a tool cannot express the approved grouping without undesirable padding, retain semantic review
and report the unsupported portion instead of over-enforcing it.

## Verify And Report

Use representative scoped examples: related declarations remain together, a guard/calculation/return
flow stays separated, callbacks retain preparation/result grouping, and a short return-only function
stays compact. Check that formatter output and lint fixes agree and that a second pass is stable.
When adding a tool rule, also confirm its check rejects a violating example. Use the project's commands
and follow the general read-only verification policy; formatting write modes apply only within
authorized edit scope, with disposable fixtures when needed.

Report selected config paths/versions, changes or proposed changes, executed commands/results, and
what remains a semantic check. If no applicable tool/configuration exists, state that gap; do not
claim automatic enforcement or introduce a formatter merely to make the report pass.
