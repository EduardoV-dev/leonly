import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  it("renders the dashboard for a signed-in member with a completed space", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          user_metadata: { full_name: "Leo Martins" },
        },
      },
    });
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      id: 1,
      invite_code: null,
      invite_code_expires_at: null,
      name: "Our Story",
      onboarding_completed_at: "2026-07-15T00:00:00.000Z",
      start_date: "2023-03-26",
    });

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: /days together/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent Memories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Memory" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "A couple sharing a moment" })).toBeInTheDocument();
  });
});
