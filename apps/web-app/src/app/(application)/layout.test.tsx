import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationLayout from "./layout";

const getUserMock = vi.hoisted(() => vi.fn());
const hasActiveSpaceMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/space-setup/server/has-active-space-for-user", () => ({
  hasActiveSpaceForCurrentUser: hasActiveSpaceMock,
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

describe("ApplicationLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: {} } });
    hasActiveSpaceMock.mockResolvedValue(true);
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("renders application routes for an authenticated user with an active space", async () => {
    render(await ApplicationLayout({ children: <p>Application content</p> }));

    expect(screen.getByText("Application content")).toBeInTheDocument();
  });

  it("redirects unauthenticated users before checking for a space", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(ApplicationLayout({ children: <p>Application content</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/auth",
    );
    expect(hasActiveSpaceMock).not.toHaveBeenCalled();
  });

  it("redirects authenticated users without an active space to setup", async () => {
    hasActiveSpaceMock.mockResolvedValue(false);

    await expect(ApplicationLayout({ children: <p>Application content</p> })).rejects.toThrow(
      "NEXT_REDIRECT:/welcome/create/start",
    );
  });
});
