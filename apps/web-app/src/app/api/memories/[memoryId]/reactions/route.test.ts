import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, logServerErrorMock, MemoryReactionErrorMock, toggleMemoryReactionMock } =
  vi.hoisted(() => {
    class TestMemoryReactionError extends Error {
      constructor(
        message: string,
        readonly status: 404,
        readonly code: "unavailable",
      ) {
        super(message);
      }
    }

    return {
      createClientMock: vi.fn(),
      logServerErrorMock: vi.fn(),
      MemoryReactionErrorMock: TestMemoryReactionError,
      toggleMemoryReactionMock: vi.fn(),
    };
  });

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({ child: vi.fn() })),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/memories/server/memory-reactions", () => ({
  MemoryReactionError: MemoryReactionErrorMock,
  toggleMemoryReaction: toggleMemoryReactionMock,
}));

import { POST } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const REACTION = {
  counts: { cry: 0, heart: 1, laugh: 0, star: 0 },
  currentReaction: "heart",
};

function context(memoryId = MEMORY_ID) {
  return { params: Promise.resolve({ memoryId }) };
}

function request(body: unknown = { reactionType: "heart" }): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/reactions`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
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

describe("POST /api/memories/[memoryId]/reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(authenticatedClient());
    toggleMemoryReactionMock.mockResolvedValue(REACTION);
  });

  it("derives the member from the session and returns the confirmed reaction summary", async () => {
    const response = await POST(request(), context());

    expect(toggleMemoryReactionMock).toHaveBeenCalledWith("member-id", MEMORY_ID, "heart");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ reaction: REACTION });
  });

  it("rejects altered payloads and unsupported types before the server boundary", async () => {
    const altered = await POST(
      request({ reactionType: "heart", spaceId: "forged", userId: "forged" }),
      context(),
    );
    expect(altered.status).toBe(400);
    expect(toggleMemoryReactionMock).not.toHaveBeenCalled();

    const unsupported = await POST(request({ reactionType: "thumbs-up" }), context());
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toEqual({ error: "Please choose a valid reaction." });
    expect(toggleMemoryReactionMock).not.toHaveBeenCalled();
  });

  it("keeps unauthenticated members on the generic unavailable boundary without parsing", async () => {
    createClientMock.mockResolvedValue(authenticatedClient(null));
    const unauthenticatedRequest = request();
    const json = vi.spyOn(unauthenticatedRequest, "json");

    const response = await POST(unauthenticatedRequest, context());

    expect(response.status).toBe(404);
    expect(json).not.toHaveBeenCalled();
    expect(toggleMemoryReactionMock).not.toHaveBeenCalled();
  });

  it.each(["inactive", "deleted", "other-space"])(
    "maps %s targets to the generic unavailable response",
    async () => {
      toggleMemoryReactionMock.mockRejectedValue(
        new MemoryReactionErrorMock("This memory is unavailable.", 404, "unavailable"),
      );

      const response = await POST(request(), context());

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        code: "unavailable",
        error: "This memory is unavailable.",
      });
    },
  );

  it("logs unexpected failures without exposing target state", async () => {
    const failure = new Error("database unavailable");
    toggleMemoryReactionMock.mockRejectedValue(failure);

    const response = await POST(request(), context());

    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "memory_reactions_failed", operation: "toggle_memory_reaction" },
      failure,
      expect.anything(),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not update your reaction. Please try again.",
    });
  });
});
