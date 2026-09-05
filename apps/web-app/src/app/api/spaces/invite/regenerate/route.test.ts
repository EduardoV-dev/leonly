import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const rpcMock = vi.hoisted(() => vi.fn());
const syncCurrentUserMock = vi.hoisted(() => vi.fn());
const logServerErrorMock = vi.hoisted(() => vi.fn());
const request = new Request("http://localhost/api/spaces/invite/regenerate", { method: "POST" });

vi.mock("@/features/space-setup/server/sync-current-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
  syncCurrentUser: syncCurrentUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

vi.mock("@/lib/server-logger", () => ({
  createRequestLogger: () => ({}),
  logServerError: logServerErrorMock,
}));

describe("POST /api/spaces/invite/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a regenerated invite to the sole active member", async () => {
    rpcMock.mockResolvedValue({
      data: {
        invite_code: "lny7kmp2",
        invite_code_expires_at: "2026-07-28T12:00:00.000Z",
        status: "regenerated",
      },
      error: null,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      invite_code: "lny7kmp2",
      invite_code_expires_at: "2026-07-28T12:00:00.000Z",
    });
  });

  it("uses the same not-found response for unavailable regeneration", async () => {
    rpcMock.mockResolvedValue({ data: { status: "unavailable" }, error: null });

    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "unavailable", error: "Space not found." });
  });

  it("returns a stale joined result without protected data", async () => {
    rpcMock.mockResolvedValue({ data: { status: "joined" }, error: null });

    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "joined",
      error: "Your partner has already joined this space.",
    });
  });

  it("returns the server-provided remaining rate-limit duration", async () => {
    rpcMock.mockResolvedValue({ data: { retry_after: 413, status: "locked" }, error: null });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("413");
    expect(await response.json()).toEqual({
      error: "Too many invite requests. Try again in 10 minutes.",
    });
  });

  it("returns a generic error when the RPC result is malformed", async () => {
    rpcMock.mockResolvedValue({ data: { status: "regenerated" }, error: null });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "We could not create a new invite. Please try again.",
    });
    expect(logServerErrorMock).toHaveBeenCalledOnce();
  });

  it("does not accept a client-selected space", async () => {
    rpcMock.mockResolvedValue({ data: { status: "unavailable" }, error: null });

    await POST(request);

    expect(rpcMock).toHaveBeenCalledWith("regenerate_space_invite");
  });
});
