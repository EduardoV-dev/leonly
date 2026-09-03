import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createClientMock,
  deleteMemoryMock,
  getAvailableMemoryMock,
  logServerErrorMock,
  MemoryDeletionErrorMock,
  MemoryDeletionInputErrorMock,
  requestLoggerMock,
} = vi.hoisted(() => {
  class TestMemoryDeletionError extends Error {
    constructor(
      message: string,
      readonly status: 404 | 409,
      readonly code: "conflict" | "unavailable",
    ) {
      super(message);
    }
  }

  return {
    createClientMock: vi.fn(),
    deleteMemoryMock: vi.fn(),
    getAvailableMemoryMock: vi.fn(),
    logServerErrorMock: vi.fn(),
    MemoryDeletionErrorMock: TestMemoryDeletionError,
    MemoryDeletionInputErrorMock: class TestMemoryDeletionInputError extends Error {},
    requestLoggerMock: { child: vi.fn() },
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => requestLoggerMock),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/memories/server/delete-memory", () => ({
  deleteMemory: deleteMemoryMock,
  MemoryDeletionError: MemoryDeletionErrorMock,
  MemoryDeletionInputError: MemoryDeletionInputErrorMock,
}));
vi.mock("@/features/memories/server/get-available-memory", () => ({
  getAvailableMemory: getAvailableMemoryMock,
}));

import { DELETE, GET } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const EXPECTED_VERSION = Buffer.from("2026-09-01T21:00:00.000Z", "utf8").toString("base64url");

function client(userId: string | null = "member-id") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(
  body: unknown = { expectedVersion: EXPECTED_VERSION },
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "DELETE",
  });
}

function context(memoryId = MEMORY_ID) {
  return { params: Promise.resolve({ memoryId }) };
}

describe("DELETE /api/memories/[memoryId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(client());
    deleteMemoryMock.mockResolvedValue(undefined);
    getAvailableMemoryMock.mockResolvedValue({ id: MEMORY_ID });
  });

  it("deletes as the authenticated member and returns no content", async () => {
    const response = await DELETE(request(), context());

    expect(deleteMemoryMock).toHaveBeenCalledWith("member-id", MEMORY_ID, EXPECTED_VERSION);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("authenticates before reading or resolving untrusted deletion input", async () => {
    createClientMock.mockResolvedValue(client(null));
    const unauthenticatedRequest = request();
    const body = vi.spyOn(unauthenticatedRequest, "body", "get");

    const response = await DELETE(unauthenticatedRequest, context("not-a-uuid"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "unavailable" });
    expect(body).not.toHaveBeenCalled();
    expect(deleteMemoryMock).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid version", { expectedVersion: "not-a-version" }],
    ["missing field", {}],
    ["non-object body", []],
    ["extra field", { expectedVersion: EXPECTED_VERSION, spaceId: "private" }],
  ])("rejects %s", async (_case, body) => {
    const response = await DELETE(request(body), context());

    expect(response.status).toBe(400);
    expect(deleteMemoryMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const malformed = new Request(`http://localhost/api/memories/${MEMORY_ID}`, {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });

    const response = await DELETE(malformed, context());

    expect(response.status).toBe(400);
    expect(deleteMemoryMock).not.toHaveBeenCalled();
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", ""])(
    "rejects the %s content type",
    async (contentType) => {
      const headers = contentType ? { "content-type": contentType } : { "content-type": "" };
      const response = await DELETE(request(undefined, headers), context());

      expect(response.status).toBe(415);
      expect(deleteMemoryMock).not.toHaveBeenCalled();
    },
  );

  it("accepts JSON content type parameters", async () => {
    const response = await DELETE(
      request(undefined, { "content-type": "application/json; charset=utf-8" }),
      context(),
    );

    expect(response.status).toBe(204);
  });

  it("rejects a declared oversized body without consuming it", async () => {
    const oversized = request(undefined, { "content-length": "1025" });
    const body = vi.spyOn(oversized, "body", "get");

    const response = await DELETE(oversized, context());

    expect(response.status).toBe(413);
    expect(body).not.toHaveBeenCalled();
    expect(deleteMemoryMock).not.toHaveBeenCalled();
  });

  it("rejects a streamed oversized body when content-length is absent", async () => {
    const oversized = new Request(`http://localhost/api/memories/${MEMORY_ID}`, {
      body: JSON.stringify({ expectedVersion: "a".repeat(1100) }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });

    const response = await DELETE(oversized, context());

    expect(response.status).toBe(413);
    expect(deleteMemoryMock).not.toHaveBeenCalled();
  });

  it("returns generic unavailable for malformed, missing, deleted, or inaccessible targets", async () => {
    deleteMemoryMock.mockRejectedValue(
      new MemoryDeletionErrorMock("This memory is unavailable.", 404, "unavailable"),
    );

    const response = await DELETE(request(), context("not-a-uuid"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "unavailable",
      error: "This memory is unavailable.",
    });
  });

  it("returns the established conflict response for a stale version", async () => {
    deleteMemoryMock.mockRejectedValue(
      new MemoryDeletionErrorMock(
        "This memory changed. Reload the current version before deleting it.",
        409,
        "conflict",
      ),
    );

    const response = await DELETE(request(), context());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "conflict" });
  });

  it("maps a defensive module input failure to a safe validation response", async () => {
    deleteMemoryMock.mockRejectedValue(new MemoryDeletionInputErrorMock("private version detail"));

    const response = await DELETE(request(), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please reload this memory and try again.",
    });
  });

  it("returns a recoverable failure and redacts unexpected details from structured logs", async () => {
    deleteMemoryMock.mockRejectedValue(new Error("private memory path token=secret"));

    const response = await DELETE(request(), context());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not delete this memory. Please try again.",
    });
    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "memory_deletion_failed", operation: "delete_memory" },
      expect.objectContaining({ message: "Unexpected memory deletion failure." }),
      requestLoggerMock,
    );
    expect(JSON.stringify(logServerErrorMock.mock.calls)).not.toContain("private memory path");
    expect(JSON.stringify(logServerErrorMock.mock.calls)).not.toContain("secret");
  });
});

describe("GET /api/memories/[memoryId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(client());
    getAvailableMemoryMock.mockResolvedValue({ id: MEMORY_ID });
  });

  it("reauthorizes an available memory without returning its detail", async () => {
    const response = await GET(request(undefined, { "content-type": "" }), context());

    expect(getAvailableMemoryMock).toHaveBeenCalledWith(MEMORY_ID);
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("");
  });

  it.each(["missing", "deleted", "cross-space", "malformed"])(
    "returns the same unavailable response for a %s memory",
    async () => {
      getAvailableMemoryMock.mockResolvedValue(null);

      const response = await GET(request(undefined, { "content-type": "" }), context());

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ code: "unavailable" });
    },
  );

  it("does not resolve a target before authenticating", async () => {
    createClientMock.mockResolvedValue(client(null));

    const response = await GET(request(undefined, { "content-type": "" }), context("not-a-uuid"));

    expect(response.status).toBe(404);
    expect(getAvailableMemoryMock).not.toHaveBeenCalled();
  });

  it("keeps availability failures generic and retryable", async () => {
    getAvailableMemoryMock.mockRejectedValue(new Error("private target state"));

    const response = await GET(request(undefined, { "content-type": "" }), context());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not check this memory. Please try again.",
    });
    expect(JSON.stringify(logServerErrorMock.mock.calls)).not.toContain("private target state");
  });
});
