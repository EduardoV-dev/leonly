import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import { ActiveSpaceAuthenticationError } from "./get-active-space-for-user";
import { getActiveSpaceOrRedirectToAuth } from "./get-active-space-or-redirect";

const { getActiveSpaceMock, redirectMock } = vi.hoisted(() => ({
  getActiveSpaceMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("./get-active-space-for-user", () => ({
  ActiveSpaceAuthenticationError: class ActiveSpaceAuthenticationError extends Error {},
  getActiveSpaceForCurrentUser: getActiveSpaceMock,
}));

describe("getActiveSpaceOrRedirectToAuth", () => {
  beforeEach(() => {
    getActiveSpaceMock.mockReset();
    redirectMock.mockReset();
  });

  it("returns the active-space lookup result", async () => {
    getActiveSpaceMock.mockResolvedValue(null);

    await expect(getActiveSpaceOrRedirectToAuth()).resolves.toBeNull();
  });

  it("redirects authentication failures and propagates other failures", async () => {
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
    getActiveSpaceMock.mockRejectedValue(new ActiveSpaceAuthenticationError());

    await expect(getActiveSpaceOrRedirectToAuth()).rejects.toThrow(
      `NEXT_REDIRECT:${APP_ROUTES.AUTH}`,
    );
    expect(redirectMock).toHaveBeenCalledWith(APP_ROUTES.AUTH);

    getActiveSpaceMock.mockRejectedValue(new Error("service unavailable"));
    await expect(getActiveSpaceOrRedirectToAuth()).rejects.toThrow("service unavailable");
  });
});
