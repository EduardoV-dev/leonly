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

type CreateRequestOptions = {
  displayName?: string | null;
  includeDisplayName?: boolean;
  timezone?: string;
};

function createRequest(startDate: string, options: CreateRequestOptions = {}) {
  const {
    displayName = "Leo",
    includeDisplayName = true,
    timezone = "America/Los_Angeles",
  } = options;

  return new Request("http://localhost/api/spaces/create", {
    body: JSON.stringify({
      ...(includeDisplayName ? { display_name: displayName } : {}),
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
        id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
        invite_code: "leoabc23",
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
    expect(await response.json()).toEqual({
      error: "The start date cannot be in the future.",
      field: "start_date",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("passes the timezone to the database integrity boundary", async () => {
    const response = await POST(createRequest("2026-07-22"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ space_id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0" });
    expect(rpcMock).toHaveBeenCalledWith("create_space", {
      p_display_name: "Leo",
      p_space_name: "Forever Us",
      p_start_date: "2026-07-22",
      p_timezone: "America/Los_Angeles",
    });
  });

  it.each([
    { displayName: "", label: "blank" },
    { displayName: null, label: "null" },
    { includeDisplayName: false, label: "missing" },
  ])("passes an empty display name for $label input", async ({ label: _label, ...options }) => {
    const response = await POST(createRequest("2026-07-22", options));

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("create_space", {
      p_display_name: "",
      p_space_name: "Forever Us",
      p_start_date: "2026-07-22",
      p_timezone: "America/Los_Angeles",
    });
  });

  it("rejects a one-character explicit display name", async () => {
    const response = await POST(createRequest("2026-07-22", { displayName: "L" }));

    expect(response.status).toBe(400);
    expect(syncCurrentUserMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("maps active-membership conflicts by PostgreSQL code", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: "L1003", message: "wording can change" },
    });

    const response = await POST(createRequest("2026-07-22"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "You already belong to an active space." });
  });
});
