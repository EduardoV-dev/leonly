import { beforeEach, describe, expect, it, vi } from "vitest";
import { serverApi as api } from "@/lib/axios/server-api";
import type { ApiResponse } from "@/types/api-response";
import {
  type ActiveSpace,
  ActiveSpaceAuthenticationError,
  getActiveSpaceForCurrentUser,
} from "./get-active-space-for-user";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/lib/axios/server-api", () => ({
  isAxiosError: (error: unknown): error is { response?: { status: number } } =>
    typeof error === "object" && error !== null && "isAxiosError" in error,
  serverApi: { get: vi.fn() },
}));

const space = {
  active_members: [
    { avatar_url: "https://example.com/leo.jpg", display_name: "Leo" },
    { avatar_url: null, display_name: "Annie" },
  ],
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  invite_code: "twofw3k3",
  invite_code_expires_at: null,
  member_names: ["Leo", "Annie"],
  name: "Our Space",
  onboarding_completed_at: "2025-04-27T00:00:00Z",
  start_date: "2025-04-27",
};

describe("getActiveSpaceForCurrentUser", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    headersMock.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=secret" }));
  });

  it("forwards the current session and validates the active-space response", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ok: true, data: space, error: [], message: "ok" },
    });

    await expect(getActiveSpaceForCurrentUser()).resolves.toEqual(space);
    expect(api.get).toHaveBeenCalledWith("/users/me/space", {
      headers: { cookie: "better-auth.session_token=secret" },
    });
  });

  it("returns null only for a successful absent-membership response", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ok: true, data: null, error: [], message: "ok" },
    });
    await expect(getActiveSpaceForCurrentUser()).resolves.toBeNull();
  });

  it("distinguishes unauthenticated callers from absent membership", async () => {
    vi.mocked(api.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: {} as ApiResponse<ActiveSpace> },
    });
    await expect(getActiveSpaceForCurrentUser()).rejects.toBeInstanceOf(
      ActiveSpaceAuthenticationError,
    );
  });

  it("rejects unsuccessful responses", async () => {
    vi.mocked(api.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 503, data: { ok: false, data: null } },
    });
    await expect(getActiveSpaceForCurrentUser()).rejects.toThrow(
      "Failed to load the active space.",
    );
  });

  it("propagates transport failures", async () => {
    const transportError = new Error("private backend detail");
    vi.mocked(api.get).mockRejectedValue(transportError);

    await expect(getActiveSpaceForCurrentUser()).rejects.toBe(transportError);
  });
});
