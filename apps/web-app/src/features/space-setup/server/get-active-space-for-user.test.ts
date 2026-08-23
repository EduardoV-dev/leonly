import { describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { getActiveSpaceForCurrentUser } from "./get-active-space-for-user";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/server-logger", () => ({
  logServerError: vi.fn(),
}));

describe("getActiveSpaceForCurrentUser", () => {
  it("returns two ordered active members and their avatars", async () => {
    const space = {
      active_members: [
        { avatar_url: "https://example.com/leo.jpg", display_name: "Leo" },
        { avatar_url: null, display_name: "Annie" },
      ],
      id: 1,
      invite_code: "twofw3k3",
      invite_code_expires_at: null,
      member_names: ["Leo", "Annie"],
      name: "Our Space",
      onboarding_completed_at: "2025-04-27T00:00:00Z",
      start_date: "2025-04-27",
    };
    const rpc = vi.fn().mockResolvedValue({ data: space, error: null });

    vi.mocked(createClient).mockResolvedValue({ rpc } as never);

    await expect(getActiveSpaceForCurrentUser()).resolves.toEqual(space);
    expect(rpc).toHaveBeenCalledWith("get_active_space");
  });

  it("returns a single active member without an avatar", async () => {
    const space = {
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      id: 1,
      invite_code: "twofw3k3",
      invite_code_expires_at: null,
      member_names: ["Leo"],
      name: "Our Space",
      onboarding_completed_at: "2025-04-27T00:00:00Z",
      start_date: "2025-04-27",
    };
    const rpc = vi.fn().mockResolvedValue({ data: space, error: null });

    vi.mocked(createClient).mockResolvedValue({ rpc } as never);

    await expect(getActiveSpaceForCurrentUser()).resolves.toEqual(space);
  });

  it("logs the RPC failure while preserving the safe error", async () => {
    const rpcError = {
      code: "42501",
      details: "permission denied for leo@example.com",
      message: "permission denied",
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });

    vi.mocked(createClient).mockResolvedValue({ rpc } as never);

    await expect(getActiveSpaceForCurrentUser()).rejects.toThrow(
      "Failed to load the active space.",
    );
    expect(logServerError).toHaveBeenCalledWith(
      { event: "supabase_operation_failed", operation: "get_active_space" },
      rpcError,
    );
  });
});
