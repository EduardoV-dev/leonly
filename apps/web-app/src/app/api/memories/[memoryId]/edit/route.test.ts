import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClientMock, editMemoryMock, getAvailableMemoryMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  editMemoryMock: vi.fn(),
  getAvailableMemoryMock: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({})),
  logServerError: vi.fn(),
}));
vi.mock("@/features/memories/server/edit-memory", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/memories/server/edit-memory")>()),
  editMemory: editMemoryMock,
}));
vi.mock("@/features/memories/server/get-available-memory", () => ({
  getAvailableMemory: getAvailableMemoryMock,
}));

import { PATCH } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const ATTEMPT_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";

function client(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(attemptId = ATTEMPT_ID): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/edit`, {
    body: JSON.stringify({ attemptId }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

const context = { params: Promise.resolve({ memoryId: MEMORY_ID }) };

describe("PATCH /api/memories/[memoryId]/edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(client("member-id"));
    getAvailableMemoryMock.mockResolvedValue({ id: MEMORY_ID });
    editMemoryMock.mockResolvedValue({
      id: MEMORY_ID,
      version: "opaque-version",
      visibility: "vault",
    });
  });

  it("finalizes an available memory by attempt ID only", async () => {
    const response = await PATCH(request(), context);

    expect(editMemoryMock).toHaveBeenCalledWith(ATTEMPT_ID);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: MEMORY_ID, visibility: "vault" });
  });

  it("rejects malformed attempt IDs without finalizing", async () => {
    const response = await PATCH(request("bad-token"), context);

    expect(response.status).toBe(400);
    expect(editMemoryMock).not.toHaveBeenCalled();
  });

  it("preserves unavailable parity before parsing finalization", async () => {
    getAvailableMemoryMock.mockResolvedValue(null);

    const response = await PATCH(request(), context);

    expect(response.status).toBe(404);
    expect(editMemoryMock).not.toHaveBeenCalled();
  });
});
