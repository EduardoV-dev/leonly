## MODIFIED Requirements

### Requirement: Deterministic private photo presentation
The system SHALL present every available photo belonging to the authorized memory. When a selected cover
exists, it MUST appear first; all remaining photos MUST follow by persisted position ascending while keeping
their relative order. Each photo MUST use an opaque same-origin media URL whose every request reauthorizes the
parent memory before returning bytes. The browser MUST NOT receive or accept an object path, signed Storage
credential, redirect, or client-supplied identity as authority. Missing photos and unavailable media responses
MUST use an accessible fallback without exposing Storage metadata or preventing other available photos from
being viewed.

#### Scenario: Selected cover is not the first persisted photo
- **WHEN** an authorized memory's selected cover has a later persisted position
- **THEN** the gallery shows that cover first and every other photo in persisted-position order

#### Scenario: Memory has no photos
- **WHEN** an authorized memory has no available photo metadata
- **THEN** the detail view shows a valid accessible no-photo presentation

#### Scenario: One photo response is unavailable
- **WHEN** one authorized photo cannot deliver bytes through its reauthorizing media URL
- **THEN** that photo position shows an accessible fallback while the remaining available photos stay usable

### Requirement: Detail loading and recoverable failure feedback
The system SHALL provide a dedicated loading presentation while authorized detail is pending. A read failure
that is not an unavailable outcome MUST render a retryable error, MUST NOT display stale detail as current,
and MUST preserve the requested route for retry. Retrying or directly refreshing an authorized detail URL
SHALL resolve access again and issue current opaque photo media URLs. Realtime partner updates are not
required.

#### Scenario: Initial detail read is pending
- **WHEN** an authorized memory detail read has not completed
- **THEN** the route shows a detail-shaped loading presentation without fabricated memory content

#### Scenario: Detail read fails
- **WHEN** an authorized detail read fails for a reason other than an unavailable memory
- **THEN** the route shows no stale detail and provides an accessible retry action

#### Scenario: Authorized detail route is refreshed
- **WHEN** a member directly refreshes or retries an authorized memory detail URL
- **THEN** the system resolves authorization again and renders current detail with reauthorizing photo media
  URLs
