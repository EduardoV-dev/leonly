import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logServerErrorMock, requestLoggerMock, updateDisplayNameMock } =
  vi.hoisted(() => ({
    createClientMock: vi.fn(),
    logServerErrorMock: vi.fn(),
    requestLoggerMock: { child: vi.fn() },
    updateDisplayNameMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: vi.fn(() => requestLoggerMock),
  logServerError: logServerErrorMock,
}));
vi.mock(
  "@/features/settings/server/update-active-membership-display-name",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/settings/server/update-active-membership-display-name")
      >();
    return { ...actual, updateActiveMembershipDisplayName: updateDisplayNameMock };
  },
);

import { PATCH } from "./route";

const EXPECTED_UPDATED_AT = "2026-09-05T16:00:00.000Z";
const UPDATED_AT = "2026-09-05T16:01:00.000Z";

function authenticatedClient(userId: string | null = "member-id") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

function request(
  body: unknown = { displayName: "New name", expectedUpdatedAt: EXPECTED_UPDATED_AT },
) {
  return new Request("http://localhost/api/membership/display-name", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

const invalidResponse = {
  error: "Please review the highlighted fields.",
  fields: { displayName: "Enter a name between 2 and 100 characters." },
};

describe("PATCH /api/membership/display-name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue(authenticatedClient());
    updateDisplayNameMock.mockResolvedValue({
      displayName: "New name",
      status: "updated",
      updatedAt: UPDATED_AT,
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
    expect(updateDisplayNameMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const malformedRequest = new Request("http://localhost/api/membership/display-name", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });

    const response = await PATCH(malformedRequest);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(invalidResponse);
    expect(updateDisplayNameMock).not.toHaveBeenCalled();
  });

  it.each([
    { membershipId: "other-membership" },
    { ownerId: "other-owner" },
    { role: "owner" },
    { spaceId: "other-space" },
    { userId: "other-user" },
  ])("rejects the extra identity selector %#", async (identity) => {
    const response = await PATCH(request({ ...requestBody(), ...identity }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(invalidResponse);
    expect(updateDisplayNameMock).not.toHaveBeenCalled();
  });

  it("normalizes whitespace and accepts the inclusive Unicode boundaries", async () => {
    const minimumResponse = await PATCH(request({ ...requestBody(), displayName: "  😀a  " }));
    expect(minimumResponse.status).toBe(200);
    expect(updateDisplayNameMock).toHaveBeenLastCalledWith({
      displayName: "😀a",
      expectedUpdatedAt: EXPECTED_UPDATED_AT,
    });

    const maximumName = "😀".repeat(100);
    const maximumResponse = await PATCH(request({ ...requestBody(), displayName: maximumName }));
    expect(maximumResponse.status).toBe(200);
    expect(updateDisplayNameMock).toHaveBeenLastCalledWith({
      displayName: maximumName,
      expectedUpdatedAt: EXPECTED_UPDATED_AT,
    });
  });

  it.each(["😀", "😀".repeat(101), "   "])("rejects invalid boundary input %#", async (name) => {
    const response = await PATCH(request({ ...requestBody(), displayName: name }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(invalidResponse);
    expect(updateDisplayNameMock).not.toHaveBeenCalled();
  });

  it("returns the canonical successful update", async () => {
    const response = await PATCH(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      displayName: "New name",
      updatedAt: UPDATED_AT,
    });
  });

  it("returns canonical conflict metadata", async () => {
    updateDisplayNameMock.mockResolvedValue({
      displayName: "Current name",
      status: "conflict",
      updatedAt: UPDATED_AT,
    });

    const response = await PATCH(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "conflict",
      displayName: "Current name",
      updatedAt: UPDATED_AT,
    });
  });

  it("maps service validation to the generic field response", async () => {
    updateDisplayNameMock.mockResolvedValue({ status: "invalid" });

    const response = await PATCH(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(invalidResponse);
  });

  it("keeps inactive or otherwise unavailable membership states generic", async () => {
    updateDisplayNameMock.mockResolvedValue({ status: "unavailable" });

    const response = await PATCH(request());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "unavailable",
      error: "This membership is unavailable.",
    });
  });

  it("logs unexpected failures without disclosing their details", async () => {
    const failure = new Error("private database details");
    updateDisplayNameMock.mockRejectedValue(failure);

    const response = await PATCH(request());

    expect(logServerErrorMock).toHaveBeenCalledWith(
      {
        event: "membership_display_name_failed",
        operation: "update_active_membership_display_name",
      },
      failure,
      requestLoggerMock,
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not update this display name. Please try again.",
    });
  });
});

function requestBody() {
  return { displayName: "New name", expectedUpdatedAt: EXPECTED_UPDATED_AT };
}
