import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { getMemoryReactionSummary, toggleMemoryReaction } from "./memory-reactions";

const USER_ID = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

function completedRow(currentReaction: "heart" | "laugh" | "cry" | "star" | null = "heart") {
  return {
    cry_count: 0,
    current_reaction: currentReaction,
    heart_count: currentReaction === "heart" ? 1 : 0,
    laugh_count: currentReaction === "laugh" ? 1 : 0,
    outcome: "completed",
    reaction_members: {
      cry: [],
      heart: currentReaction === "heart" ? ["Alex"] : [],
      laugh: currentReaction === "laugh" ? ["Alex"] : [],
      star: currentReaction === "star" ? ["Alex"] : [],
    },
    star_count: currentReaction === "star" ? 1 : 0,
  };
}

describe("memory reactions server boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the authoritative summary from a valid service-role toggle", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [completedRow()], error: null });
    createAdminClientMock.mockReturnValue({ rpc });

    await expect(toggleMemoryReaction(USER_ID, MEMORY_ID, "heart")).resolves.toEqual({
      counts: { cry: 0, heart: 1, laugh: 0, star: 0 },
      currentReaction: "heart",
      members: { cry: [], heart: ["Alex"], laugh: [], star: [] },
    });
    expect(rpc).toHaveBeenCalledWith("toggle_memory_reaction", {
      p_memory_id: MEMORY_ID,
      p_reaction_type: "heart",
      p_user_id: USER_ID,
    });
  });

  it("rejects unsupported types without opening the admin boundary", async () => {
    await expect(toggleMemoryReaction(USER_ID, MEMORY_ID, "thumbs-up")).rejects.toMatchObject({
      fields: { reactionType: "Choose a valid reaction." },
      status: 400,
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("maps malformed memory identifiers to unavailable without opening the admin boundary", async () => {
    await expect(toggleMemoryReaction(USER_ID, "not-a-uuid", "heart")).rejects.toMatchObject({
      code: "unavailable",
      status: 404,
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it.each(["deleted", "inactive", "other-space"])(
    "maps %s targets to the generic unavailable boundary",
    async () => {
      createAdminClientMock.mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              cry_count: null,
              current_reaction: null,
              heart_count: null,
              laugh_count: null,
              outcome: "unavailable",
              reaction_members: null,
              star_count: null,
            },
          ],
          error: null,
        }),
      });

      await expect(toggleMemoryReaction(USER_ID, MEMORY_ID, "star")).rejects.toMatchObject({
        code: "unavailable",
        message: "This memory is unavailable.",
        status: 404,
      });
    },
  );

  it("resolves authorized summaries without accepting caller-owned space data", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [completedRow("star")], error: null });
    createAdminClientMock.mockReturnValue({ rpc });

    await expect(getMemoryReactionSummary(USER_ID, MEMORY_ID)).resolves.toMatchObject({
      currentReaction: "star",
    });
    expect(rpc).toHaveBeenCalledWith("get_memory_reaction_summary", {
      p_memory_id: MEMORY_ID,
      p_user_id: USER_ID,
    });
  });

  it("preserves database failures and overlapping completion summaries for reconciliation", async () => {
    const databaseError = Object.assign(new Error("database detail"), { code: "42702" });
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [completedRow("heart")], error: null })
      .mockResolvedValueOnce({ data: [completedRow("star")], error: null })
      .mockResolvedValueOnce({ data: null, error: databaseError });
    createAdminClientMock.mockReturnValue({ rpc });

    const [first, second] = await Promise.all([
      toggleMemoryReaction(USER_ID, MEMORY_ID, "heart"),
      toggleMemoryReaction(USER_ID, MEMORY_ID, "star"),
    ]);
    expect(first.currentReaction).toBe("heart");
    expect(second.currentReaction).toBe("star");
    await expect(toggleMemoryReaction(USER_ID, MEMORY_ID, "cry")).rejects.toMatchObject({
      cause: databaseError,
      message: "Unable to update the memory reaction.",
    });
  });
});
