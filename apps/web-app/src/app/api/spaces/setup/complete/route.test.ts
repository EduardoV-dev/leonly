import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock }),
}));

describe("POST /api/spaces/setup/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["L1001", 401, "Authentication is required."],
    ["L1006", 409, "You do not belong to an active space."],
  ])("maps PostgreSQL code %s", async (code, status, message) => {
    rpcMock.mockResolvedValue({ data: null, error: { code, message: "wording can change" } });

    const response = await POST();

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
  });
});
