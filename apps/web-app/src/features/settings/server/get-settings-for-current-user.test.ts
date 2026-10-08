import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSettingsForCurrentUser } from "./get-settings-for-current-user";

const { get, cookieHeaders } = vi.hoisted(() => ({ get: vi.fn(), cookieHeaders: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: cookieHeaders }));
vi.mock("@/lib/axios/server-api", () => ({
  serverApi: { get },
  isAxiosError: (error: { isAxiosError?: boolean }) => error.isAxiosError,
}));

describe("getSettingsForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieHeaders.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=session" }));
  });

  it("loads the Nest settings model with the current session cookie", async () => {
    const settings = {
      account: { email: "leo@example.com", providerLabel: "Google" },
      activeMembers: [],
    };
    get.mockResolvedValue({ data: { ok: true, data: settings } });
    await expect(getSettingsForCurrentUser()).resolves.toEqual({ status: "success", settings });
    expect(get).toHaveBeenCalledWith("/users/me/settings", {
      headers: { cookie: "better-auth.session_token=session" },
    });
  });

  it("preserves the setup redirect state when Nest returns no active space", async () => {
    get.mockResolvedValue({ data: { ok: true, data: null } });
    await expect(getSettingsForCurrentUser()).resolves.toEqual({ status: "no-active-space" });
  });

  it("preserves the authentication redirect state for an expired session", async () => {
    get.mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    await expect(getSettingsForCurrentUser()).resolves.toEqual({ status: "unauthenticated" });
  });

  it("throws a safe recoverable error on API or network failures", async () => {
    get.mockRejectedValue(new Error("private connection detail"));
    await expect(getSettingsForCurrentUser()).rejects.toThrow("Failed to load Settings.");
    get.mockRejectedValue({ isAxiosError: true, response: { status: 500 } });
    await expect(getSettingsForCurrentUser()).rejects.toThrow("Failed to load Settings.");
  });
});
