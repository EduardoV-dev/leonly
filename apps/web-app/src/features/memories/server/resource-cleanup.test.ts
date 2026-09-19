import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { cleanupResources, reapExpiredTemporaryMemoryObjects } from "./resource-cleanup";

describe("cleanupResources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks the service role to enqueue a bounded batch of expired temporary objects", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createAdminClientMock.mockReturnValue({ rpc });

    await reapExpiredTemporaryMemoryObjects();

    expect(rpc).toHaveBeenCalledWith("enqueue_expired_temporary_memory_objects", {
      p_batch_size: 100,
    });
  });

  it("surfaces a reaper RPC failure to the scheduled route", async () => {
    const error = new Error("database unavailable");
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error }),
    });

    await expect(reapExpiredTemporaryMemoryObjects()).rejects.toThrow(
      "Failed to enqueue expired temporary memory objects.",
    );
  });

  it("claims a bounded batch, removes storage objects, and completes their cleanup", async () => {
    const resources = [
      { id: 1, resource_kind: "storage_object", resource_locator: "private/original" },
      { id: 2, resource_kind: "storage_object", resource_locator: "private/cover.webp" },
    ];
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: resources, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    });

    await cleanupResources();

    expect(rpc).toHaveBeenNthCalledWith(1, "claim_resource_cleanup", { p_batch_size: 100 });
    expect(remove).toHaveBeenCalledWith(["private/original", "private/cover.webp"]);
    expect(rpc).toHaveBeenLastCalledWith("complete_resource_cleanup", { p_ids: [1, 2] });
  });

  it("surfaces a claim RPC failure to the scheduled route", async () => {
    const error = new Error("database unavailable");
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error }),
    });

    await expect(cleanupResources()).rejects.toThrow("Failed to claim resources for cleanup.");
  });

  it("records a retry when storage deletion fails", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 1, resource_kind: "storage_object", resource_locator: "private/original" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    const remove = vi.fn().mockResolvedValue({ error: new Error("storage unavailable") });
    createAdminClientMock.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    });

    await cleanupResources();

    expect(rpc).toHaveBeenLastCalledWith("fail_resource_cleanup", {
      p_failure_code: "storage_delete_failed",
      p_ids: [1],
    });
  });
});
