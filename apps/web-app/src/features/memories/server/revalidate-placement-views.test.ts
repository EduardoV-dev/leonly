import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePlacementViews } from "./revalidate-placement-views";

const mocks = vi.hoisted(() => ({ getDetail: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("./get-current-memory-detail", () => ({ getCurrentMemoryDetail: mocks.getDetail }));

describe("revalidatePlacementViews", () => {
  beforeEach(() => vi.resetAllMocks());

  it("refreshes affected routes after an authorized destination read", async () => {
    mocks.getDetail.mockResolvedValueOnce({ id: "memory-id" });
    await revalidatePlacementViews({ memoryId: "memory-id", visibility: "vault" });
    expect(mocks.getDetail).toHaveBeenCalledWith({ memoryId: "memory-id", visibility: "vault" });
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/",
      "/timeline",
      "/vault",
      "/memories/memory-id",
      "/vault/memory-id",
    ]);
  });

  it("does not invalidate paths for an unavailable memory", async () => {
    mocks.getDetail.mockResolvedValueOnce(null);
    await expect(
      revalidatePlacementViews({ memoryId: "memory-id", visibility: "vault" }),
    ).rejects.toThrow("Memory unavailable.");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
