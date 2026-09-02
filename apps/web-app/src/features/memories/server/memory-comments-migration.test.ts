import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260902100000_memory_comments.sql"),
  "utf8",
);
const creationFixMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260902140000_fix_memory_comment_creation.sql",
  ),
  "utf8",
);

describe("memory comments migration security contract", () => {
  it("stores normalized bounded comments with parent-space and retry invariants", () => {
    expect(migration).toContain("create table public.memory_comments");
    expect(migration).toContain("char_length(btrim(body)) between 1 and 1000");
    expect(migration).toContain("foreign key (memory_id, space_id)");
    expect(migration).toContain("unique (author_user_id, idempotency_key)");
    expect(migration).toContain("create index memory_comments_active_history_idx");
    expect(migration).toContain("where deleted_at is null");
  });

  it("keeps reads authenticated through RLS and reserves writes for the service role", () => {
    expect(migration).toContain("alter table public.memory_comments enable row level security");
    expect(migration).toContain("grant select on table public.memory_comments to authenticated");
    expect(migration).toContain(
      "revoke all on table public.memory_comments from public, anon, authenticated",
    );
    expect(migration).toContain("grant execute on function public.create_memory_comment(");
    expect(migration).toContain("to service_role;");
    expect(migration).toContain("perform private.require_service_role()");
    expect(migration).not.toMatch(
      /grant execute on function public\.create_memory_comment\([\s\S]*?to authenticated;/,
    );
  });

  it("revalidates active membership and memory access before inserting", () => {
    expect(migration).toContain("v_space_id := private.available_space_for_user(p_author_user_id)");
    expect(migration).toContain("memory.space_id = v_space_id");
    expect(migration).toContain("memory.deleted_at is null");
    expect(creationFixMigration).toContain(
      "on conflict on constraint memory_comments_author_key_unique do nothing",
    );
    expect(creationFixMigration).not.toContain(
      "on conflict (author_user_id, idempotency_key) do nothing",
    );
    expect(migration).toContain(
      "v_existing.request_fingerprint <> pg_catalog.btrim(p_request_fingerprint)",
    );
    expect(migration).toContain("p_author_user_id");
    expect(migration).toContain("p_memory_id");
    expect(migration).toContain("memory_comments.memory_id");
  });

  it("excludes deleted comments and resolves the current membership name", () => {
    expect(migration).toContain("deleted_at is null");
    expect(migration).toContain("member.display_name");
    expect(migration).toContain("member.user_id = v_comment.author_user_id");
    expect(migration).toContain("'completed'::text");
    expect(migration).toContain("v_existing.deleted_at is not null");
    expect(migration).toContain("v_comment := v_existing");
  });
});
