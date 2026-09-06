## Why

Leonly already supports English and Spanish during authentication and onboarding, but an active
member cannot manage that device-local choice from Settings. US-031 completes the MVP language
workflow before the final cross-feature access and global-state audits.

## What Changes

- Add an English/Spanish selector to the current member's personal Settings section.
- Apply a selected language immediately across every completed MVP surface, including the document
  language and locale-sensitive presentation, without navigation or reauthentication.
- Persist only the explicit choice in the current browser profile, ahead of browser-language
  detection, with deterministic English handling for unsupported or malformed saved values.
- Provide keyboard-operable selected states, preserved focus, and announced completion without
  changing shared, membership, account, or partner data.
- Audit completed MVP namespaces and visible interface strings for English and Spanish coverage.
- Keep account-synchronized language preferences outside the MVP; this change remains device-local.

## Capabilities

### New Capabilities

- `language-preference`: Device-local English/Spanish resolution, immediate switching, persistence,
  document-language synchronization, and accessible interaction behavior.

### Modified Capabilities

- `shared-space-settings`: Replace the future language placeholder with the current member's
  functional language selector while preserving personal ownership and responsive accessibility.

## Impact

- Affects the shared i18n initialization and language-switching utilities, the reusable language
  control, Settings UI and translations, and completed-MVP translation coverage.
- Adds no database migration, API route, account metadata, membership field, or cross-device sync.
- Requires focused i18n and Settings interaction tests plus the existing web-app verification gates.
