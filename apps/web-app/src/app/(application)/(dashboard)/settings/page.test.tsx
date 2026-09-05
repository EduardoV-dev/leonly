import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSettingsForCurrentUser } from "@/features/settings/server/get-settings-for-current-user";
import Page from "./page";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/settings/server/get-settings-for-current-user", () => ({
  getSettingsForCurrentUser: vi.fn(),
}));
vi.mock("@/features/settings/pages/settings-page", () => ({
  SettingsPage: ({ settings }: { settings: { space: { name: string } } }) => (
    <div>Settings for {settings.space.name}</div>
  ),
}));

const settings = {
  account: { email: "leo@example.com", providerLabel: "Google" },
  activeMembers: [],
  invite: { code: null, expiresAt: null, isAvailable: false },
  membershipState: "one-member" as const,
  space: {
    name: "Our Space",
    startDate: "2025-04-27",
    updatedAt: "2026-09-05T16:00:00.000Z",
  },
};

describe("Settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("renders only the current user's server-derived settings", async () => {
    vi.mocked(getSettingsForCurrentUser).mockResolvedValue({ settings, status: "success" });

    render(await Page());

    expect(screen.getByText("Settings for Our Space")).toBeInTheDocument();
    expect(getSettingsForCurrentUser).toHaveBeenCalledWith();
  });

  it("redirects an unauthenticated request", async () => {
    vi.mocked(getSettingsForCurrentUser).mockResolvedValue({ status: "unauthenticated" });

    await expect(Page()).rejects.toThrow("NEXT_REDIRECT:/auth");
  });

  it("redirects a user without active membership to setup", async () => {
    vi.mocked(getSettingsForCurrentUser).mockResolvedValue({ status: "no-active-space" });

    await expect(Page()).rejects.toThrow("NEXT_REDIRECT:/welcome/create/start");
  });

  it("surfaces failed reads to the route error boundary", async () => {
    vi.mocked(getSettingsForCurrentUser).mockRejectedValue(new Error("Failed to load Settings."));

    await expect(Page()).rejects.toThrow("Failed to load Settings.");
  });
});
