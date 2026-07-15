# Supabase Schema

To bootstrap a new Supabase project, run these files in the SQL editor in order:

1. `tables/00_shared.sql`
2. `tables/01_users.sql`
3. `tables/02_spaces.sql`
4. `tables/03_space_members.sql`
5. `policies/01_space_access.sql`
6. `functions/01_create_space.sql`
7. `functions/02_get_active_space.sql`

`migrations/` contains the equivalent changes for existing projects. Apply each migration once; do not run both a migration and its matching bootstrap source against an existing project.
