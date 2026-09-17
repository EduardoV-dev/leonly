import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, createMemoryMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createMemoryMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/features/memories/server/create-memory", () => ({
  createMemory: createMemoryMock,
  CreateMemoryError: class CreateMemoryError extends Error {},
}));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({})),
  logServerError: vi.fn(),
}));

import { POST } from "./route";

const ATTEMPT_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

function client(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

describe("POST /api/memories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(client("member-id"));
    createMemoryMock.mockResolvedValue({ id: "memory-id", visibility: "timeline" });
  });

  it("finalizes an authenticated creation by attempt ID only", async () => {
    const response = await POST(
      new Request("http://localhost/api/memories", {
        body: JSON.stringify({ attemptId: ATTEMPT_ID }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(createMemoryMock).toHaveBeenCalledWith(ATTEMPT_ID);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "memory-id", visibility: "timeline" });
  });

  it("rejects invalid finalization payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/memories", {
        body: JSON.stringify({ attemptId: "invalid" }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    expect(createMemoryMock).not.toHaveBeenCalled();
  });

  it("returns unavailable without an authenticated user", async () => {
    createClientMock.mockResolvedValue(client(null));

    const response = await POST(new Request("http://localhost/api/memories", { method: "POST" }));

    expect(response.status).toBe(404);
    expect(createMemoryMock).not.toHaveBeenCalled();
  });
});
