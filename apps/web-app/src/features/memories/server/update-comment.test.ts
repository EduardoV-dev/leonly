import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { updateComment } from "./update-comment";

const userId = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const commentId = "561ecf16-cc9f-489c-ac1d-38fbfc35d97c";

function completedRow() {
  return {
    author_display_name: "Alex",
    author_user_id: userId,
    body: "Updated note",
    comment_id: commentId,
    created_at: "2026-09-02T10:00:00.000Z",
    memory_id: memoryId,
    outcome: "completed",
    updated_at: "2026-09-02T11:00:00.000Z",
    version: 2,
  };
}

function adminClient(rpc: ReturnType<typeof vi.fn>) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { avatar_url: null }, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }), rpc };
}

describe("updateComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes and conditionally updates through the service RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [completedRow()], error: null });
    createAdminClientMock.mockReturnValue(adminClient(rpc));

    await expect(updateComment(userId, memoryId, commentId, 1, " Updated note ")).resolves.toEqual({
      authorAvatarUrl: null,
      authorDisplayName: "Alex",
      body: "Updated note",
      createdAt: "2026-09-02T10:00:00.000Z",
      id: commentId,
      isAuthor: true,
      memoryId,
      updatedAt: "2026-09-02T11:00:00.000Z",
      version: 2,
    });
    expect(rpc).toHaveBeenCalledWith("update_memory_comment", {
      p_author_user_id: userId,
      p_body: "Updated note",
      p_comment_id: commentId,
      p_expected_version: 1,
      p_memory_id: memoryId,
    });
  });

  it.each(["unavailable", "conflict"] as const)(
    "maps %s without a completed row",
    async (outcome) => {
      createAdminClientMock.mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              author_display_name: null,
              author_user_id: null,
              body: null,
              comment_id: null,
              created_at: null,
              memory_id: null,
              outcome,
              updated_at: null,
              version: null,
            },
          ],
          error: null,
        }),
      });

      await expect(
        updateComment(userId, memoryId, commentId, 1, "Updated note"),
      ).rejects.toMatchObject({
        code: outcome,
        status: outcome === "conflict" ? 409 : 404,
      });
    },
  );

  it("rejects invalid text before opening the admin boundary", async () => {
    await expect(updateComment(userId, memoryId, commentId, 1, " \n ")).rejects.toMatchObject({
      fields: { body: "Enter a comment." },
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
