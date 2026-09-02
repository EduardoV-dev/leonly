import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createAdminClientMock } = vi.hoisted(() => ({ createAdminClientMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { decodeMemoryVersion } from "./memory-version";
import { placeMemory } from "./place-memory";

const USER_ID = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const UPDATED_AT = "2026-09-01T21:00:00.000Z";
const EXPECTED_VERSION = Buffer.from(UPDATED_AT, "utf8").toString("base64url");

function rpcResult(overrides: Record<string, unknown> = {}) {
  return {
    memory_id: MEMORY_ID,
    outcome: "completed",
    result_updated_at: "2026-09-01T21:01:00.000Z",
    result_visibility: "vault",
    ...overrides,
  };
}

describe("placeMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["timeline", "vault"],
    ["vault", "timeline"],
  ] as const)(
    "places a memory from %s to %s without changing its identity",
    async (_source, target) => {
      const rpc = vi.fn().mockResolvedValue({
        data: [rpcResult({ result_visibility: target })],
        error: null,
      });
      createAdminClientMock.mockReturnValue({ rpc });

      const result = await placeMemory(USER_ID, MEMORY_ID, target, EXPECTED_VERSION);

      expect(rpc).toHaveBeenCalledWith("place_memory", {
        p_actor_user_id: USER_ID,
        p_expected_updated_at: UPDATED_AT,
        p_memory_id: MEMORY_ID,
        p_target_visibility: target,
      });
      expect(result).toMatchObject({ id: MEMORY_ID, visibility: target });
      expect(decodeMemoryVersion(result.version)).toBe("2026-09-01T21:01:00.000Z");
    },
  );

  it.each([
    ["conflict", 409, "conflict"],
    ["unavailable", 404, "unavailable"],
  ] as const)(
    "maps a %s RPC outcome without exposing memory state",
    async (outcome, status, code) => {
      createAdminClientMock.mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: [rpcResult({ outcome })], error: null }),
      });

      await expect(
        placeMemory(USER_ID, MEMORY_ID, "vault", EXPECTED_VERSION),
      ).rejects.toMatchObject({
        code,
        status,
      });
    },
  );

  it("rejects malformed versions without calling the database", async () => {
    await expect(placeMemory(USER_ID, MEMORY_ID, "vault", "not-a-version")).rejects.toThrow(
      "Invalid memory version.",
    );
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns a safe failure when the placement RPC fails", async () => {
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("database details") }),
    });

    await expect(placeMemory(USER_ID, MEMORY_ID, "vault", EXPECTED_VERSION)).rejects.toMatchObject({
      cause: { message: "database details" },
      message: "Unable to place the memory.",
    });
  });
});
