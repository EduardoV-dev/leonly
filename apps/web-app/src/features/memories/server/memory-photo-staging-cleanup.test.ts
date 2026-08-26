import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { cleanupMemoryCreationAttempt } from "./memory-photo-staging-cleanup";

describe("cleanupMemoryCreationAttempt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes every staged variant before marking the staging row cleaned", async () => {
    const paths = [
      "space/attempt/photo/original",
      "space/attempt/photo/cover.webp",
      "space/attempt/photo/detail.webp",
    ];
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: paths.map((objectPath) => ({ object_path: objectPath })),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    });

    await cleanupMemoryCreationAttempt("attempt-id");

    expect(remove).toHaveBeenCalledWith(paths);
    expect(rpc).toHaveBeenLastCalledWith("mark_memory_photo_staging_cleaned", {
      p_object_paths: paths,
    });
  });
});
