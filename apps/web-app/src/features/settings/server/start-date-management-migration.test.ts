import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/20260905170000_start_date_management.sql"),
  "utf8",
);

describe("start-date management migration security contract", () => {
  it("accepts only a date, timezone, and shared revision from authenticated callers", () => {
    expect(migration).toContain("function public.update_active_space_start_date(");
    expect(migration).toContain("p_start_date text");
    expect(migration).toContain("p_timezone text");
    expect(migration).toContain("p_expected_updated_at timestamptz");
    expect(migration).not.toContain("p_space_id");
    expect(migration).not.toContain("p_user_id");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("to authenticated");
  });

  it("derives membership, validates calendar boundaries, and locks before stale checks", () => {
    expect(migration).toContain("member.user_id = current_user_id");
    expect(migration).toContain("for update of space");
    expect(migration).toContain("clock_timestamp() at time zone p_timezone");
    expect(migration).toContain("p_start_date !~ '^\\d{4}-\\d{2}-\\d{2}$'");
    expect(migration).toContain("matching_space.updated_at <> p_expected_updated_at");
    expect(migration).toContain("'status', 'updated'");
    expect(migration).toContain("'status', 'conflict'");
    expect(migration).toContain("'status', 'invalid'");
    expect(migration).toContain("'status', 'unavailable'");
  });
});
