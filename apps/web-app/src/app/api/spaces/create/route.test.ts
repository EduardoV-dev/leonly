import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const getActiveSpaceMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());
const syncCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/get-active-space-for-user", () => ({
  getActiveSpaceForCurrentUser: getActiveSpaceMock,
}));

vi.mock("@/features/space-setup/server/sync-current-user", () => ({
  syncCurrentUser: syncCurrentUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

function createRequest(startDate: string, timezone = "America/Los_Angeles") {
  return new Request("http://localhost/api/spaces/create", {
    body: JSON.stringify({
      display_name: "Leo",
      space_name: "Forever Us",
      start_date: startDate,
      timezone,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/spaces/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T01:00:00Z"));
    getActiveSpaceMock.mockResolvedValue(null);
    rpcMock.mockResolvedValue({
      data: {
        id: 1,
        invite_code: "leoabc23",
        name: "Forever Us",
        start_date: "2026-07-22",
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["", "2026-7-22", "2026-02-30"])(
    "rejects invalid date %s without creating data",
    async (startDate) => {
      const response = await POST(createRequest(startDate));

      expect(response.status).toBe(400);
      expect(syncCurrentUserMock).not.toHaveBeenCalled();
      expect(rpcMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a date after local today across a UTC offset", async () => {
    const response = await POST(createRequest("2026-07-23"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "The start date cannot be in the future." });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("passes the timezone to the database integrity boundary", async () => {
    const response = await POST(createRequest("2026-07-22"));

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("create_space", {
      p_display_name: "Leo",
      p_space_name: "Forever Us",
      p_start_date: "2026-07-22",
      p_timezone: "America/Los_Angeles",
    });
  });
});
