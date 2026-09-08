import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260907130000_us029_authenticated_product_rpcs.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ");

const AUTHORITY_PARAMETERS = [
  "p_creator_user_id",
  "p_editor_user_id",
  "p_actor_user_id",
  "p_author_user_id",
  "p_user_id",
] as const;

const AUTHENTICATED_PRODUCT_RPCS = [
  "reserve_memory_creation_attempt(uuid, text)",
  "stage_memory_photo_variants(uuid, uuid, integer)",
  "mark_memory_photo_uploaded(uuid)",
  "finalize_memory_creation_attempt( uuid, text, text, text, date, text, public.memory_visibility, uuid )",
  "reserve_memory_edit_attempt(uuid, uuid, text, timestamptz)",
  "stage_memory_edit_photo_variants(uuid, uuid, integer)",
  "mark_memory_edit_photo_uploaded(uuid, uuid)",
  "finalize_memory_edit_attempt( uuid, text, text, text, date, text, public.memory_visibility, uuid[], uuid )",
  "place_memory(uuid, public.memory_visibility, timestamptz)",
  "delete_memory(text, timestamptz)",
  "create_memory_comment(uuid, uuid, text, text)",
  "update_memory_comment(uuid, uuid, integer, text)",
  "delete_memory_comment(uuid, uuid, integer)",
  "get_memory_reaction_summary(uuid)",
  "toggle_memory_reaction(uuid, text)",
] as const;

describe("authenticated product RPC migration", () => {
  it("derives product authority from the authenticated session", () => {
    expect(migration).toContain("member.user_id = (select auth.uid())");
    expect(migration).toContain("v_membership := private.active_membership()");
    for (const parameter of AUTHORITY_PARAMETERS) {
      expect(migration).not.toContain(parameter);
    }
  });

  it("grants only the authenticated product signatures", () => {
    for (const signature of AUTHENTICATED_PRODUCT_RPCS) {
      expect(normalizedMigration).toContain(
        `grant execute on function public.${signature} to authenticated`,
      );
    }
  });
});
