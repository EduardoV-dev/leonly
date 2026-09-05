import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { renameActiveSpace, renameActiveSpaceRequestSchema } from "./rename-active-space";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const EXPECTED_UPDATED_AT = "2026-09-05T16:00:00.000Z";

function mockSupabase(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("renameActiveSpace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes valid input and returns the canonical updated result", async () => {
    const rpc = mockSupabase({
      name: "Our space",
      status: "updated",
      updated_at: "2026-09-05T16:01:00.000Z",
    });

    await expect(
      renameActiveSpace({ expectedUpdatedAt: EXPECTED_UPDATED_AT, name: "  Our space  " }),
    ).resolves.toEqual({
      name: "Our space",
      status: "updated",
      updatedAt: "2026-09-05T16:01:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("rename_active_space", {
      p_expected_updated_at: EXPECTED_UPDATED_AT,
      p_name: "Our space",
    });
  });

  it("rejects malformed and identifier-bearing requests before the RPC", async () => {
    const rpc = mockSupabase({ status: "updated" });

    await expect(
      renameActiveSpace({ expectedUpdatedAt: EXPECTED_UPDATED_AT, name: " " }),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      renameActiveSpace({ expectedUpdatedAt: "not-a-date", name: "Our space" }),
    ).resolves.toEqual({ status: "invalid" });
    expect(
      renameActiveSpaceRequestSchema.safeParse({
        expectedUpdatedAt: EXPECTED_UPDATED_AT,
        name: "Our space",
        spaceId: "other-space",
      }).success,
    ).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("validates RPC outcomes before returning them", async () => {
    mockSupabase({ status: "conflict" });

    await expect(
      renameActiveSpace({ expectedUpdatedAt: EXPECTED_UPDATED_AT, name: "Our space" }),
    ).rejects.toThrow("The space-name service returned an invalid response.");
  });
});
