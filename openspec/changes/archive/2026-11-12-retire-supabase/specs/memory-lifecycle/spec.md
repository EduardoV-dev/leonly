# Spec Delta

## MODIFIED Requirements

### Requirement: Use UUID identifiers at application boundaries

The system SHALL use UUID identifiers for spaces, memberships, file uploads, memories, memory assets, object metadata, and outbox events. User references MUST retain the existing API authentication identity type rather than introduce a new user identity mapping for creation. Generic outbox aggregate IDs SHALL be capable of representing non-UUID identifiers. Supabase RPC identifier contracts SHALL NOT govern current API endpoints, and legacy lookup RPC compatibility SHALL no longer be supported.

#### Scenario: RPC receives a memory identifier
- **WHEN** a legacy caller attempts a Supabase memory lookup after application retirement
- **THEN** the application provides no legacy RPC adapter or compatibility guarantee and does not route that lookup to current-backend records

#### Scenario: API receives memory-domain identifiers
- **WHEN** upload or memory creation receives upload, cover, or idempotency identifiers
- **THEN** those identifiers are validated as UUID strings while the user identity is derived from the existing authenticated session
