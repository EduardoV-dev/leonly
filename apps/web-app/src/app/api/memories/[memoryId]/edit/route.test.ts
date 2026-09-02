import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cleanupMock,
  createClientMock,
  editMemoryMock,
  EditMemoryErrorMock,
  getAvailableMemoryMock,
  logServerErrorMock,
  MemoryInputErrorMock,
} = vi.hoisted(() => {
  class TestMemoryInputError extends Error {
    constructor(
      message: string,
      readonly fields: Record<string, string> = {},
      readonly status = 400,
    ) {
      super(message);
    }
  }

  class TestEditMemoryError extends TestMemoryInputError {
    constructor(
      message: string,
      fields: Record<string, string>,
      status: number,
      readonly code: "conflict" | "pending" | "unavailable",
    ) {
      super(message, fields, status);
    }
  }

  return {
    cleanupMock: vi.fn(),
    createClientMock: vi.fn(),
    editMemoryMock: vi.fn(),
    EditMemoryErrorMock: TestEditMemoryError,
    getAvailableMemoryMock: vi.fn(),
    logServerErrorMock: vi.fn(),
    MemoryInputErrorMock: TestMemoryInputError,
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => ({ child: vi.fn() })),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/memories/server/edit-memory", () => ({
  cleanupStaleMemoryEdits: cleanupMock,
  editMemory: editMemoryMock,
  EditMemoryError: EditMemoryErrorMock,
  MemoryInputError: MemoryInputErrorMock,
}));
vi.mock("@/features/memories/server/get-available-memory", () => ({
  getAvailableMemory: getAvailableMemoryMock,
}));

import { EditMemoryError, MemoryInputError } from "@/features/memories/server/edit-memory";
import { PATCH } from "./route";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const IDEMPOTENCY_KEY = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";

function client(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(headers: Record<string, string> = {}): Request {
  const editRequest = new Request(`http://localhost/api/memories/${MEMORY_ID}/edit`, {
    headers: { "Idempotency-Key": IDEMPOTENCY_KEY, ...headers },
    method: "PATCH",
  });
  Object.defineProperty(editRequest, "formData", {
    configurable: true,
    value: vi.fn(async () => new FormData()),
  });
  return editRequest;
}

function context(memoryId = MEMORY_ID) {
  return { params: Promise.resolve({ memoryId }) };
}

describe("PATCH /api/memories/[memoryId]/edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(client("member-id"));
    getAvailableMemoryMock.mockResolvedValue({ id: MEMORY_ID });
    editMemoryMock.mockResolvedValue({
      id: MEMORY_ID,
      reused: false,
      version: "opaque-version",
      visibility: "vault",
    });
  });

  it("derives the actor from the authenticated session and passes bounded multipart input", async () => {
    const response = await PATCH(request(), context());

    expect(editMemoryMock).toHaveBeenCalledWith(
      "member-id",
      MEMORY_ID,
      IDEMPOTENCY_KEY,
      expect.any(FormData),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: MEMORY_ID, visibility: "vault" });
  });

  it("returns generic unavailable without parsing a body for an unauthenticated request", async () => {
    createClientMock.mockResolvedValue(client(null));
    const body = { parsed: false };
    const unauthenticatedRequest = new Request("http://localhost/api/memories/id/edit", {
      method: "PATCH",
    });
    Object.defineProperty(unauthenticatedRequest, "formData", {
      value: vi.fn(async () => {
        body.parsed = true;
        return new FormData();
      }),
    });

    const response = await PATCH(unauthenticatedRequest, context("not-a-uuid"));

    expect(response.status).toBe(404);
    expect(body.parsed).toBe(false);
    expect(editMemoryMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "This memory is unavailable." });
  });

  it.each(["not-a-uuid", "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0"])(
    "preserves unavailable parity for addressed memory %s",
    async (memoryId) => {
      getAvailableMemoryMock.mockResolvedValue(memoryId === MEMORY_ID ? { id: MEMORY_ID } : null);
      editMemoryMock.mockRejectedValue(
        new EditMemoryError("This memory is unavailable.", {}, 404, "unavailable"),
      );

      const response = await PATCH(request(), context(memoryId));

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        code: "unavailable",
        error: "This memory is unavailable.",
      });
    },
  );

  it("returns safe field errors for malformed idempotency and version input", async () => {
    editMemoryMock.mockRejectedValue(
      new MemoryInputError("Please reload this memory and try again.", {
        form: "Invalid memory version.",
      }),
    );

    const response = await PATCH(request({ "Idempotency-Key": "bad-token" }), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Please reload this memory and try again.",
      fields: { form: "Invalid memory version." },
    });
    expect(logServerErrorMock).not.toHaveBeenCalled();
  });

  it.each([
    ["conflict", "This memory changed. Reload the current version before saving."],
    ["pending", "This edit is still being saved. Please try again."],
  ] as const)(
    "returns explicit %s responses for duplicate or concurrent requests",
    async (code, message) => {
      editMemoryMock.mockRejectedValue(new EditMemoryError(message, {}, 409, code));

      const response = await PATCH(request(), context());

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({ code, error: message });
    },
  );

  it("returns completed duplicate attempts as the original successful outcome", async () => {
    editMemoryMock.mockResolvedValue({
      id: MEMORY_ID,
      reused: true,
      version: "original-version",
      visibility: "timeline",
    });

    const response = await PATCH(request(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reused: true,
      version: "original-version",
      visibility: "timeline",
    });
  });

  it("rejects declared payloads over the multipart boundary before parsing", async () => {
    const oversized = request({ "content-length": String(28 * 1024 * 1024) });
    const formDataSpy = vi.spyOn(oversized, "formData");

    const response = await PATCH(oversized, context());

    expect(response.status).toBe(413);
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(editMemoryMock).not.toHaveBeenCalled();
  });

  it("rejects streamed payloads over the multipart boundary when content-length is absent", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(28 * 1024 * 1024));
        controller.close();
      },
    });
    const streamedRequest = new Request(`http://localhost/api/memories/${MEMORY_ID}/edit`, {
      body,
      duplex: "half",
      headers: {
        "content-type": "multipart/form-data; boundary=bounded-test",
        "Idempotency-Key": IDEMPOTENCY_KEY,
      },
      method: "PATCH",
    } as RequestInit);

    const response = await PATCH(streamedRequest, context());

    expect(response.status).toBe(413);
    expect(editMemoryMock).not.toHaveBeenCalled();
  });

  it("authorizes the addressed memory before parsing multipart input", async () => {
    getAvailableMemoryMock.mockResolvedValue(null);
    const unavailableRequest = request();
    const formDataSpy = vi.spyOn(unavailableRequest, "formData");

    const response = await PATCH(unavailableRequest, context());

    expect(response.status).toBe(404);
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(editMemoryMock).not.toHaveBeenCalled();
  });

  it("redacts internal paths and database details from unexpected error logs and responses", async () => {
    editMemoryMock.mockRejectedValue(
      new Error("storage private-space/attempt/photo failed: relation memory_edit_attempts"),
    );

    const response = await PATCH(request(), context());
    const loggedError = logServerErrorMock.mock.calls[0]?.[1] as Error;
    const serializedLogArguments = `${loggedError?.name}:${loggedError?.message}`;

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not update this memory. Please try again.",
    });
    expect(serializedLogArguments).not.toContain("private-space");
    expect(serializedLogArguments).not.toContain("memory_edit_attempts");
    expect(serializedLogArguments).toContain("Unexpected memory edit failure");
  });
});
