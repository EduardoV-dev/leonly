import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260901130000_memory_editing.sql"),
  "utf8",
);

describe("memory editing migration security contract", () => {
  it("keeps edit persistence private and every mutation RPC service-role only", () => {
    expect(migration).toContain(
      "revoke all on table public.memory_edit_attempts from public, anon, authenticated",
    );
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("perform private.require_service_role()");
    expect(migration).toContain("grant execute on function public.finalize_memory_edit_attempt(");
    expect(migration).not.toMatch(/to authenticated;\s*$/m);
  });

  it("locks and version-checks before replacing photo membership atomically", () => {
    const lockIndex = migration.indexOf(
      "for update;",
      migration.indexOf("finalize_memory_edit_attempt"),
    );
    const versionIndex = migration.indexOf(
      "v_memory.updated_at <> v_attempt.expected_updated_at",
      lockIndex,
    );
    const deleteIndex = migration.indexOf("delete from public.memory_photos", versionIndex);
    const completedIndex = migration.indexOf("status = 'completed'", deleteIndex);

    expect(lockIndex).toBeGreaterThan(0);
    expect(versionIndex).toBeGreaterThan(lockIndex);
    expect(deleteIndex).toBeGreaterThan(versionIndex);
    expect(completedIndex).toBeGreaterThan(deleteIndex);
  });

  it("protects committed replacements while durably tracking old and failed objects", () => {
    expect(migration).toContain("create table public.memory_photo_cleanup");
    expect(migration).toContain("create index memory_photo_cleanup_pending_idx");
    expect(migration).toContain("attempt.status = 'failed'");
    expect(migration).toContain("list_stale_memory_edit_staging");
    expect(migration).toContain("list_memory_photo_cleanup");
  });

  it("gives only the inserted reservation ownership of a concurrent attempt", () => {
    expect(migration).toContain("get diagnostics v_inserted_count = row_count");
    expect(migration).toContain(
      "return query select v_attempt.id, v_is_new, v_attempt.memory_id, v_attempt.outcome",
    );
    expect(migration).toContain("where staging.attempt_id = v_attempt.id");
  });

  it("revalidates membership and never lists a currently referenced object for cleanup", () => {
    expect(migration).toContain(
      "private.available_space_for_user(v_attempt.editor_user_id) is distinct from v_attempt.space_id",
    );
    expect(migration).toContain("create unique index memory_photos_object_path_unique");
    expect(migration).toContain("where cleanup.object_path in (");
  });
});
