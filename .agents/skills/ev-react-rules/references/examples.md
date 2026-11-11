# React Rule Examples And Exceptions

Apply these examples with the complete skill and general/domain rules. Snippets illustrate alternatives,
not standalone applications. Keep existing TypeScript contracts and project styling conventions.

## Extract Workflows, Not Trivial Interactions

```tsx
// Accept inside a component: a trivial disclosure needs no custom hook.
const [isExpanded, setIsExpanded] = useState(false);

function handleToggle() {
  setIsExpanded((previousIsExpanded) => !previousIsExpanded);
}
```

```tsx
// Prefer for a workflow coordinating validation, requests, and submission state.
const {
  email,
  emailError,
  isSubmitting,
  handleEmailChange,
  handleSubmit,
} = useInviteMemberForm();
```

The hook belongs beside its owning component and exposes domain-oriented state/actions. Do not create
`useToggle` merely to move a simple interaction out of the component. Conversely, do not leave a
coordinated submission workflow inline merely because it fits within the file-size limit. Judge the
responsibility, not the number of `useState` calls.

### Server Loading Is Not A Client Hook Workflow

```tsx
// Avoid: useOrders uses useState/useEffect, forcing client execution for server loading.
"use client";

export function OrdersPage(): React.ReactElement {
  const { orders } = useOrders();
  return <OrdersList orders={orders} />;
}
```

```tsx
// Prefer when the feature is server-rendered and needs no client interaction.
export async function OrdersPage(): Promise<React.ReactElement> {
  const orders = await getOrders();
  return <OrdersList orders={orders} />;
}
```

This is not a ban on intentional client fetching, refresh, or interaction workflows. Determine the
execution model first. The extraction rule must not move server-only dependencies to the browser or
introduce a client boundary. Extract server orchestration into server functions when warranted.

## Derived Values Versus Independent Drafts

```tsx
// Avoid: state duplicates a value already determined by items.
const [itemCount, setItemCount] = useState(items.length);

useEffect(() => {
  setItemCount(items.length);
}, [items]);
```

```tsx
// Prefer: calculate during render without duplicate state or an effect.
const itemCount = items.length;
```

```tsx
// Accept: this editable draft is independent of the saved value after initialization.
const [draftName, setDraftName] = useState(savedName);
```

Initializing a draft from props is not the same as maintaining a redundant derived value. Specify when
the draft resets, such as switching records or explicitly discarding edits. Do not add an effect that
overwrites unsaved changes whenever the saved value updates. A simple draft may stay local; a coordinated
editing workflow follows the hook-extraction rule above.

## Component Folders And Styling

```text
order-summary/
  index.tsx
  order-summary.module.css
  use-order-summary.ts

status-label/
  index.tsx
```

The first component needs custom styles and a workflow hook; the second needs neither. Do not create
empty CSS modules or hooks merely to complete a folder template. Use the language-appropriate JSX
extension outside TypeScript projects.

Framework-mandated route and boundary files are exceptions to the `index.tsx` entry convention. For
example, keep Next.js `app/orders/page.tsx`; extract feature UI to its own component folder rather
than relocating the route to `app/orders/page/index.tsx`.

Preserve established Tailwind, CSS-in-JS, or other project styling conventions rather than converting
them to CSS modules. With no established styling system, use a colocated CSS module when custom styles
are required. Shared styling follows actual ownership; do not import another page's private styles.

## One Component Per File And Compound Families

```tsx
// Avoid in one feature file: these are two component declarations.
function OrderBadge() {
  return <span>Confirmed</span>;
}

export function OrderCard() {
  return <OrderBadge />;
}
```

```text
order-card/
  index.tsx
  order-badge/
    index.tsx
```

Move a private component to its own folder at the narrowest owning level. A component declared using
`memo` still counts as a component; wrapping it does not bypass the rule. Inline JSX such as
`orders.map((order) => <li key={order.id}>{order.reference}</li>)` is not another component declaration
and does not require extraction merely to satisfy this rule.

`Dialog`, `DialogTrigger`, and `DialogContent` may share a file under `src/components/ui` when they
form one intentionally consumed primitive API. A collection of unrelated components does not qualify
merely because its exports are named `Root`, `Header`, or `Content`. Feature components remain subject
to one component per file, even when their names resemble compound primitives.

## Readonly Props Are Shallow

```tsx
// Insufficient for preventing array mutation: only the property is readonly.
type OrderListProps = Readonly<{
  orders: OrderDto[];
}>;

// With this type, orders.push(...) is still permitted by TypeScript.
```

```tsx
// Prefer: the collection is readonly too.
type OrderListProps = Readonly<{
  orders: readonly OrderDto[];
}>;
```

A readonly collection does not make its elements deeply immutable. Never mutate objects received
through props. Use an existing immutable domain contract when available; do not introduce a recursive
`DeepReadonly` abstraction across the project merely to enforce this rule. Make a copy when a local
operation such as sorting would otherwise mutate received data.
