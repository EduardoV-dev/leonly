import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/20260909120000_browser_memory_photo_uploads.sql",
  ),
  "utf8",
);

describe("browser memory photo upload migration", () => {
  it("enforces storage limits independently of browser metadata", () => {
    expect(migration).toContain("file_size_limit = 5242880");
    expect(migration).toContain("'image/jpeg', 'image/png', 'image/webp'");
  });

  it("allows authenticated retry reads only for paths owned by the active staging attempt", () => {
    expect(migration).toContain("for select\nto authenticated");
    expect(migration).toContain("private.can_write_memory_photo_object(name)");
    expect(migration).toContain("bucket_id = 'memory-photos'");
  });
});
