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
const GRANT = "signed-edit-grant";

function client(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(grant = GRANT): Request {
  return new Request(`http://localhost/api/memories/${MEMORY_ID}/edit`, {
    body: JSON.stringify({ grant }),
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

  it("finalizes an available memory from its signed grant", async () => {
    const response = await PATCH(request(), context);

    expect(editMemoryMock).toHaveBeenCalledWith(MEMORY_ID, GRANT, "member-id");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: MEMORY_ID, visibility: "vault" });
  });

  it("rejects malformed grants without finalizing", async () => {
    const response = await PATCH(request(""), context);

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
