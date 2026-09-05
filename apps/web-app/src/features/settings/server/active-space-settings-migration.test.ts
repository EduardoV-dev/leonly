import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260904190000_active_space_settings.sql"),
  "utf8",
);

describe("active-space Settings migration security contract", () => {
  it("derives the active space from auth and accepts no resource arguments", () => {
    expect(migration).toContain("function public.get_active_space_settings()");
    expect(migration).toContain("current_member.user_id = auth.uid()");
    expect(migration).not.toContain("p_space_id");
    expect(migration).not.toContain("p_user_id");
  });

  it("uses a safe security-definer configuration and authenticated-only execution", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "revoke execute on function public.get_active_space_settings() from public",
    );
    expect(migration).toContain(
      "revoke execute on function public.get_active_space_settings() from anon",
    );
    expect(migration).toContain(
      "grant execute on function public.get_active_space_settings() to authenticated",
    );
  });

  it("returns only narrow member identity and availability fields", () => {
    expect(migration).toContain("'membership_id', member.id");
    expect(migration).not.toContain("'user_id', member.user_id");
    expect(migration).toContain("'created_at', member.created_at");
    expect(migration).toContain("'is_current_member', member.id = current_member.id");
    expect(migration).toContain("'invite_code_is_available'");
    expect(migration).toContain("when active_members.member_count = 1 then space.invite_code");
  });
});
