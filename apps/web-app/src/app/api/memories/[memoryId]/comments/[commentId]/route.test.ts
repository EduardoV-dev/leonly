import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createClientMock,
  deleteCommentMock,
  DeleteCommentErrorMock,
  logServerErrorMock,
  updateCommentMock,
  UpdateCommentErrorMock,
} = vi.hoisted(() => {
  class TestDeleteCommentError extends Error {
    constructor(
      message: string,
      readonly status: 404 | 409,
      readonly code: "conflict" | "unavailable",
    ) {
      super(message);
    }
  }

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
    deleteCommentMock: vi.fn(),
    DeleteCommentErrorMock: TestDeleteCommentError,
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
vi.mock("@/features/memories/server/delete-comment", () => ({
  DeleteCommentError: DeleteCommentErrorMock,
  deleteComment: deleteCommentMock,
}));

import { DELETE, PATCH } from "./route";

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

function deleteRequest(body: unknown = { expectedVersion: 1 }): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/comments/${COMMENT_ID}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "DELETE",
  });
}

describe("PATCH /api/memories/[memoryId]/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-id" } } }) },
    });
    updateCommentMock.mockResolvedValue({ id: COMMENT_ID });
    deleteCommentMock.mockResolvedValue(undefined);
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

describe("DELETE /api/memories/[memoryId]/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-id" } } }) },
    });
    deleteCommentMock.mockResolvedValue(undefined);
  });

  it("derives the actor from the session and deletes using the submitted version", async () => {
    const response = await DELETE(deleteRequest({ expectedVersion: 2 }), context());

    expect(deleteCommentMock).toHaveBeenCalledWith("member-id", MEMORY_ID, COMMENT_ID, 2);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deletedCommentId: COMMENT_ID });
  });

  it("rejects invalid payloads and unauthenticated requests without calling the server boundary", async () => {
    const invalid = await DELETE(
      deleteRequest({ expectedVersion: 1, forgedUserId: "other" }),
      context(),
    );
    expect(invalid.status).toBe(400);
    expect(deleteCommentMock).not.toHaveBeenCalled();

    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const unauthenticatedRequest = deleteRequest();
    const json = vi.spyOn(unauthenticatedRequest, "json");

    const unauthenticated = await DELETE(unauthenticatedRequest, context());
    expect(unauthenticated.status).toBe(404);
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    ["non-author", 404, "unavailable"],
    ["already-deleted", 404, "unavailable"],
    ["stale-version", 409, "conflict"],
  ] as const)("returns the safe %s outcome", async (_target, status, code) => {
    deleteCommentMock.mockRejectedValue(
      new DeleteCommentErrorMock(
        code === "conflict"
          ? "This comment changed. Refresh it before deleting."
          : "This memory is unavailable.",
        status,
        code,
      ),
    );

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
  });

  it("logs unexpected failures while returning a generic retryable response", async () => {
    const failure = new Error("database unavailable");
    deleteCommentMock.mockRejectedValue(failure);

    const response = await DELETE(deleteRequest(), context());

    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "memory_comments_failed", operation: "delete_comment" },
      failure,
      expect.anything(),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not delete your comment. Please try again.",
    });
  });
});
