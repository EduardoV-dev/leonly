import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260905160000_space_name_management.sql"),
  "utf8",
);

describe("space-name management migration security contract", () => {
  it("extends Settings with an opaque revision while preserving membership-derived reads", () => {
    expect(migration).toContain("'updated_at', space.updated_at");
    expect(migration).toContain("current_member.user_id = auth.uid()");
    expect(migration).not.toContain("p_space_id");
    expect(migration).not.toContain("p_member_id");
    expect(migration).not.toContain("p_user_id");
  });

  it("limits the rename RPC to authenticated callers with a safe definer configuration", () => {
    expect(migration).toContain("function public.rename_active_space(");
    expect(migration).toContain("p_name text");
    expect(migration).toContain("p_expected_updated_at timestamptz");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "revoke execute on function public.rename_active_space(text, timestamptz) from public",
    );
    expect(migration).toContain(
      "revoke execute on function public.rename_active_space(text, timestamptz) from anon",
    );
    expect(migration).toContain(
      "grant execute on function public.rename_active_space(text, timestamptz) to authenticated",
    );
  });

  it("uses equal-member authorization, validation, and an atomic stale revision outcome", () => {
    expect(migration).toContain("member.user_id = current_user_id");
    expect(migration).toContain("normalized_name text := pg_catalog.btrim(p_name)");
    expect(migration).toContain("pg_catalog.char_length(normalized_name) < 2");
    expect(migration).toContain("pg_catalog.char_length(normalized_name) > 100");
    expect(migration).toContain("for update of space");
    expect(migration).toContain("matching_space.updated_at <> p_expected_updated_at");
    expect(migration).toContain("'status', 'updated'");
    expect(migration).toContain("'status', 'conflict'");
    expect(migration).toContain("'status', 'invalid'");
    expect(migration).toContain("'status', 'unavailable'");
  });
});
