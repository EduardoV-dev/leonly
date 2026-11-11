---
name: ev-react-rules
description: "Trigger: implementing or checking React code. Apply React coding rules and exceptions."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV React Rules

## Activation Contract

Apply these rules when implementing or checking React code. Load general/domain rules through
`ev-coding-standards`; preserve project guidance and applicable exceptions.

## Hard Rules

- Declare one React component per production `.tsx` file, including private components and components
  wrapped in `memo` or similar APIs. Inline JSX and JSX returned by `.map()` callbacks are not additional
  component declarations.
- Declare props readonly using `Readonly<Props>` or readonly properties when TypeScript is used.
  Use readonly collections when receiving arrays; `Readonly<Props>` alone is shallow. Never mutate
  received domain objects. Reuse existing immutable contracts rather than imposing recursive wrappers.
- Use a kebab-case component folder with an `index.tsx` entry point in TypeScript projects; use the
  language-appropriate JSX extension otherwise. Preserve the project's established styling system.
  When none exists and custom styles are needed, use a colocated CSS module. Do not create empty stylesheets.
  Framework-mandated entry files keep their required names and locations; this folder convention
  applies to application-owned feature components, not renaming framework routes or boundaries.
- Components describe UI. Extract meaningful client-side workflows coordinating requests, validation,
  navigation, effects, or related state transitions into a custom hook beside the component. Keep simple
  local interactions in the component; do not decide extraction solely by line count or number of hooks.
  Server data loading/orchestration remains in async Server Components or server functions. Do not move
  it into client state/effect hooks or add a client boundary merely to satisfy hook extraction.
- A page-only hook belongs beside its page; feature-shared hooks belong in `feature/hooks`;
  cross-feature hooks belong in `src/hooks`. Expose domain-oriented state/actions, not implementation details.
- Do not create a hook merely to wrap a simple derived value or trivial toggle. Derive values during
  render when existing props/state fully determine them, instead of synchronizing duplicate state with
  effects. Editable drafts may be independent state initialized from props; define reset behavior
  intentionally rather than automatically synchronizing them with an effect.
- Prefix hooks with `use`, callback props with `on`, and internal event handlers with `handle`.
- Tightly coupled compound primitives under `src/components/ui` may share a file when intentionally
  consumed as one shared API. Names such as `Root` or `Content` alone do not establish a family.
  This exception does not apply to feature components.
- Render untrusted text through normal JSX interpolation so React escapes it. Do not use
  `dangerouslySetInnerHTML` with user-controlled content unless product-required HTML is sanitized at
  the final render boundary and tested as required by frontend rules.
- When Testing Library is used, prefer accessible queries such as `getByRole` with a name.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| React component/hook/JSX or its tests | Apply relevant React rules. |
| Plain domain utility in a React package | Do not impose component/hook structure. |
| Non-React JSX | Do not infer React from the extension alone. |
| Approved compound primitive family | Apply the one-component exception. |
| Trivial local interaction or derived value | Keep it local; do not extract a hook solely to relocate code. |
| Component needs custom styles | Follow the established styling system; otherwise use a colocated CSS module. |
| Server Component data loading or framework entry file | Preserve server execution and framework filenames; do not force client hooks or an `index.tsx` rename. |

## Execution Steps

1. Verify actual React usage, component ownership, hook consumers, styling conventions, and applicable
   test tooling. Read the [rule examples and exceptions](references/examples.md).
2. Check component count/props, collocation, hook responsibilities, derived state, and safe rendering.
3. Verify exceptions and behavioral impact; report relevant checks without duplicating shared runs.

## Output Contract

Report relevant checks and material gaps. For requested standards checks, report evidenced violations.

## References

- [Rule examples and exceptions](references/examples.md): hook extraction, derived values, component
  structure/styling, compound families, and readonly props.
