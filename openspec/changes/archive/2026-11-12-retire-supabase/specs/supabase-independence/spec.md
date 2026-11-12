# Spec Delta

## Purpose

Keep supported application journeys independent of Supabase and define the operational boundary
between removing legacy application support and deleting disposable hosted resources.

## ADDED Requirements

### Requirement: Operate without Supabase configuration

The application SHALL build, start, and serve supported journeys without Supabase credentials or
network access when its current-backend dependencies are configured. Authentication, spaces,
memories, comments, reactions, uploads, and image processing MUST NOT fall back to Supabase.

#### Scenario: Supabase configuration is absent
- **WHEN** the web app is built and the application starts with only current-backend configuration
- **THEN** neither build nor startup requires a Supabase URL, publishable key, service-role key, or OAuth configuration

#### Scenario: Members use supported journeys
- **WHEN** users sign in, create or join a space, use onboarding/settings, create/read/edit/place/delete memories, or use comments and reactions
- **THEN** those operations use the current backend without a Supabase request

#### Scenario: Current images are processed
- **WHEN** a current-backend upload is attached and its image event is delivered to the worker
- **THEN** processing and authorized signed reads use current storage without Supabase access

#### Scenario: A current dependency fails
- **WHEN** a current-backend dependency fails during a supported journey
- **THEN** the existing failure contract applies without consulting legacy Supabase data or credentials

### Requirement: Retire legacy data without transfer

Retirement SHALL require no import, export, identity mapping, or backup of legacy Supabase users,
spaces, memories, social data, media, or backups. Legacy-only records MUST NOT become current-backend
records implicitly. This disposition MUST NOT authorize deleting current-backend data or storage.

#### Scenario: Data exists only in Supabase
- **WHEN** the current backend is used after retirement and legacy-only records exist
- **THEN** they remain absent from current journeys and do not block retirement

#### Scenario: An operator removes legacy resources
- **WHEN** the disposable Supabase project and its objects are removed after shutdown gates pass
- **THEN** current database records, private objects, queues, and worker resources are retained

### Requirement: Gate irreversible external shutdown

The retirement runbook SHALL distinguish repository completion from hosted decommissioning. It MUST
require deployment and verification without Supabase, inventory and disablement of legacy external
jobs/integrations, and a recorded rollback decision before credentials are revoked or resources
deleted. Applying repository changes MUST NOT itself delete the hosted project.

#### Scenario: Repository work is complete but deployment is unverified
- **WHEN** source changes pass local checks but deployed journeys or external integrations are unverified
- **THEN** repository work can be recorded as complete while hosted shutdown remains explicitly pending

#### Scenario: Deployment fails before shutdown
- **WHEN** verification fails while legacy credentials and resources are still available
- **THEN** operators can restore the preceding compatible application deployment without importing legacy data or redirecting current records to Supabase

#### Scenario: Shutdown crosses the rollback boundary
- **WHEN** verified retirement proceeds to credential revocation or project deletion
- **THEN** the operator records that rollback to Supabase-dependent releases is no longer supported and recovery must retain Supabase independence

### Requirement: Keep current operational deferrals explicit

Retiring legacy cleanup SHALL NOT imply that current-storage cleanup or unpublished-event recovery
exists. Operational documentation MUST distinguish disabled legacy jobs from current jobs and record
unimplemented current capabilities as separate outstanding work.

#### Scenario: Legacy cleanup is disabled
- **WHEN** a Supabase-only cleanup integration is retired
- **THEN** documentation identifies current cleanup and event-recovery status without claiming equivalent jobs were migrated or verified
