import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, processAssetsMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  processAssetsMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./process-memory-attempt-assets", () => ({
  processMemoryAttemptAssets: processAssetsMock,
}));

import { finalizeMemoryAttempt, prepareMemoryAttempt } from "./memory-attempt";

const ATTEMPT_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const ASSET_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";
const MEMORY_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";

describe("memory attempt RPC boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prepares the normalized details and complete ordered asset selection", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        attempt_id: ATTEMPT_ID,
        status: "prepared",
        uploads: [{ asset_id: ASSET_ID, object_path: "space/attempt/asset/original" }],
      },
      error: null,
    });
    createClientMock.mockResolvedValue({ rpc });

    await expect(
      prepareMemoryAttempt({
        assets: [{ id: ASSET_ID, isCover: true, isNew: true }],
        attemptType: "create",
        description: null,
        expectedUpdatedAt: null,
        location: null,
        memoryDate: "2020-08-20",
        memoryId: null,
        timezone: "UTC",
        title: "Picnic",
        visibility: "timeline",
      }),
    ).resolves.toEqual({
      attemptId: ATTEMPT_ID,
      uploads: [{ id: ASSET_ID, path: "space/attempt/asset/original" }],
    });
    expect(rpc).toHaveBeenCalledWith(
      "prepare_memory_attempt",
      expect.objectContaining({
        p_assets: [{ asset_id: ASSET_ID, is_cover: true, is_new: true, position: 0 }],
        p_attempt_type: "create",
      }),
    );
  });

  it("processes attempt assets before finalizing by attempt ID", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        memory_id: MEMORY_ID,
        status: "completed",
        updated_at: "2026-08-23T11:00:00.000Z",
        visibility: "vault",
      },
      error: null,
    });
    createClientMock.mockResolvedValue({ rpc });

    await expect(finalizeMemoryAttempt(ATTEMPT_ID)).resolves.toMatchObject({
      id: MEMORY_ID,
      visibility: "vault",
    });
    expect(processAssetsMock).toHaveBeenCalledWith(ATTEMPT_ID);
    expect(rpc).toHaveBeenCalledWith("finalize_memory_attempt", { p_attempt_id: ATTEMPT_ID });
  });
});
