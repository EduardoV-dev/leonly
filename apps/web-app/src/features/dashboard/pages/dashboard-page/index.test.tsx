import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardError } from "./error";
import { DashboardPage } from "./index";
import { DashboardLoading } from "./loading";

const getActiveSpaceForCurrentUserMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/get-active-space-for-user", () => ({
  getActiveSpaceForCurrentUser: getActiveSpaceForCurrentUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const activeSpace = {
  active_members: [
    { avatar_url: "https://example.com/leo.jpg", display_name: "Leo" },
    { avatar_url: null, display_name: "Annie" },
  ],
  id: 1,
  invite_code: null,
  invite_code_expires_at: null,
  member_names: ["Leo", "Annie"],
  name: "Forever Us",
  onboarding_completed_at: "2026-07-15T00:00:00.000Z",
  start_date: "2023-03-26",
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-03-28T12:00:00Z"));
    getUserMock.mockResolvedValue({ data: { user: {} } });
    getActiveSpaceForCurrentUserMock.mockResolvedValue(activeSpace);
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders active-space members with avatar fallbacks and truthful empty states", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Forever Us" })).toBeInTheDocument();
    expect(screen.getByText("Since March 2023")).toBeInTheDocument();
    expect(screen.getByText("Welcome back, Leo & Annie")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2 Days Together" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Leo's avatar" })).not.toHaveLength(0);
    expect(screen.getAllByRole("img", { name: "Annie's avatar" })).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "No memories yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No rated places yet" })).toBeInTheDocument();
    expect(screen.queryByText("Autumn in Paris")).not.toBeInTheDocument();
    expect(screen.queryByText("Casa Luna")).not.toBeInTheDocument();
  });

  it("renders an invitation state for a one-member space", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      invite_code: "twofw3k3",
      member_names: ["Leo"],
    });

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Waiting for your person" })).toBeInTheDocument();
    expect(screen.getByText("twofw3k3")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Leo's avatar" })).not.toHaveLength(0);
  });

  it("redirects an unauthenticated user before loading a space", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/auth");
    expect(getActiveSpaceForCurrentUserMock).not.toHaveBeenCalled();
  });

  it("redirects a user without an active space to setup", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/welcome/create/start");
  });

  it("redirects incomplete onboarding to the invite step", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      onboarding_completed_at: null,
    });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT:/welcome/create/invite");
  });

  it("uses only the authenticated active-space response", async () => {
    render(await DashboardPage());

    expect(getActiveSpaceForCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Another Space")).not.toBeInTheDocument();
  });

  it("surfaces query failures to the recoverable error boundary", async () => {
    const reset = vi.fn();
    getActiveSpaceForCurrentUserMock.mockRejectedValue(new Error("query failed"));

    await expect(DashboardPage()).rejects.toThrow("query failed");

    render(<DashboardError error={new Error("query failed")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders a dashboard loading state", () => {
    render(<DashboardLoading />);

    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeInTheDocument();
  });
});
