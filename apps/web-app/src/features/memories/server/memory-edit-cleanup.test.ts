import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { cleanupMemoryEditAttempt, cleanupStaleMemoryEdits } from "./memory-edit-cleanup";

function client(rpc: ReturnType<typeof vi.fn>, remove: ReturnType<typeof vi.fn>) {
  return { rpc, storage: { from: vi.fn(() => ({ remove })) } };
}

describe("memory edit cleanup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes failed staged objects and durably marks only successful deletion", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ object_path: "private/original" }, { object_path: "private/cover.webp" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue(client(rpc, remove));

    await cleanupMemoryEditAttempt("attempt-id");

    expect(remove).toHaveBeenCalledWith(["private/original", "private/cover.webp"]);
    expect(rpc).toHaveBeenLastCalledWith("mark_memory_edit_staging_cleaned", {
      p_object_paths: ["private/original", "private/cover.webp"],
    });
  });

  it("leaves durable cleanup pending when Storage deletion fails", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({
      data: [{ object_path: "private/original" }],
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: new Error("storage unavailable") });
    createAdminClientMock.mockReturnValue(client(rpc, remove));

    await cleanupMemoryEditAttempt("attempt-id");

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).not.toHaveBeenCalledWith("mark_memory_edit_staging_cleaned", expect.anything());
  });

  it("reconciles both stale replacements and inaccessible removed-photo objects", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "list_stale_memory_edit_staging") {
        return { data: [{ object_path: "private/staged" }], error: null };
      }
      if (name === "list_memory_photo_cleanup") {
        return { data: [{ object_path: "private/removed" }], error: null };
      }
      return { data: null, error: null };
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue(client(rpc, remove));

    await cleanupStaleMemoryEdits();

    expect(remove).toHaveBeenCalledWith(["private/staged"]);
    expect(remove).toHaveBeenCalledWith(["private/removed"]);
    expect(rpc).toHaveBeenCalledWith("mark_memory_edit_staging_cleaned", {
      p_object_paths: ["private/staged"],
    });
    expect(rpc).toHaveBeenCalledWith("mark_memory_photo_cleanup_completed", {
      p_object_paths: ["private/removed"],
    });
  });

  it("removes and marks Storage objects in supported batches", async () => {
    const paths = Array.from({ length: 1001 }, (_, index) => ({
      object_path: `private/path-${index}`,
    }));
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: paths, error: null })
      .mockResolvedValue({ data: null, error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue(client(rpc, remove));

    await cleanupMemoryEditAttempt("attempt-id");

    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls[0]?.[0]).toHaveLength(1000);
    expect(remove.mock.calls[1]?.[0]).toEqual(["private/path-1000"]);
    expect(rpc).toHaveBeenLastCalledWith("mark_memory_edit_staging_cleaned", {
      p_object_paths: ["private/path-1000"],
    });
  });
});
