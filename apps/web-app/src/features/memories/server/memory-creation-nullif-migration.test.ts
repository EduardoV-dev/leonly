import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260907200000_fix_memory_creation_nullif.sql"),
  "utf8",
);

describe("memory creation nullif migration", () => {
  it("replaces the authenticated finalization RPC without schema-qualifying NULLIF", () => {
    expect(migration).toContain(
      "create or replace function public.finalize_memory_creation_attempt(",
    );
    expect(migration).toContain("nullif(pg_catalog.btrim(p_description), '')");
    expect(migration).toContain("nullif(pg_catalog.btrim(p_location), '')");
    expect(migration).not.toContain("pg_catalog.nullif");
    expect(migration).toContain("set search_path = ''");
  });
});
