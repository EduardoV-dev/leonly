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

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      invite_code: "lny7kmp2",
      invite_code_expires_at: "2026-07-28T12:00:00.000Z",
    });
  });

  it("uses the same not-found response for unavailable regeneration", async () => {
    rpcMock.mockResolvedValue({ data: { status: "unavailable" }, error: null });

    const response = await POST();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Space not found." });
  });
});
