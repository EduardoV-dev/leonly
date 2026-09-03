import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));

import { createComment } from "./create-comment";

const userId = "e951cd4b-7567-4b1e-a5d3-18aa810cbd8e";
const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const idempotencyKey = "3ddf312a-e682-4cd8-91f9-9a2a230241ed";
const avatarUrl = "https://cdn.example.com/alex.jpg";

function adminClient(rpc: ReturnType<typeof vi.fn>, profileData = { avatar_url: avatarUrl }) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profileData, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }), rpc };
}

function completedRow(body = "A note") {
  return {
    author_display_name: "Alex",
    author_user_id: userId,
    body,
    comment_id: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
    created_at: "2026-09-02T10:00:00.000Z",
    memory_id: memoryId,
    outcome: "completed",
    space_id: "b6d3c1f9-84a5-4e22-bf3e-09b94c9a1e33",
  };
}

describe("createComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates, trims, fingerprints, and returns the canonical server comment", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [completedRow("A note")], error: null });
    const admin = adminClient(rpc);
    createAdminClientMock.mockReturnValue(admin);

    await expect(createComment(userId, memoryId, idempotencyKey, "  A note  ")).resolves.toEqual({
      authorAvatarUrl: avatarUrl,
      authorDisplayName: "Alex",
      body: "A note",
      createdAt: "2026-09-02T10:00:00.000Z",
      id: "561ecf16-cc9f-489c-ac1d-38fbfc35d97c",
      isAuthor: true,
      memoryId,
      updatedAt: "2026-09-02T10:00:00.000Z",
      version: 1,
    });

    expect(rpc).toHaveBeenCalledWith("create_memory_comment", {
      p_author_user_id: userId,
      p_body: "A note",
      p_idempotency_key: idempotencyKey,
      p_memory_id: memoryId,
      p_request_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(admin.from).toHaveBeenCalledWith("users");
  });

  it("uses no avatar when the profile image URL is invalid", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [completedRow()], error: null });
    createAdminClientMock.mockReturnValue(adminClient(rpc, { avatar_url: "not-a-url" }));

    await expect(createComment(userId, memoryId, idempotencyKey, "A note")).resolves.toMatchObject({
      authorAvatarUrl: null,
    });
  });

  it("maps every inaccessible memory response to the generic unavailable error", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          author_display_name: null,
          author_user_id: null,
          body: null,
          comment_id: null,
          created_at: null,
          memory_id: null,
          outcome: "unavailable",
          space_id: null,
        },
      ],
      error: null,
    });
    createAdminClientMock.mockReturnValue({ rpc });

    await expect(createComment(userId, memoryId, idempotencyKey, "A note")).rejects.toMatchObject({
      code: "unavailable",
      message: "This memory is unavailable.",
      status: 404,
    });
  });

  it("preserves validation failures before opening the admin boundary", async () => {
    await expect(createComment(userId, memoryId, idempotencyKey, " \n ")).rejects.toMatchObject({
      fields: { body: "Enter a comment." },
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("maps key reuse conflicts without exposing database details", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          author_display_name: null,
          author_user_id: null,
          body: null,
          comment_id: null,
          created_at: null,
          memory_id: null,
          outcome: "mismatch",
          space_id: null,
        },
      ],
      error: null,
    });
    createAdminClientMock.mockReturnValue({ rpc });

    await expect(
      createComment(userId, memoryId, idempotencyKey, "A different note"),
    ).rejects.toMatchObject({
      fields: { form: "The request key was already used for different content." },
    });
  });

  it("preserves transport failures as the operational error cause", async () => {
    const rpcError = Object.assign(new Error("database detail"), { code: "42702" });
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError }),
    });

    await expect(createComment(userId, memoryId, idempotencyKey, "A note")).rejects.toMatchObject({
      cause: rpcError,
      message: "Unable to create the comment.",
    });
  });
});
