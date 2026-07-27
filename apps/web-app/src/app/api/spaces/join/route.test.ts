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

function createRequest(displayName = "Leo") {
  return new Request("http://localhost/api/spaces/join", {
    body: JSON.stringify({ display_name: displayName, invite_code: "LNY-7KMP2" }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/spaces/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the joined space identifier", async () => {
    rpcMock.mockResolvedValue({ data: { space_id: 42, status: "joined" }, error: null });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ space_id: 42 });
    expect(rpcMock).toHaveBeenCalledWith("process_space_invite", {
      p_display_name: "Leo",
      p_invite_code: "LNY-7KMP2",
      p_redeem: true,
    });
  });

  it("maps database name validation without changing invite state", async () => {
    rpcMock.mockResolvedValue({ data: { status: "invalid_name" }, error: null });

    const response = await POST(createRequest("L"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Your name must contain 2 to 100 characters.",
    });
  });

  it("redacts unexpected database failures", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpcMock.mockResolvedValue({ data: null, error: { message: "sensitive database detail" } });

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "We could not join this space. Please try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Invite redemption RPC failed.",
      expect.objectContaining({ message: "sensitive database detail" }),
    );
  });
});
