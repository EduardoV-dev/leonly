import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationRequiredError } from "@/features/space-setup/server/sync-current-user";
import { POST } from "./route";

const rpcMock = vi.hoisted(() => vi.fn());
const hasActiveSpaceMock = vi.hoisted(() => vi.fn());
const syncCurrentUserMock = vi.hoisted(() => vi.fn());
const request = new Request("http://localhost/api/spaces/setup/complete", { method: "POST" });

vi.mock("@/features/space-setup/server/has-active-space-for-user", () => ({
  hasActiveSpaceForCurrentUser: hasActiveSpaceMock,
}));

vi.mock("@/features/space-setup/server/sync-current-user", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication is required.");
    }
  },
  syncCurrentUser: syncCurrentUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

describe("POST /api/spaces/setup/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasActiveSpaceMock.mockResolvedValue(true);
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  it("completes setup for the current internal membership", async () => {
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ completed: true });
    expect(rpcMock).toHaveBeenCalledWith("complete_space_setup");
  });

  it("keeps the existing unavailable response without parsing database errors", async () => {
    hasActiveSpaceMock.mockResolvedValue(false);

    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "You do not belong to an active space.",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("keeps the existing unauthenticated response before querying memberships", async () => {
    syncCurrentUserMock.mockRejectedValue(new AuthenticationRequiredError());

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication is required." });
    expect(hasActiveSpaceMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
