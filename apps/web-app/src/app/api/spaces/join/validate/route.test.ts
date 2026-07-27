import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const rpcMock = vi.hoisted(() => vi.fn());
const syncCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/sync-current-user", () => ({
  syncCurrentUser: syncCurrentUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

function createRequest(inviteCode: string) {
  return new Request("http://localhost/api/spaces/join/validate", {
    body: JSON.stringify({ invite_code: inviteCode }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/spaces/join/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates malformed codes so the database records the failure", async () => {
    rpcMock.mockResolvedValue({ data: { status: "malformed" }, error: null });

    const response = await POST(createRequest("bad-code"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The format of the code provided is invalid.",
    });
    expect(rpcMock).toHaveBeenCalledWith("process_space_invite", {
      p_display_name: null,
      p_invite_code: "bad-code",
      p_redeem: false,
    });
  });

  it("returns the exact lock response without exposing invite state", async () => {
    rpcMock.mockResolvedValue({ data: { retry_after: 600, status: "locked" }, error: null });

    const response = await POST(createRequest("LNY-7KMP2"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
    expect(await response.json()).toEqual({
      error: "Too many join attempts. Try again in 10 minutes.",
    });
  });

  it("uses one generic response for unavailable invites", async () => {
    rpcMock.mockResolvedValue({ data: { status: "unavailable" }, error: null });

    const response = await POST(createRequest("LNY-7KMP2"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "This invite is invalid or unavailable." });
  });
});
