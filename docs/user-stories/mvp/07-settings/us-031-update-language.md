# US-031: Update My Language

**Priority:** Must<br>
**Depends on:** US-015

## User Story

As an active member, I want to choose English or Spanish so I can use Leonly in the language I
understand best without changing my partner's experience.

## Intended Outcome

The settings page lets a member change the interface language immediately. The explicit choice is
stored on the current device, survives refresh and sign-in, and takes priority over browser language
detection.

## Scope

- An English or Spanish selector in the current member's settings.
- Immediate translation of every completed MVP surface without requiring navigation or sign-in.
- Device-local persistence, browser-language fallback, and a deterministic English fallback.
- Loading-safe initialization and accessible selected, focus, and announcement states.

## Business Rules

- The only supported language codes are `en` and `es`; unsupported stored values fall back to English.
- An explicit device-local selection takes priority over the browser's preferred languages.
- Without a saved selection, Spanish browser locales select Spanish; all other locales select English.
- Changing language affects only the current browser profile. It does not update the active space,
  authentication profile, membership, or partner's language.
- The document language attribute and visible translated content update together.
- User-authored content, names, dates, and stored records are not translated or rewritten.
- The selector has an accessible name and selected state, works by keyboard, preserves focus, and
  announces the completed change without relying on color.

## Acceptance Criteria

- A member can select English or Spanish from settings and the completed MVP interface updates
  immediately.
- The selected language remains active after refresh, sign-out, and sign-in on the same browser
  profile.
- A new browser profile uses its preferred Spanish locale when available and otherwise uses English.
- Unsupported or malformed saved values safely produce the English interface.
- One member's selection does not change the partner's interface or any shared data.
- The document language attribute matches the visible interface language.
- The selector remains understandable and operable by keyboard and assistive technology.

## Decision Required

- Decide whether language should become an account-synchronized preference after the MVP.

## Verification Notes

- Test English, Spanish, regional Spanish locales, unsupported locales, malformed saved values, and
  English fallback.
- Test immediate switching, refresh persistence, sign-out and sign-in persistence, and independent
  browser profiles.
- Verify all completed MVP namespaces and hard-coded interface strings are translated.
- Verify keyboard operation, focus preservation, selected state, announcements, and the document
  language attribute.
