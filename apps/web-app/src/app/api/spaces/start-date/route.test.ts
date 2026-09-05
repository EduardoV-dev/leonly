import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, mutationMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  mutationMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/server-logger", () => ({ createRequestLogger: vi.fn(), logServerError: vi.fn() }));
vi.mock("@/features/settings/server/update-active-space-start-date", () => ({
  updateActiveSpaceStartDate: mutationMock,
  updateActiveSpaceStartDateRequestSchema: {
    safeParse: (value: unknown) => {
      if (typeof value !== "object" || value === null || Object.keys(value).length !== 3)
        return { success: false };
      return { data: value, success: true };
    },
  },
}));

import { PATCH } from "./route";

const body = {
  expectedUpdatedAt: "2026-09-05T16:00:00.000Z",
  startDate: "2025-04-27",
  timezone: "UTC",
};
const request = (value: unknown = body) =>
  new Request("http://localhost/api/spaces/start-date", {
    body: JSON.stringify(value),
    method: "PATCH",
  });

describe("PATCH /api/spaces/start-date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member" } } }) },
    });
    mutationMock.mockResolvedValue({
      startDate: "2025-04-27",
      status: "updated",
      updatedAt: "2026-09-05T16:01:00.000Z",
    });
  });

  it("requires authentication before processing the request", async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    expect((await PATCH(request())).status).toBe(401);
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it("returns canonical success, conflict details, and generic unavailability", async () => {
    await expect((await PATCH(request())).json()).resolves.toEqual({
      startDate: "2025-04-27",
      updatedAt: "2026-09-05T16:01:00.000Z",
    });
    mutationMock.mockResolvedValue({
      startDate: "2025-04-20",
      status: "conflict",
      updatedAt: "2026-09-05T16:02:00.000Z",
    });
    const conflict = await PATCH(request());
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({
      code: "conflict",
      startDate: "2025-04-20",
      updatedAt: "2026-09-05T16:02:00.000Z",
    });
    mutationMock.mockResolvedValue({ status: "unavailable" });
    expect((await PATCH(request())).status).toBe(404);
  });
});
