## MODIFIED Requirements

### Requirement: Authorized private cover delivery
The system SHALL resolve an opaque same-origin cover media URL only after establishing that the parent Vault
memory is available to the requesting active-space member. Every media request MUST reauthorize the parent
memory before returning bytes. The browser MUST NOT receive or derive a Storage object path, signed Storage
credential, or redirect to a Storage URL. An absent or unavailable authorized media response MUST produce the
accessible card fallback and MUST NOT exclude an otherwise available memory.

#### Scenario: Authorized Vault cover resolves
- **WHEN** an authorized Vault read includes an eligible memory with a resolvable cover photo
- **THEN** the card requests its opaque media URL and receives bytes only after current authorization succeeds

#### Scenario: Vault cover is absent or cannot be delivered
- **WHEN** an eligible Vault memory has no cover photo or its authorized media response is unavailable
- **THEN** the response exposes no Storage authority and the card displays the accessible fallback
