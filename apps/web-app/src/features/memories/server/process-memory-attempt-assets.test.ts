import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createAdminClientMock, createClientMock, validateBytesMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
  validateBytesMock: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("./memory-input-validation", () => ({ validateMemoryPhotoBytes: validateBytesMock }));

import { processMemoryAttemptAssets } from "./process-memory-attempt-assets";

const objects = [
  { id: "original-id", object_path: "original", status: "pending", variant_type: "original" },
  { id: "cover-id", object_path: "cover", status: "pending", variant_type: "cover" },
  { id: "detail-id", object_path: "detail", status: "pending", variant_type: "detail" },
];

describe("processMemoryAttemptAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateBytesMock.mockResolvedValue({
      contentType: "image/png",
      variants: { cover: Buffer.from("cover"), detail: Buffer.from("detail") },
    });
  });

  it("validates the original and records each processing and ready transition", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ id: "asset-id", memory_asset_objects: objects }],
      error: null,
    });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const download = vi.fn().mockResolvedValue({
      data: { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) },
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
      storage: { from: vi.fn(() => ({ download, upload })) },
    });
    const supabase = {
      rpc: vi.fn(function (this: unknown, name: string) {
        if (this !== supabase) throw new Error("RPC receiver was lost");
        return Promise.resolve({
          data: { status: name.replace("mark_memory_asset_object_", "") },
          error: null,
        });
      }),
    };
    createClientMock.mockResolvedValue(supabase);

    await processMemoryAttemptAssets("attempt-id");

    expect(download).toHaveBeenCalledWith("original");
    expect(upload).toHaveBeenCalledTimes(2);
    expect(supabase.rpc.mock.calls.map(([name]) => name)).toEqual([
      "mark_memory_asset_object_processing",
      "mark_memory_asset_object_ready",
      "mark_memory_asset_object_processing",
      "mark_memory_asset_object_ready",
      "mark_memory_asset_object_processing",
      "mark_memory_asset_object_ready",
    ]);
  });

  it("marks the current object failed when variant storage fails", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ id: "asset-id", memory_asset_objects: objects }],
      error: null,
    });
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({
            data: { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) },
          }),
          upload: vi.fn().mockResolvedValue({ error: new Error("storage failed") }),
        })),
      },
    });
    const rpc = vi.fn(async (name: string) => ({
      data: { status: name.replace("mark_memory_asset_object_", "") },
      error: null,
    }));
    createClientMock.mockResolvedValue({ rpc });

    await expect(processMemoryAttemptAssets("attempt-id")).rejects.toThrow(
      "Unable to store a memory asset variant.",
    );
    expect(rpc).toHaveBeenLastCalledWith("mark_memory_asset_object_failed", {
      p_failure_code: "asset_processing_failed",
      p_object_id: "cover-id",
    });
  });
});
