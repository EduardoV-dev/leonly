import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260902210000_memory_reactions.sql"),
  "utf8",
);
const membersMigration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260903095000_memory_reaction_members.sql"),
  "utf8",
);

describe("memory reactions migration security contract", () => {
  it("stores one supported reaction for each membership and memory", () => {
    expect(migration).toContain("create table public.memory_reactions");
    expect(migration).toContain("membership_id uuid not null references public.space_members(id)");
    expect(migration).toContain("memory_id uuid not null references public.memories(id)");
    expect(migration).toContain("reaction_type in ('heart', 'laugh', 'cry', 'star')");
    expect(migration).toContain("unique (membership_id, memory_id)");
  });

  it("keeps direct access private and RPC execution service-role-only", () => {
    expect(migration).toContain("alter table public.memory_reactions enable row level security");
    expect(migration).toContain(
      "revoke all on table public.memory_reactions from public, anon, authenticated",
    );
    expect(migration).toContain("perform private.require_service_role()");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("grant execute on function public.toggle_memory_reaction");
    expect(migration).toContain("to service_role;");
    expect(migration).not.toMatch(
      /grant execute on function public\.toggle_memory_reaction\([\s\S]*?to authenticated;/,
    );
  });

  it("derives active membership and available target state inside both summaries", () => {
    expect(migration).toContain("member.user_id = p_user_id");
    expect(migration).toContain("member.deleted_at is null");
    expect(migration).toContain("memory.space_id = v_membership.space_id");
    expect(migration).toContain("memory.deleted_at is null");
    expect(migration).toContain("'unavailable'::text");
  });

  it("atomically adds, changes, removes, and aggregates current reaction rows", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("if v_reaction.reaction_type = p_reaction_type then");
    expect(migration).toContain("delete from public.memory_reactions");
    expect(migration).toContain("set reaction_type = p_reaction_type");
    expect(migration).toContain("on conflict (membership_id, memory_id) do nothing");
    expect(migration).toContain("count(*) filter (where reaction.reaction_type = 'heart')");
    expect(migration).toContain("count(*) filter (where reaction.reaction_type = 'laugh')");
    expect(migration).toContain("count(*) filter (where reaction.reaction_type = 'cry')");
    expect(migration).toContain("count(*) filter (where reaction.reaction_type = 'star')");
    expect(membersMigration).toContain("reaction_members jsonb");
    expect(membersMigration).toContain(
      "jsonb_agg(member.display_name order by member.display_name)",
    );
    expect(membersMigration).toContain("inner join public.space_members as member");
  });
});
