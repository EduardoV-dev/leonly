import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260915000000_database_schema.sql"),
  "utf8",
);

const expectedTables = [
  "users",
  "spaces",
  "space_members",
  "rate_limits",
  "memories",
  "memory_attempts",
  "memory_assets",
  "memory_asset_objects",
  "memory_attempt_assets",
  "memory_comments",
  "memory_reactions",
  "resource_cleanup",
] as const;

const expectedEnums = [
  "space_member_role",
  "memory_visibility",
  "memory_attempt_type",
  "memory_attempt_status",
  "memory_asset_type",
  "memory_asset_variant_type",
  "memory_asset_object_status",
] as const;

describe("Supabase baseline migration", () => {
  it("defines only the accepted schema and ownership constraints", () => {
    for (const table of expectedTables) {
      expect(migration).toContain(`create table public.${table} (`);
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    for (const type of expectedEnums) {
      expect(migration).toContain(`create type public.${type} as enum`);
    }

    expect(migration).toContain("foreign key (creator_membership_id, creator_user_id, space_id)");
    expect(migration).toContain("foreign key (actor_membership_id, actor_user_id, space_id)");
    expect(migration).toContain("foreign key (author_membership_id, author_user_id, space_id)");
    expect(migration).toContain("constraint memory_assets_owner_xor");
    expect(migration).toContain("create unique index space_members_active_space_role_unique");
    expect(migration).toContain("create unique index memory_attempt_assets_one_cover");
    expect(migration).toContain(
      "create trigger memory_comments_updated_at before update on public.memory_comments",
    );

    for (const obsoleteTable of [
      "join_attempt_limits",
      "invite_regeneration_attempt_limits",
      "memory_creation_attempts",
      "memory_edit_attempts",
      "memory_photos",
      "memory_photo_staging",
      "memory_edit_photo_staging",
      "memory_photo_cleanup",
    ]) {
      expect(migration).not.toContain(`create table public.${obsoleteTable}`);
    }
  });

  it("locks security-definer functions to authenticated identity and least privilege", () => {
    const securityDefinerFunctions = migration.match(
      /create(?: or replace)? function[\s\S]*?security definer[\s\S]*?\$\$;/g,
    );
    expect(securityDefinerFunctions?.length).toBeGreaterThan(0);
    for (const definition of securityDefinerFunctions ?? []) {
      expect(definition).toContain("set search_path = ''");
    }

    expect(migration).toContain("profile.auth_subject = (select auth.uid())::text");
    expect(migration).not.toMatch(/auth\.uid\(\)\s*=\s*(?:\w+\.)?(?:id|user_id)/);
    expect(migration).toContain("revoke all on all tables in schema public");
    expect(migration).toContain("grant select on public.users to authenticated;");
    expect(migration).not.toContain(
      "grant select, insert, update on public.users to authenticated;",
    );
    expect(migration).not.toContain("create policy users_insert on public.users");
    expect(migration).not.toContain("create policy users_update on public.users");
    expect(migration).toContain("grant usage on schema public to authenticated;");
    expect(migration).toContain("grant usage on schema private to authenticated;");
    expect(migration).toContain(
      "grant execute on function private.current_user_id(), private.is_active_space_member(uuid),",
    );
    expect(migration).toContain("create function public.sync_current_user(");
    expect(migration).toContain("subject text := (select auth.uid())::text;");
    expect(migration).toContain(
      "grant execute on function public.sync_current_user(text, text, text),",
    );
    expect(migration).toContain(
      "private.can_view_profile(uuid), private.can_access_memory_asset_object(text, boolean)",
    );
    expect(migration).toContain("public.claim_resource_cleanup(integer)");
    expect(migration).toMatch(/public\.fail_resource_cleanup[\s\S]*to service_role;/);
  });

  it("uses exact asset paths, unified attempts, cleanup leases, and comment-only idempotency", () => {
    expect(migration).toContain("object.object_path = p_object_path");
    expect(migration).toContain("bucket_id = 'memory-photos'");
    expect(migration).toContain("file_size_limit = excluded.file_size_limit");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain(
      "locked_until = pg_catalog.clock_timestamp() + interval '2 minutes'",
    );
    expect(migration).toContain("create function public.prepare_memory_attempt(");
    expect(migration).toContain("create function public.finalize_memory_attempt(");

    const attemptsTable = migration.slice(
      migration.indexOf("create table public.memory_attempts"),
      migration.indexOf("create table public.memory_assets"),
    );
    expect(attemptsTable).not.toContain("idempotency_key");
    expect(attemptsTable).not.toContain("request_fingerprint");
    expect(migration).toContain("memory_comments_author_key_unique");
    expect(migration).toContain("request_fingerprint text not null");
  });
});
