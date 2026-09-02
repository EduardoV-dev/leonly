import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createClientMock,
  createCommentMock,
  CreateCommentErrorMock,
  getCommentPageMock,
  logServerErrorMock,
  requestLoggerMock,
} = vi.hoisted(() => {
  class TestCreateCommentError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code: "failed" | "unavailable",
    ) {
      super(message);
    }
  }

  return {
    createClientMock: vi.fn(),
    createCommentMock: vi.fn(),
    CreateCommentErrorMock: TestCreateCommentError,
    getCommentPageMock: vi.fn(),
    logServerErrorMock: vi.fn(),
    requestLoggerMock: { child: vi.fn() },
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => requestLoggerMock),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/memories/server/create-comment", () => ({
  CreateCommentError: CreateCommentErrorMock,
  createComment: createCommentMock,
}));
vi.mock("@/features/memories/server/get-comment-page", () => ({
  GetCommentPageError: class TestGetCommentPageError extends Error {
    constructor(
      message: string,
      readonly status: 404 | 500,
      readonly code: "failed" | "unavailable",
    ) {
      super(message);
    }
  },
  getCommentPage: getCommentPageMock,
}));

import { GET, POST } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const COMMENT = {
  authorAvatarUrl: null,
  authorDisplayName: "Sarah",
  body: "A note",
  createdAt: "2026-08-23T10:00:00.000Z",
  id: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  memoryId: MEMORY_ID,
};

function context(memoryId = MEMORY_ID) {
  return { params: Promise.resolve({ memoryId }) };
}

function request(body: unknown = { body: "A note" }, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/comments`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

function authenticatedClient(userId: string | null = "member-id") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

describe("memory comments route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(authenticatedClient());
    getCommentPageMock.mockResolvedValue({
      comments: [COMMENT],
      cursorReset: false,
      nextCursor: null,
    });
    createCommentMock.mockResolvedValue(COMMENT);
  });

  it("reads a memory-scoped page using the async route params and cursor", async () => {
    const response = await GET(
      new Request(`http://localhost/api/memories/${MEMORY_ID}/comments?cursor=next`),
      context(),
    );

    expect(getCommentPageMock).toHaveBeenCalledWith(MEMORY_ID, "next");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      comments: [COMMENT],
      cursorReset: false,
      nextCursor: null,
    });
  });

  it("creates from the authenticated member and idempotency header", async () => {
    const response = await POST(
      request({ body: " A note " }, { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" }),
      context(),
    );

    expect(createCommentMock).toHaveBeenCalledWith(
      "member-id",
      MEMORY_ID,
      "11111111-1111-4111-8111-111111111111",
      " A note ",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ comment: COMMENT });
  });

  it("keeps unauthenticated requests on the generic unavailable boundary", async () => {
    createClientMock.mockResolvedValue(authenticatedClient(null));
    const body = vi.fn();
    const unauthenticatedRequest = request();
    Object.defineProperty(unauthenticatedRequest, "json", { value: body });

    const response = await POST(unauthenticatedRequest, context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "unavailable",
      error: "This memory is unavailable.",
    });
    expect(body).not.toHaveBeenCalled();
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("maps unavailable mutation revalidation without leaking memory details", async () => {
    createCommentMock.mockRejectedValue(
      new CreateCommentErrorMock("This memory is unavailable.", 404, "unavailable"),
    );

    const response = await POST(request(), context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "unavailable",
      error: "This memory is unavailable.",
    });
  });

  it("logs the original operational failure while keeping the response generic", async () => {
    const rpcError = Object.assign(new Error("column reference is ambiguous"), { code: "42702" });
    const operationalError = new Error("Unable to create the comment.", { cause: rpcError });
    createCommentMock.mockRejectedValue(operationalError);

    const response = await POST(request(), context());

    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "memory_comments_failed", operation: "create_comment" },
      operationalError,
      requestLoggerMock,
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not add your comment. Please try again.",
    });
  });
});
