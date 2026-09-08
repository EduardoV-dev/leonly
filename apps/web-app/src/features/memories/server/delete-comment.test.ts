import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { deleteComment } from "./delete-comment";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const COMMENT_ID = "561ecf16-cc9f-489c-ac1d-38fbfc35d97c";

describe("deleteComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("soft-deletes through the version-conditional service RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ outcome: "completed" }], error: null });
    createClientMock.mockResolvedValue({ rpc });

    await expect(deleteComment(MEMORY_ID, COMMENT_ID, 2)).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith("delete_memory_comment", {
      p_comment_id: COMMENT_ID,
      p_expected_version: 2,
      p_memory_id: MEMORY_ID,
    });
  });

  it.each(["non-author", "forged", "inactive-member", "cross-space", "missing", "already-deleted"])(
    "maps a %s target to the generic unavailable outcome",
    async () => {
      createClientMock.mockResolvedValue({
        rpc: vi.fn().mockResolvedValue({ data: [{ outcome: "unavailable" }], error: null }),
      });

      await expect(deleteComment(MEMORY_ID, COMMENT_ID, 2)).rejects.toMatchObject({
        code: "unavailable",
        status: 404,
      });
    },
  );

  it("returns conflict only for an otherwise authorized stale version", async () => {
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: [{ outcome: "conflict" }], error: null }),
    });

    await expect(deleteComment(MEMORY_ID, COMMENT_ID, 1)).rejects.toMatchObject({
      code: "conflict",
      status: 409,
    });
  });

  it("rejects malformed identifiers before opening the admin boundary", async () => {
    await expect(deleteComment("not-a-uuid", COMMENT_ID, 1)).rejects.toMatchObject({
      code: "unavailable",
      status: 404,
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("preserves operational failures for the route to log", async () => {
    const failure = new Error("database unavailable");
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: failure }),
    });

    await expect(deleteComment(MEMORY_ID, COMMENT_ID, 1)).rejects.toMatchObject({
      message: "Unable to delete the comment.",
    });
  });
});
