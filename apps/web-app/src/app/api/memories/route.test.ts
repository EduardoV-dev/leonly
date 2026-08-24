import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const createClientMock = vi.hoisted(() => vi.fn());
const createMemoryMock = vi.hoisted(() => vi.fn());
const cleanupMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/features/memories/server/create-memory", () => ({
  cleanupStaleMemoryPhotoStaging: cleanupMock,
  createMemory: createMemoryMock,
  CreateMemoryError: class CreateMemoryError extends Error {},
}));

function createSupabaseClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

describe("POST /api/memories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives the actor from the authenticated session and never request payload identity", async () => {
    createClientMock.mockResolvedValue(createSupabaseClient("member-id"));
    createMemoryMock.mockResolvedValue({ id: "memory-id", reused: false });
    const body = new URLSearchParams({ creatorUserId: "other-user", spaceId: "other-space" });

    const request = new Request("http://localhost/api/memories", {
      body,
      method: "POST",
    });
    request.headers.set("Content-Type", "application/x-www-form-urlencoded");
    request.headers.set("Idempotency-Key", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0");
    const response = await POST(request);

    expect(createMemoryMock).toHaveBeenCalledWith(
      "member-id",
      "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
      expect.anything(),
    );
    const receivedFormData = createMemoryMock.mock.calls[0]?.[2] as FormData;
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
});
