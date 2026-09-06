## Purpose

Let each browser profile choose and retain a supported Leonly interface language without changing
shared data or another member's experience.

## ADDED Requirements

### Requirement: Deterministic language resolution
The system SHALL support only the `en` and `es` interface language codes. An exact supported
device-local selection MUST take priority over browser preferences. Without a saved selection, any
Spanish browser locale MUST resolve to `es`, and every other browser locale MUST resolve to `en`.
An unsupported or malformed saved value MUST resolve to `en` rather than being interpreted as a
regional locale.

#### Scenario: Exact saved selection overrides the browser
- **WHEN** the current browser profile stores `en` or `es` and its preferred browser language differs
- **THEN** the system uses the exact saved language

#### Scenario: New profile prefers regional Spanish
- **WHEN** no language is saved and the browser preferences include a Spanish locale such as `es-MX`
- **THEN** the system uses Spanish

#### Scenario: New profile does not prefer Spanish
- **WHEN** no language is saved and the browser preferences contain no Spanish locale
- **THEN** the system uses English

#### Scenario: Saved value is unsupported or malformed
- **WHEN** the browser profile contains a saved value other than the exact `en` or `es` codes
- **THEN** the system uses English without exposing an initialization failure

### Requirement: Immediate device-local language changes
The system SHALL apply an explicit English or Spanish selection immediately to every completed MVP
interface surface in the current browser profile. It MUST persist the selection across refresh,
sign-out, and later sign-in on that profile, and MUST NOT write language data to the account,
membership, active space, authored content, or any other shared record.

#### Scenario: Member changes the interface language
- **WHEN** an active member selects a supported language in Settings
- **THEN** visible completed-MVP interface copy changes without navigation or reauthentication and
  the choice is saved on the current browser profile

#### Scenario: Member returns after refresh or authentication changes
- **WHEN** a member refreshes, signs out, or later signs in on the same browser profile
- **THEN** the explicitly selected language remains active

#### Scenario: Partner uses a different browser profile
- **WHEN** one member changes the language on their browser profile
- **THEN** the partner's language and all persisted product data remain unchanged

#### Scenario: User-authored values are displayed after switching
- **WHEN** the interface language changes while names, dates, comments, or memories are visible
- **THEN** interface labels and locale-sensitive formatting update while user-authored and stored
  values are not translated or rewritten

### Requirement: Loading-safe language synchronization
The system SHALL resolve the initial browser language without rendering completed application content
in a language that disagrees with the active translation state. The visible interface language and
the document `lang` attribute MUST identify the same supported language after initialization and after
every language change.

#### Scenario: Persisted language is resolved during startup
- **WHEN** browser-only language preferences become available after hydration
- **THEN** the system completes language initialization before presenting language-dependent content

#### Scenario: Language changes successfully
- **WHEN** the active language changes from English to Spanish or Spanish to English
- **THEN** translated content and the document `lang` attribute reflect the selected language together

### Requirement: Accessible language selection
The system SHALL expose the supported languages through a clearly named, keyboard-operable control
with a programmatically determinable selected state. A completed change MUST preserve useful focus
and announce the newly active language without relying on color, motion, or icons.

#### Scenario: Keyboard member selects a language
- **WHEN** a member focuses the language selector and chooses English or Spanish with the keyboard
- **THEN** the chosen option becomes selected, focus remains within the language control, and the
  completed change is announced

#### Scenario: Assistive technology identifies the current language
- **WHEN** a member inspects the language selector with assistive technology
- **THEN** the control exposes its accessible name, both supported options, and exactly one selected
  option
