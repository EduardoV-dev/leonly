import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./index";

const getActiveSpaceForCurrentUserMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());

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
  redirect: vi.fn(),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-03-28T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the dashboard for a signed-in member with a completed space", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {},
      },
    });
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      id: 1,
      invite_code: null,
      invite_code_expires_at: null,
      member_names: ["Leo", "Annie"],
      name: "Forever Us",
      onboarding_completed_at: "2026-07-15T00:00:00.000Z",
      start_date: "2023-03-26",
    });

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Forever Us" })).toBeInTheDocument();
    expect(screen.getByText("Since March 2023")).toBeInTheDocument();
    expect(screen.getByText("Welcome back, Leo & Annie")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2 Days Together" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent Memories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Memory" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "A couple sharing a moment" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Mobile dashboard sections" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Our profile" })).toBeInTheDocument();
    for (const timelineLink of screen.getAllByRole("link", { name: "Timeline" })) {
      expect(timelineLink).not.toHaveAttribute("class");
    }
  });

  it("welcomes only the owner while the space has no partner", async () => {
    getUserMock.mockResolvedValue({ data: { user: {} } });
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      id: 1,
      invite_code: null,
      invite_code_expires_at: null,
      member_names: ["Leo"],
      name: "Forever Us",
      onboarding_completed_at: "2026-07-15T00:00:00.000Z",
      start_date: "2023-03-26",
    });

    render(await DashboardPage());

    expect(screen.getByText("Welcome back, Leo")).toBeInTheDocument();
  });
});
