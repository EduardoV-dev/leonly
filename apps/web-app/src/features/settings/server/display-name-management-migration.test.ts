import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260905180000_display_name_management.sql"),
  "utf8",
);

describe("display-name management migration security contract", () => {
  it("extends each active member with its revision without exposing identity arguments", () => {
    expect(migration).toContain("function public.get_active_space_settings()");
    expect(migration).toContain("'updated_at', member.updated_at");
    expect(migration).toContain("current_member.user_id = auth.uid()");
    expect(migration).not.toContain("p_membership_id");
    expect(migration).not.toContain("p_user_id");
    expect(migration).not.toContain("p_space_id");
  });

  it("restricts the identity-free mutation to authenticated callers", () => {
    expect(migration).toContain("function public.update_active_membership_display_name(");
    expect(migration).toContain("p_display_name text");
    expect(migration).toContain("p_expected_updated_at timestamptz");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "revoke execute on function public.update_active_membership_display_name(text, timestamptz) from public",
    );
    expect(migration).toContain(
      "revoke execute on function public.update_active_membership_display_name(text, timestamptz) from anon",
    );
    expect(migration).toContain(
      "grant execute on function public.update_active_membership_display_name(text, timestamptz) to authenticated",
    );
  });

  it("validates, locks, rechecks availability, and compares the member revision", () => {
    expect(migration).toContain("normalized_display_name text := pg_catalog.btrim(p_display_name)");
    expect(migration).toContain("pg_catalog.char_length(normalized_display_name) < 2");
    expect(migration).toContain("pg_catalog.char_length(normalized_display_name) > 100");
    expect(migration).toContain("member.user_id = current_user_id");
    expect(migration).toContain("for update of member");
    expect(migration).toContain("if not exists (");
    expect(migration).toContain("matching_membership.updated_at <> p_expected_updated_at");
    expect(migration).toContain("set display_name = normalized_display_name");
    expect(migration).toContain("'status', 'updated'");
    expect(migration).toContain("'status', 'conflict'");
    expect(migration).toContain("'status', 'invalid'");
    expect(migration).toContain("'status', 'unavailable'");
  });
});
