# Spec Delta

## MODIFIED Requirements

### Requirement: Detail extension regions respect visibility

Timeline and Vault detail screens SHALL enable reactions for authorized memories. They MUST NOT render or mount edit, delete, move, restore, or comment controls or empty placeholders for those unsupported actions, and MUST NOT issue associated requests. The screens SHALL preserve gallery navigation, related-memory links, and contextual back navigation.

#### Scenario: Timeline memory detail is composed

- **WHEN** the detail view renders a timeline memory
- **THEN** the reaction control is available, unsupported controls and comment sections are absent, and no unsupported action requests are issued

#### Scenario: Vault memory detail is composed

- **WHEN** the detail view renders a Vault memory
- **THEN** the reaction control is available, unsupported controls and comment sections are absent, and no unsupported action requests are issued

### Requirement: Detail reaction summary and controls

Timeline and Vault detail screens SHALL display the current-backend reaction summary from the initial authorized detail response and mount the existing reaction control. The control SHALL show counts and the caller's selection, expose current reacting member names, and support adding, replacing, and removing reactions through the current backend. Initial rendering MUST NOT require a separate browser summary request.

#### Scenario: Timeline detail shows reactions

- **WHEN** an active member opens Timeline detail
- **THEN** the reaction control displays the summary from the detail response without a Supabase request or an additional initial browser summary request

#### Scenario: Vault detail shows reactions

- **WHEN** an active member opens Vault detail
- **THEN** the reaction control displays the summary from the detail response without changing memory visibility or querying Supabase

#### Scenario: Member reacts from detail

- **WHEN** an active member selects a reaction on either detail screen
- **THEN** the control sends the toggle to the current backend, gives optimistic feedback, and reconciles selection, counts, and member names with the authoritative summary

#### Scenario: Reaction cannot be confirmed

- **WHEN** a reaction request fails while the memory remains available
- **THEN** the interface restores confirmed state, announces a retryable failure, and attempts to refresh the authoritative summary without automatically repeating the toggle

#### Scenario: Memory becomes unavailable

- **WHEN** a reaction request reports that the memory is no longer available
- **THEN** the screen refreshes its authorization and transitions to the generic memory not-found experience without retaining stale reaction data
