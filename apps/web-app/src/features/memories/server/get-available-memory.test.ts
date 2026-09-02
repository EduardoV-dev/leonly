import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailableMemory } from "./get-available-memory";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

describe("getAvailableMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps every unavailable response to null without calling the lookup for malformed IDs", async () => {
    expect(await getAvailableMemory("not-a-uuid")).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();

    rpcMock.mockResolvedValue({ data: null, error: null });
    expect(await getAvailableMemory("0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0")).toBeNull();
  });

  it("allows an authorized Vault memory through the generic lookup", async () => {
    rpcMock.mockResolvedValue({
      data: {
        cover_photo_id: null,
        created_at: "2026-08-23T10:00:00.000Z",
        creator_user_id: "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e",
        description: null,
        id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
        location: null,
        memory_date: "2026-08-20",
        space_id: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
        title: "Private anniversary",
        updated_at: "2026-08-23T11:00:00.000Z",
        visibility: "vault",
      },
      error: null,
    });

    await expect(getAvailableMemory("0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0")).resolves.toMatchObject(
      {
        title: "Private anniversary",
        visibility: "vault",
      },
    );
    expect(rpcMock).toHaveBeenCalledWith("get_available_memory", {
      p_memory_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
    });
  });
});
