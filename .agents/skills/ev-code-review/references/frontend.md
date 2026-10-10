# Frontend Rules

Apply to UI, browser behavior, and their tests. Load general rules as well. A server-rendered UI still
uses frontend rules; add backend rules for server operations, not merely its rendering location.

## UI Boundaries And State

- UI may depend on feature logic; feature and domain logic must not depend on UI.
- Keep server-only modules out of client bundles.
- Keep state close to its consumers and promote it only when multiple consumers require it.
- Client validation is for user experience; authoritative validation belongs on the server.
- Hiding a UI control is not authorization. Never treat client-provided identity or permission flags
  as authoritative; inspect the relevant server enforcement when needed.

## XSS And Browser Security

- Render untrusted text through the framework's escaping mechanism or safe text APIs, not raw HTML.
- If HTML rendering is required, sanitize user-controlled HTML with a maintained allowlist-based
  sanitizer at the final render boundary. Add tests for scripts, event handlers, unsafe URLs, SVG,
  and malformed markup. Technology companions specify framework APIs.
- Validate user-controlled URLs before assigning them to `href`, `src`, redirects, or CSS. Allow only
  required protocols; reject `javascript:`, `data:`, protocol-relative, and malformed URLs unless a
  reviewed use case explicitly needs them.
- Do not build executable JavaScript, HTML, CSS, or JSON by concatenating untrusted strings.
- Never store session secrets in browser-readable storage. Inspect cookie/CSP enforcement using
  backend rules when relevant; do not assume UI code controls response headers.

## Accessibility And Performance

- Use semantic HTML before ARIA and preserve keyboard access, labels, visible focus, and meaningful
  image alternatives.
- Do not communicate state through color alone.
- Measure before optimizing; avoid speculative memoization, caching, and virtualization.
- Prevent obvious request waterfalls. Apply framework-specific rendering/client-boundary rules only
  through applicable installed companions.
- Use accessible, behavior-oriented UI test queries; tooling-specific requirements apply when present.

## Completion Checklist

- Client bundles and browser storage contain no private credentials or session secrets.
- Untrusted rendering and navigation are safe; server validation/authorization is not replaced by UI checks.
- Keyboard access, labels, focus, alternatives, and non-color state cues are preserved.
- Relevant UI tests cover observable behavior; performance changes have evidence rather than speculation.
