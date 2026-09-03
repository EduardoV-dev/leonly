import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { deleteMemory } from "./delete-memory";

const USER_ID = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const UPDATED_AT = "2026-09-01T21:00:00.000Z";
const EXPECTED_VERSION = Buffer.from(UPDATED_AT, "utf8").toString("base64url");

function rpcResponse(outcome: "completed" | "conflict" | "unavailable") {
  return { data: [{ outcome }], error: null };
}

describe("deleteMemory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes with authenticated identity and the decoded expected version", async () => {
    const rpc = vi.fn().mockResolvedValue(rpcResponse("completed"));
    createAdminClientMock.mockReturnValue({ rpc });

    await expect(deleteMemory(USER_ID, MEMORY_ID, EXPECTED_VERSION)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("delete_memory", {
      p_actor_user_id: USER_ID,
      p_expected_updated_at: UPDATED_AT,
      p_memory_id: MEMORY_ID,
    });
  });

  it("maps a malformed memory id to the generic unavailable outcome", async () => {
    await expect(deleteMemory(USER_ID, "not-a-uuid", EXPECTED_VERSION)).rejects.toMatchObject({
      code: "unavailable",
      message: "This memory is unavailable.",
      status: 404,
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed opaque version before opening the admin boundary", async () => {
    await expect(deleteMemory(USER_ID, MEMORY_ID, "not-a-version")).rejects.toThrow(
      "Invalid memory version.",
    );
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", 404],
    ["conflict", 409],
  ] as const)("maps the %s domain outcome", async (outcome, status) => {
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue(rpcResponse(outcome)),
    });

    await expect(deleteMemory(USER_ID, MEMORY_ID, EXPECTED_VERSION)).rejects.toMatchObject({
      code: outcome,
      status,
    });
  });

  it("preserves an RPC failure as the unexpected error cause", async () => {
    const rpcError = new Error("database details");
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError }),
    });

    await expect(deleteMemory(USER_ID, MEMORY_ID, EXPECTED_VERSION)).rejects.toMatchObject({
      cause: rpcError,
      message: "Unable to delete the memory.",
    });
  });

  it.each([
    null,
    [],
    [{ outcome: "completed" }, { outcome: "completed" }],
    [{ outcome: "completed", memory_id: MEMORY_ID }],
    [{ outcome: "unknown" }],
  ])("rejects malformed RPC output %#", async (data) => {
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data, error: null }),
    });

    await expect(deleteMemory(USER_ID, MEMORY_ID, EXPECTED_VERSION)).rejects.toThrow(
      "The memory deletion service returned an invalid response.",
    );
  });
});
