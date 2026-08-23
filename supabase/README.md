# Supabase Schema

`migrations/` is the only database source of truth. A clean local database is reproduced by applying
`20260728000000_baseline.sql`; do not apply SQL from any other directory or the Supabase SQL editor.

## Local Reset

The committed `config.toml` lets the Supabase CLI discover this project. With the local Supabase stack
running, reset and replay the baseline with:

```bash
supabase db reset
```

This reset is local-only and intentionally has no seed data.

## Existing Environments Cutover

The baseline must not be executed against an existing populated environment. The database operator must:

1. Back up the database and verify the current schema, functions, RLS policies, grants, and migration ledger.
2. Reconcile the environment's migration ledger to remove the legacy versions and mark
   `20260728000000` as applied without executing it against existing data.
3. Verify the reconciled ledger and schema, then test `supabase db reset` against a clean local environment.

This repository change does not execute or deploy the cutover. The operator owns backup, ledger
reconciliation, and verification for every existing environment.
