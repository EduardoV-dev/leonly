import { beforeEach, describe, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";
import { getSettingsForCurrentUser } from "./get-settings-for-current-user";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/server-logger", () => ({ logServerError: vi.fn() }));

const CURRENT_MEMBERSHIP_ID = "7d8e8d54-e7a7-490c-805f-a342d407523f";
const CURRENT_USER_ID = "9e12d25f-5f14-492e-8844-36dab92e740d";
const PARTNER_MEMBERSHIP_ID = "4f62149f-680c-43af-aef1-23f89972b771";
const SPACE_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

const currentMember = {
  avatar_url: "https://example.com/leo.jpg",
  created_at: "2025-04-27T10:00:00.000Z",
  display_name: "Leo",
  is_current_member: true,
  membership_id: CURRENT_MEMBERSHIP_ID,
  role: "owner",
};
const partnerMember = {
  avatar_url: null,
  created_at: "2025-05-01T12:30:00.000Z",
  display_name: "Annie",
  is_current_member: false,
  membership_id: PARTNER_MEMBERSHIP_ID,
  role: "partner",
};
const rpcSettings = {
  active_members: [currentMember],
  id: SPACE_ID,
  invite_code: "twofw3k3",
  invite_code_expires_at: "2026-09-05T12:00:00.000Z",
  invite_code_is_available: true,
  name: "Our Space",
  start_date: "2025-04-27",
};

function mockSupabase({
  authError = null,
  rpcData = rpcSettings,
  rpcError = null,
  user = {
    app_metadata: { provider: "google" },
    email: "leo@example.com",
    id: CURRENT_USER_ID,
  },
}: {
  authError?: unknown;
  rpcData?: unknown;
  rpcError?: unknown;
  user?: null | { app_metadata: Record<string, unknown>; email?: string; id: string };
} = {}) {
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: authError });
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: rpcError });
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser }, rpc } as never);
  return { getUser, rpc };
}

describe("getSettingsForCurrentUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the one-member Settings model without raw auth or member user IDs", async () => {
    const { rpc } = mockSupabase();

    await expect(getSettingsForCurrentUser()).resolves.toEqual({
      settings: {
        account: { email: "leo@example.com", providerLabel: "Google" },
        activeMembers: [
          {
            avatarUrl: "https://example.com/leo.jpg",
            displayName: "Leo",
            id: CURRENT_MEMBERSHIP_ID,
            isCurrentMember: true,
            joinedAt: "2025-04-27T10:00:00.000Z",
            role: "owner",
          },
        ],
        invite: {
          code: "twofw3k3",
          expiresAt: "2026-09-05T12:00:00.000Z",
          isAvailable: true,
        },
        membershipState: "one-member",
        space: { name: "Our Space", startDate: "2025-04-27" },
      },
      status: "success",
    });
    expect(rpc).toHaveBeenCalledWith("get_active_space_settings");
    expect(rpc.mock.calls[0]).toHaveLength(1);
    expect(JSON.stringify(await getSettingsForCurrentUser())).not.toContain(CURRENT_USER_ID);
  });

  it("returns two members and no actionable invite", async () => {
    mockSupabase({
      rpcData: {
        ...rpcSettings,
        active_members: [currentMember, partnerMember],
        invite_code: null,
        invite_code_expires_at: null,
        invite_code_is_available: false,
      },
    });

    const result = await getSettingsForCurrentUser();

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Expected Settings to load.");
    }
    expect(result.settings.membershipState).toBe("two-member");
    expect(result.settings.activeMembers).toHaveLength(2);
    expect(result.settings.invite).toEqual({ code: null, expiresAt: null, isAvailable: false });
  });

  it("uses safe fallbacks for missing account, invite, and avatar data", async () => {
    mockSupabase({
      rpcData: {
        ...rpcSettings,
        active_members: [{ ...currentMember, avatar_url: null }],
        invite_code: null,
        invite_code_expires_at: null,
        invite_code_is_available: false,
      },
      user: { app_metadata: { provider: "unsupported-provider" }, id: CURRENT_USER_ID },
    });

    const result = await getSettingsForCurrentUser();

    expect(result).toMatchObject({
      settings: {
        account: { email: null, providerLabel: null },
        activeMembers: [{ avatarUrl: null }],
        invite: { code: null, expiresAt: null, isAvailable: false },
      },
      status: "success",
    });
  });

  it("returns unauthenticated without calling the RPC", async () => {
    const { rpc } = mockSupabase({ user: null });

    await expect(getSettingsForCurrentUser()).resolves.toEqual({ status: "unauthenticated" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns no-active-space for a null RPC result", async () => {
    mockSupabase({ rpcData: null });

    await expect(getSettingsForCurrentUser()).resolves.toEqual({ status: "no-active-space" });
  });

  it("logs and throws a safe error when auth verification fails", async () => {
    const authError = { code: "unexpected_failure", message: "private auth detail" };
    const { rpc } = mockSupabase({ authError, user: null });

    await expect(getSettingsForCurrentUser()).rejects.toThrow(
      "Failed to load Settings account context.",
    );
    expect(logServerError).toHaveBeenCalledWith(
      { event: "supabase_operation_failed", operation: "get_settings_current_user" },
      authError,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("logs and throws a safe error when the RPC fails", async () => {
    const rpcError = { code: "42501", message: "private database detail" };
    mockSupabase({ rpcData: null, rpcError });

    await expect(getSettingsForCurrentUser()).rejects.toThrow("Failed to load Settings.");
    expect(logServerError).toHaveBeenCalledWith(
      { event: "supabase_operation_failed", operation: "get_active_space_settings" },
      rpcError,
    );
  });
});
