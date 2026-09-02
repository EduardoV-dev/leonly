import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createClientMock,
  logServerErrorMock,
  MemoryPlacementErrorMock,
  MemoryPlacementInputErrorMock,
  placeMemoryMock,
} = vi.hoisted(() => {
  class TestMemoryPlacementError extends Error {
    constructor(
      message: string,
      readonly status: 404 | 409,
      readonly code: "conflict" | "unavailable",
    ) {
      super(message);
    }
  }

  class TestMemoryPlacementInputError extends Error {}

  return {
    createClientMock: vi.fn(),
    logServerErrorMock: vi.fn(),
    MemoryPlacementErrorMock: TestMemoryPlacementError,
    MemoryPlacementInputErrorMock: TestMemoryPlacementInputError,
    placeMemoryMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({ child: vi.fn() })),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/memories/server/place-memory", () => ({
  MemoryPlacementError: MemoryPlacementErrorMock,
  MemoryPlacementInputError: MemoryPlacementInputErrorMock,
  placeMemory: placeMemoryMock,
}));

import { MemoryPlacementError } from "@/features/memories/server/place-memory";
import { PATCH } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const EXPECTED_VERSION = Buffer.from("2026-09-01T21:00:00.000Z", "utf8").toString("base64url");

function client(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(
  body: unknown = { expectedVersion: EXPECTED_VERSION, targetVisibility: "vault" },
): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/placement`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

function context(memoryId = MEMORY_ID) {
  return { params: Promise.resolve({ memoryId }) };
}

describe("PATCH /api/memories/[memoryId]/placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(client("member-id"));
    placeMemoryMock.mockImplementation(async (_userId, _memoryId, targetVisibility) => ({
      id: MEMORY_ID,
      version: EXPECTED_VERSION,
      visibility: targetVisibility,
    }));
  });

  it.each(["vault", "timeline"] as const)(
    "places to %s for the authenticated member",
    async (target) => {
      const response = await PATCH(
        request({ expectedVersion: EXPECTED_VERSION, targetVisibility: target }),
        context(),
      );

      expect(placeMemoryMock).toHaveBeenCalledWith(
        "member-id",
        MEMORY_ID,
        target,
        EXPECTED_VERSION,
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ id: MEMORY_ID, visibility: target });
    },
  );

  it("does not parse a request body before authenticating", async () => {
    createClientMock.mockResolvedValue(client(null));
    const placementRequest = new Request("http://localhost/api/memories/id/placement", {
      method: "PATCH",
    });
    const json = vi.fn();
    Object.defineProperty(placementRequest, "json", { value: json });

    const response = await PATCH(placementRequest, context("not-a-uuid"));

    expect(response.status).toBe(404);
    expect(json).not.toHaveBeenCalled();
    expect(placeMemoryMock).not.toHaveBeenCalled();
  });

  it.each([
    [MEMORY_ID, { expectedVersion: "not-a-version", targetVisibility: "vault" }],
    [MEMORY_ID, { expectedVersion: EXPECTED_VERSION, targetVisibility: "other" }],
  ])("rejects malformed placement input", async (memoryId, body) => {
    const response = await PATCH(request(body), context(memoryId));

    expect(response.status).toBe(400);
    expect(placeMemoryMock).not.toHaveBeenCalled();
  });

  it("returns generic unavailable for a malformed memory id", async () => {
    const response = await PATCH(request(), context("not-a-uuid"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "unavailable" });
    expect(placeMemoryMock).not.toHaveBeenCalled();
  });

  it.each([
    ["conflict", 409],
    ["unavailable", 404],
  ] as const)("returns the safe %s outcome", async (code, status) => {
    placeMemoryMock.mockRejectedValue(
      new MemoryPlacementError("This memory is unavailable.", status, code),
    );

    const response = await PATCH(request(), context());

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
  });

  it("redacts unexpected placement failures from logs and responses", async () => {
    placeMemoryMock.mockRejectedValue(new Error("private memory location"));

    const response = await PATCH(request(), context());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not move this memory. Please try again.",
    });
    expect(logServerErrorMock.mock.calls[0]?.[1]).toMatchObject({
      message: "private memory location",
    });
  });
});
