import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateMemoryError } from "@/features/memories/server/create-memory";
import { POST } from "./route";

const createClientMock = vi.hoisted(() => vi.fn());
const createMemoryMock = vi.hoisted(() => vi.fn());
const cleanupMock = vi.hoisted(() => vi.fn());
const createRequestLoggerMock = vi.hoisted(() => vi.fn());
const logServerErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/features/memories/server/create-memory", () => ({
  cleanupStaleMemoryPhotoStaging: cleanupMock,
  createMemory: createMemoryMock,
  CreateMemoryError: class CreateMemoryError extends Error {
    constructor(
      message: string,
      readonly fields: Record<string, string> = {},
      readonly status = 400,
      readonly code = "validation_failed",
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: createRequestLoggerMock,
  logServerError: logServerErrorMock,
}));

function createSupabaseClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

describe("POST /api/memories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRequestLoggerMock.mockReturnValue({});
  });

  it("authenticates the request without forwarding payload identity", async () => {
    createClientMock.mockResolvedValue(createSupabaseClient("member-id"));
    createMemoryMock.mockResolvedValue({ id: "memory-id", reused: false });
    const body = new URLSearchParams({ creatorUserId: "other-user", spaceId: "other-space" });

    const request = new Request("http://localhost/api/memories", {
      body: body.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
      },
      method: "POST",
    });
    const response = await POST(request);

    expect(createMemoryMock).toHaveBeenCalledWith(
      "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
      expect.anything(),
    );
    const receivedFormData = createMemoryMock.mock.calls[0]?.[1] as FormData;
    expect(receivedFormData.get("creatorUserId")).toBe("other-user");
    expect(receivedFormData.get("spaceId")).toBe("other-space");
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "memory-id", reused: false });
  });

  it("returns the generic unavailable outcome without an authenticated member", async () => {
    createClientMock.mockResolvedValue(createSupabaseClient(null));

    const response = await POST(new Request("http://localhost/api/memories", { method: "POST" }));

    expect(createMemoryMock).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "This memory is unavailable." });
  });

  it("logs handled creation failures with a server status", async () => {
    createClientMock.mockResolvedValue(createSupabaseClient("member-id"));
    const failure = new CreateMemoryError(
      "We could not save this memory. Please try again.",
      {},
      500,
      "memory_create_failed",
    );
    failure.cause = new Error("storage upload failed");
    createMemoryMock.mockRejectedValue(failure);

    const response = await POST(
      new Request("http://localhost/api/memories", {
        body: new URLSearchParams().toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "memory_create_failed",
      error: "We could not save this memory. Please try again.",
      fields: {},
    });
    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "memory_creation_failed", operation: "create_memory" },
      failure,
      {},
    );
  });
});
