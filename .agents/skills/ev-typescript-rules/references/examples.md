# TypeScript Rule Examples And Exceptions

Apply these examples with the complete skill and general/domain rules. Snippets illustrate alternatives,
not standalone applications. Reuse existing project contracts and preserve externally required signatures.

## Explicit Exported Contracts

```ts
// Avoid: the public return contract changes implicitly with the body.
export function getOrderSummary(order: Order) {
  return { id: order.id, total: order.total };
}
```

```ts
// Prefer: the public contract is explicit.
export function getOrderSummary(order: Order): OrderSummary {
  return { id: order.id, total: order.total };
}

// Accept: an obvious constant needs no redundant annotation.
export const MAX_ORDER_ITEMS = 20;
```

Preserve framework-required, overloaded, and generic signatures. Do not replace a required contract
with an incompatible annotation merely to satisfy this rule.

## Preserve Established Workflow Contracts

Use existing DTOs, API response types, SDK types, and internal workflow contracts directly. Do not
introduce `unknown` or speculative parsing merely because a value arrived through an API call.

```ts
// Avoid: discards the API client's established OrderDto contract.
const response: unknown = await ordersApi.getOrder(orderId);
const order = orderSchema.parse(response);
```

```ts
// Prefer: the typed client already returns OrderDto.
const order = await ordersApi.getOrder(orderId);
```

### Code Smell: Unknown Plus Manual Shape Reconstruction

```ts
// Avoid: reconstructs a contract already supplied by the workflow.
function getOrderLabel(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "reference" in value &&
    typeof value.reference === "string"
  ) {
    return value.reference;
  }

  throw new Error("Invalid order");
}
```

```ts
// Prefer: retain the established contract instead of repeating its checks.
function getOrderLabel(order: OrderDto): string {
  return order.reference;
}
```

`unknown` and narrowing remain appropriate when no trustworthy contract exists. A DTO or assertion
does not validate raw user input: preserve required validation at public ingress, webhook verification,
and decoded-content checks. Do not duplicate validated shape checks throughout the typed workflow.
An `OrderDto` also does not prove ownership, authorization, or business validity; keep those checks.

## Assertions Need Evidence

```ts
// Avoid: neither assertion validates an untrusted payload.
const order = payload as OrderDto;
const forcedOrder = payload as unknown as OrderDto;
```

```ts
// Prefer at an ingress requiring validation: establish the runtime contract.
const order = orderSchema.parse(payload);
```

A documented invariant must be independently established, not merely asserted in a comment:

```ts
const button = document.createElement("button");
button.innerHTML = '<span class="label"></span>';

// Accept: the code above establishes the exact element and its existence.
const label = button.querySelector(".label") as HTMLSpanElement;
```

This assertion loses its justification if the markup becomes dynamic or externally controlled.
Prefer narrowing when the element's existence or type is uncertain. A direct assertion is not safe
merely because it avoids a double assertion.

## Mutually Exclusive States Versus Optional Fields

```ts
// Avoid: permits impossible combinations, such as loading with an error.
type OrderState = {
  isLoading: boolean;
  order?: OrderDto;
  error?: string;
};
```

```ts
// Prefer: each state determines which properties are available.
type OrderState =
  | { status: "loading" }
  | { status: "success"; order: OrderDto }
  | { status: "error"; error: string };

// Accept: independent optional filters are not mutually exclusive states.
type OrderFilters = {
  customerId?: string;
  createdAfter?: string;
};
```

Add an `idle` state only if the feature actually has that state. Do not remove intentional states
such as background loading with existing data; model the feature's real valid combinations.

## Single Values Versus Multiple Inputs And Outputs

For one input, use a directly typed positional parameter. Return one value directly. Existing entities,
objects supplied as one domain value, and collections count as one value; do not unwrap their fields
merely to apply the multiple-input/output rule.
An existing domain/shared contract describes an established workflow value, not an arbitrary object
introduced to combine independent arguments or outputs. Classify its responsibility, not its arity
after wrapping. Preserve genuine shared contracts without renaming or duplicating them.

```ts
// One input and one output: no unnecessary wrapper or alias.
function getOrderTotal(order: OrderDto): number {
  return order.total;
}
```

For two or more inputs, destructure a named `<FunctionName>Params` object in the signature. When a
function combines two or more outputs, use a named `<FunctionName>Return` object. Use PascalCase names.

```ts
type CalculateOrderTotalsParams = {
  subtotal: number;
  shippingCost: number;
};

type CalculateOrderTotalsReturn = {
  total: number;
  shippingCost: number;
};

function calculateOrderTotals({
  subtotal,
  shippingCost,
}: CalculateOrderTotalsParams): CalculateOrderTotalsReturn {
  return {
    total: subtotal + shippingCost,
    shippingCost,
  };
}
```

Apply input and output decisions independently. A function may have one positional input and multiple
outputs, or multiple object inputs and one scalar result. Return existing `OrderDto` or `OrderDto[]`
contracts directly; do not rename them to `<FunctionName>Return`. Reuse shared parameter/return contracts
instead of defining equivalent function-specific types. Preserve externally required signatures, such
as native array callbacks receiving `(value, index)` and framework handlers with prescribed arguments.

### Existing Entity Versus New Result Bundle

```ts
// Accept: return an existing entity contract without a redundant GetOrderReturn alias.
function getOrder(orderId: string): OrderDto {
  return ordersRepository.getById(orderId);
}
```

```ts
// Avoid: a new multi-output bundle is not one existing domain value.
function getOrderDetails(order: OrderDto): { order: OrderDto; canEdit: boolean } {
  return { order, canEdit: canEditOrder(order) };
}
```

```ts
// Prefer: name the contract for the combined outputs.
type GetOrderDetailsReturn = {
  order: OrderDto;
  canEdit: boolean;
};

function getOrderDetails(order: OrderDto): GetOrderDetailsReturn {
  return { order, canEdit: canEditOrder(order) };
}
```

### Wrapping Arguments Does Not Change Their Classification

```ts
// Avoid: two independent inputs hidden inside an unnamed object contract.
function findOrder(input: { orderId: string; customerId: string }): OrderDto {
  return ordersRepository.findForCustomer(input);
}
```

```ts
// Prefer: a named parameter contract destructured in the signature.
type FindOrderParams = {
  orderId: string;
  customerId: string;
};

function findOrder({ orderId, customerId }: FindOrderParams): OrderDto {
  return ordersRepository.findForCustomer({ orderId, customerId });
}
```

Receiving an established `CreateOrderDto` or shared filter contract is different from inventing the
unnamed wrapper above. Treat that established domain input as one value and reuse its contract.
