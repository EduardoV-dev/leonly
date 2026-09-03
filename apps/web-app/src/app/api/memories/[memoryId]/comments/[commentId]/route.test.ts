import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, logServerErrorMock, updateCommentMock, UpdateCommentErrorMock } =
  vi.hoisted(() => {
    class TestUpdateCommentError extends Error {
      constructor(
        message: string,
        readonly fields: Record<string, string>,
        readonly status: 404 | 409,
        readonly code: "conflict" | "unavailable",
      ) {
        super(message);
      }
    }

    return {
      createClientMock: vi.fn(),
      logServerErrorMock: vi.fn(),
      updateCommentMock: vi.fn(),
      UpdateCommentErrorMock: TestUpdateCommentError,
    };
  });

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({ child: vi.fn() })),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/memories/server/update-comment", () => ({
  UpdateCommentError: UpdateCommentErrorMock,
  updateComment: updateCommentMock,
}));

import { PATCH } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const COMMENT_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";

function context() {
  return { params: Promise.resolve({ commentId: COMMENT_ID, memoryId: MEMORY_ID }) };
}

function request(body: unknown = { body: "Updated note", expectedVersion: 1 }): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/comments/${COMMENT_ID}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

describe("PATCH /api/memories/[memoryId]/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-id" } } }) },
    });
    updateCommentMock.mockResolvedValue({ id: COMMENT_ID });
  });

  it("derives the actor from the session and passes only validated edit input", async () => {
    const response = await PATCH(
      request({ body: " Updated note ", expectedVersion: 1 }),
      context(),
    );

    expect(updateCommentMock).toHaveBeenCalledWith(
      "member-id",
      MEMORY_ID,
      COMMENT_ID,
      1,
      " Updated note ",
    );
    expect(response.status).toBe(200);
  });

  it("returns unavailable before parsing unauthenticated requests", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const unauthenticatedRequest = request();
    const json = vi.spyOn(unauthenticatedRequest, "json");

    const response = await PATCH(unauthenticatedRequest, context());

    expect(response.status).toBe(404);
    expect(json).not.toHaveBeenCalled();
    expect(updateCommentMock).not.toHaveBeenCalled();
  });

  it("returns safe validation and unavailable outcomes", async () => {
    const invalid = await PATCH(
      request({ body: "Updated note", expectedVersion: "one" }),
      context(),
    );
    expect(invalid.status).toBe(400);

    updateCommentMock.mockRejectedValue(
      new UpdateCommentErrorMock("This memory is unavailable.", {}, 404, "unavailable"),
    );
    const unavailable = await PATCH(request(), context());
    expect(unavailable.status).toBe(404);
    await expect(unavailable.json()).resolves.toEqual({
      code: "unavailable",
      error: "This memory is unavailable.",
    });
  });

  it("returns conflict only when the server boundary authorizes it", async () => {
    updateCommentMock.mockRejectedValue(
      new UpdateCommentErrorMock(
        "This comment changed. Refresh it before saving again.",
        {},
        409,
        "conflict",
      ),
    );

    const response = await PATCH(request(), context());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "conflict" });
  });
});
