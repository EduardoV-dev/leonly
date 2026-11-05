# Spec Delta

## ADDED Requirements

### Requirement: New-backend recent-memory summary
The dashboard SHALL obtain recent memories through the authenticated Timeline list endpoint with
the existing four-item recent-memory limit and newest-first ordering. It SHALL display only eligible
new-backend Timeline memories in the active space, omit comments and reactions, and use the same
five-minute signed cover URLs and accessible fallback as the full Timeline. It MUST NOT read legacy
Supabase memories or fabricate summary records.

#### Scenario: Eligible new-backend memories exist
- **WHEN** an active member opens a dashboard with more than four eligible Timeline memories
- **THEN** the recent-memory section displays the newest four in deterministic order without social metadata

#### Scenario: Only Vault, deleted, other-space, or legacy records exist
- **WHEN** no eligible new-backend Timeline memories exist for the active space
- **THEN** the recent-memory section displays its existing empty state without a Supabase fallback

#### Scenario: Recent-memory request fails
- **WHEN** the recent-memory endpoint fails
- **THEN** the section preserves its loading/error/retry behavior and does not substitute sample or legacy records

#### Scenario: Recent memory has no ready cover
- **WHEN** an eligible recent memory has no ready cover or its authorized image cannot be delivered
- **THEN** the memory remains visible with the existing accessible cover fallback

#### Scenario: Recent-memory cover is ready
- **WHEN** the recent-memory response includes a ready cover
- **THEN** the browser requests its signed storage URL directly without the legacy image route or a new application image endpoint
