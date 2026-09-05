import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logServerErrorMock, renameActiveSpaceMock, requestLoggerMock } =
  vi.hoisted(() => ({
    createClientMock: vi.fn(),
    logServerErrorMock: vi.fn(),
    renameActiveSpaceMock: vi.fn(),
    requestLoggerMock: { child: vi.fn() },
  }));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => requestLoggerMock),
  logServerError: logServerErrorMock,
}));
vi.mock("@/features/settings/server/rename-active-space", () => ({
  renameActiveSpace: renameActiveSpaceMock,
  renameActiveSpaceRequestSchema: {
    safeParse: (value: unknown) => {
      if (
        typeof value !== "object" ||
        value === null ||
        Object.keys(value).length !== 2 ||
        typeof (value as { expectedUpdatedAt?: unknown }).expectedUpdatedAt !== "string" ||
        typeof (value as { name?: unknown }).name !== "string"
      ) {
        return { success: false };
      }

      return { data: value, success: true };
    },
  },
}));

import { PATCH } from "./route";

const EXPECTED_UPDATED_AT = "2026-09-05T16:00:00.000Z";

function authenticatedClient(userId: string | null = "member-id") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(body: unknown = { expectedUpdatedAt: EXPECTED_UPDATED_AT, name: "Our space" }) {
  return new Request("http://localhost/api/spaces/name", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

describe("PATCH /api/spaces/name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(authenticatedClient());
    renameActiveSpaceMock.mockResolvedValue({
      name: "Our space",
      status: "updated",
      updatedAt: "2026-09-05T16:01:00.000Z",
    });
  });

  it("requires authentication before reading the request or invoking the mutation", async () => {
    createClientMock.mockResolvedValue(authenticatedClient(null));
    const body = vi.fn();
    const unauthenticatedRequest = request();
    Object.defineProperty(unauthenticatedRequest, "json", { value: body });

    const response = await PATCH(unauthenticatedRequest);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication is required." });
    expect(body).not.toHaveBeenCalled();
    expect(renameActiveSpaceMock).not.toHaveBeenCalled();
  });

  it("rejects malformed and resource-selecting input", async () => {
    const response = await PATCH(
      request({ expectedUpdatedAt: EXPECTED_UPDATED_AT, name: "Us", spaceId: "x" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please review the highlighted fields.",
      fields: { name: "Enter a name between 2 and 100 characters." },
    });
    expect(renameActiveSpaceMock).not.toHaveBeenCalled();
  });

  it("returns the canonical successful rename", async () => {
    const response = await PATCH(request());

    expect(renameActiveSpaceMock).toHaveBeenCalledWith({
      expectedUpdatedAt: EXPECTED_UPDATED_AT,
      name: "Our space",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "Our space",
      updatedAt: "2026-09-05T16:01:00.000Z",
    });
  });

  it("returns the current canonical name and revision for a stale write", async () => {
    renameActiveSpaceMock.mockResolvedValue({
      name: "Partner's name",
      status: "conflict",
      updatedAt: "2026-09-05T16:02:00.000Z",
    });

    const response = await PATCH(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "conflict",
      name: "Partner's name",
      updatedAt: "2026-09-05T16:02:00.000Z",
    });
  });

  it("keeps unavailable and unexpected failures generic", async () => {
    renameActiveSpaceMock.mockResolvedValue({ status: "unavailable" });
    const unavailableResponse = await PATCH(request());

    expect(unavailableResponse.status).toBe(404);
    await expect(unavailableResponse.json()).resolves.toEqual({
      code: "unavailable",
      error: "This shared space is unavailable.",
    });

    const failure = new Error("private database details");
    renameActiveSpaceMock.mockRejectedValue(failure);
    const failureResponse = await PATCH(request());

    expect(logServerErrorMock).toHaveBeenCalledWith(
      { event: "space_name_failed", operation: "rename_active_space" },
      failure,
      requestLoggerMock,
    );
    expect(failureResponse.status).toBe(500);
    await expect(failureResponse.json()).resolves.toEqual({
      error: "We could not update this space name. Please try again.",
    });
  });
});
