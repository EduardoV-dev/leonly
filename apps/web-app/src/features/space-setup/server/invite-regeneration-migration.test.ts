import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260905070000_partner_invite_management.sql"),
  "utf8",
);

describe("invite regeneration migration security contract", () => {
  it("derives authorization from the authenticated user and exposes no resource argument", () => {
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("function public.regenerate_space_invite()");
    expect(migration).not.toContain("p_space_id");
    expect(migration).not.toContain("p_member_id");
  });

  it("limits requests before reading the active space without granting table access", () => {
    expect(migration).toContain("invite_regeneration_attempt_limits_requested_at_check");
    expect(migration).toContain("check (cardinality(requested_at) <= 5)");
    expect(migration).toContain("if pg_catalog.cardinality(recent_requests) >= 5 then");
    expect(migration).toContain("return pg_catalog.jsonb_build_object('status', 'locked'");
    expect(migration).toContain(
      "revoke all on table public.invite_regeneration_attempt_limits from authenticated",
    );
  });

  it("uses a safe definer configuration and documents all RPC outcomes", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("'status', 'regenerated'");
    expect(migration).toContain("'status', 'joined'");
    expect(migration).toContain("'status', 'unavailable'");
    expect(migration).toContain(
      "grant execute on function public.regenerate_space_invite() to authenticated",
    );
  });
});
