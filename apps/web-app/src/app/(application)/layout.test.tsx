import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationLayout from "./layout";

vi.mock("server-only", () => ({}));
const getActiveSpaceMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const activeSpaceAuthenticationError = vi.hoisted(
  () => class ActiveSpaceAuthenticationError extends Error {},
);

vi.mock("@/features/space-setup/server/get-active-space-for-user", () => ({
  ActiveSpaceAuthenticationError: activeSpaceAuthenticationError,
  getActiveSpaceForCurrentUser: getActiveSpaceMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("ApplicationLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpaceMock.mockResolvedValue({
      id: "space-id",
      onboarding_completed_at: "2026-09-30T00:00:00.000Z",
    });
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("renders application routes for an authenticated user with an active space", async () => {
    render(await ApplicationLayout({ children: <p>Application content</p> }));

    expect(screen.getByText("Application content")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to authentication", async () => {
    const { ActiveSpaceAuthenticationError } = await import(
      "@/features/space-setup/server/get-active-space-for-user"
    );
    getActiveSpaceMock.mockRejectedValue(new ActiveSpaceAuthenticationError());

    await expect(ApplicationLayout({ children: <p>Application content</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/auth",
    );
    expect(getActiveSpaceMock).toHaveBeenCalledOnce();
  });

  it("redirects authenticated users without an active space to setup", async () => {
    getActiveSpaceMock.mockResolvedValue(null);

    await expect(ApplicationLayout({ children: <p>Application content</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/welcome/create/start",
    );
  });

  it("routes members with incomplete setup to the invite step", async () => {
    getActiveSpaceMock.mockResolvedValue({ id: "space-id", onboarding_completed_at: null });

    await expect(ApplicationLayout({ children: <p>Application content</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/welcome/create/invite",
    );
  });

  it("lets backend failures reach the application error boundary", async () => {
    getActiveSpaceMock.mockRejectedValue(new Error("Failed to load the active space."));
    await expect(ApplicationLayout({ children: <p>Application content</p> })).rejects.toThrow(
      "Failed to load the active space.",
    );
  });
});
