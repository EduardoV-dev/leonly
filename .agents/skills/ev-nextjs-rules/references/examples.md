# Next.js Rule Examples And Exceptions

Apply these examples with the complete skill and general/domain rules. Snippets illustrate alternatives,
not standalone applications. Preserve existing contracts and framework requirements for the installed
Next.js version and router. Each section pairs an avoided pattern with a preferred or accepted pattern.

## Thin Routes Own Framework Integration

```tsx
// Avoid in app/orders/page.tsx: the route owns feature calculations and presentation.
export default async function Page(): Promise<React.ReactElement> {
  const orders = await getOrders();
  const outstandingOrders = orders.filter((order) => order.status === "pending");
  const outstandingTotal = outstandingOrders.reduce((total, order) => total + order.total, 0);

  return (
    <section>
      <h1>Orders</h1>
      <p>Outstanding total: {outstandingTotal}</p>
      <ul>
        {outstandingOrders.map((order) => (
          <li key={order.id}>{order.reference}</li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// Prefer in app/orders/page.tsx: route orchestration delegates feature behavior and UI.
export default async function Page(): Promise<React.ReactElement> {
  const orders = await getOrders();

  return <OrdersPage orders={orders} />;
}
```

```tsx
// Also accept: re-export when the feature owns all page orchestration.
export { OrdersPage as default } from "@/features/orders/pages/orders";
```

The feature implementation owns the extracted calculations and presentation, following React ownership
and hook rules. Thin does not mean re-export only: metadata, route configuration, and framework-level
orchestration may remain in route files. Preserve required exports and directives; an `error.tsx`
boundary must retain its required client boundary even when its UI is extracted. Do not add an
unsupported Server Component migration to Pages Router code.

```text
// Avoid: apply the React index.tsx convention to a framework route.
app/orders/page/index.tsx

// Prefer: retain the framework entry and extract application-owned UI separately.
app/orders/page.tsx
features/orders/pages/orders/index.tsx
```

Preserve all installed-version file conventions, including `layout.tsx`, `loading.tsx`, `error.tsx`,
and `route.ts`. A feature component's folder convention must not change URL segments or disable a
framework entry point. Server loading in the preferred page example stays server-side; do not turn
it into a state/effect hook just to follow React's client workflow-extraction rule.

## Client Boundaries Follow The Module Graph

```tsx
// Avoid in app/orders/page.tsx: making the whole page client-side for one interactive panel.
"use client";

import { OrderSummary } from "@/features/orders/components/order-summary";
import { InteractivePanel } from "@/features/orders/components/interactive-panel";

export default function Page(): React.ReactElement {
  return (
    <InteractivePanel>
      <OrderSummary />
    </InteractivePanel>
  );
}
```

```tsx
// Prefer: this page remains a Server Component; only InteractivePanel declares "use client".
import { OrderSummary } from "@/features/orders/components/order-summary";
import { InteractivePanel } from "@/features/orders/components/interactive-panel";

export default function Page(): React.ReactElement {
  return (
    <InteractivePanel>
      <OrderSummary />
    </InteractivePanel>
  );
}
```

Here the server parent passes server-rendered content through the client panel's `children` prop;
the panel does not import `OrderSummary`. Importing that implementation from the client module is
different and brings it into the client graph, or fails if it uses server-only capabilities. Do not
infer the graph from visual nesting. Client boundaries must still receive supported serializable
props. Supported Server Action references are not ordinary server implementation imports.

## Independent Reads Versus Genuine Dependencies

```ts
// Avoid: independent reads are unnecessarily serialized.
const orders = await getOrders();
const categories = await getCategories();
```

```ts
// Prefer when concurrency is safe.
const [orders, categories] = await Promise.all([
  getOrders(),
  getCategories(),
]);
```

```ts
// Accept: the second request needs the first result.
const workspace = await getCurrentWorkspace();
const orders = await getWorkspaceOrders(workspace.id);
```

Show an actual unnecessary dependency chain before reporting a waterfall. Preserve required ordering,
rate limits, authorization dependencies, and side-effect safety. `Promise.all` does not cancel work
already started when another operation fails. A slow request alone is not evidence of serialization.

## Public Environment Access And Exposure

These accesses belong inside the existing public environment constants boundary, not scattered
throughout components. Retain the project's existing validation and defaults around the shown reads.

```ts
// Avoid for browser-side inlining: the access uses a dynamic key.
const variableName = "NEXT_PUBLIC_SITE_URL";
export const SITE_URL = process.env[variableName];
```

```ts
// Prefer: the bundler can identify the literal public variable access.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
```

```ts
// Avoid: a public prefix exposes a privileged credential to the browser.
export const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;
```

```ts
// Prefer inside the server-only environment constants module.
import "server-only";

export const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
```

The private module must not enter the client import graph, and secrets must not be passed through
client props or exposed through logs/errors. A public prefix is not permission to expose a secret.
Public values are normally inlined at build time; changing the deployed server's environment does
not update those built browser values. Preserve established runtime lookup mechanisms when values
genuinely need request-time evaluation rather than replacing them with import-time constants.

## Server Actions Are Independent Trust Boundaries

```ts
"use server";

// Avoid: a typed ID and an authenticated page do not protect this callable entry point.
export async function deleteOrderAction(orderId: string): Promise<void> {
  await deleteOrder(orderId);
}
```

```ts
"use server";

// Prefer: validate ingress and reach resource-level authorization on every invocation.
export async function deleteOrderAction(orderId: string): Promise<void> {
  const validatedOrderId = orderIdSchema.parse(orderId);
  const session = await requireSession();

  await deleteOrderForUser({
    orderId: validatedOrderId,
    userId: session.user.id,
  });
}
```

In the avoided example, `deleteOrder` has no validation/authentication/authorization enforcement; if
an existing implementation already owns those checks, calling it is not a violation. In the preferred
example, `deleteOrderForUser` must enforce permission on that specific order, such as a deletion query
scoped to the verified owner. Its name alone is not evidence: inspect the implementation and applicable
tests. Do not trust a user ID supplied by the client or delete by order ID alone.

Validation and authorization may live in an existing invoked service/data-access boundary. Verify
that every invocation reaches them rather than duplicating checks at each layer. A DTO describes
expected shape but does not validate attacker-controlled action arguments. Preserve ingress checks,
then use established types throughout the validated workflow without speculative reparsing.

These deletion examples are private operations. An intentionally public action follows its declared
anonymous-access policy instead of mechanically adding `requireSession()`, while retaining required
validation, safe output, and abuse controls. Missing enforcement is not an implicit public policy.
