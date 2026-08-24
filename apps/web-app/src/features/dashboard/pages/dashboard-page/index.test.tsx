import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardError } from "./error";
import { DashboardPage } from "./index";
import { DashboardLoading } from "./loading";

const getActiveSpaceForCurrentUserMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const axiosPostMock = vi.hoisted(() => vi.fn());
const axiosIsAxiosErrorMock = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: {
    post: axiosPostMock,
  },
  isAxiosError: axiosIsAxiosErrorMock,
}));

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

vi.mock("@/features/memories/components/memories-timeline", () => ({
  MemoriesTimeline: ({ variant }: { variant?: string }) => (
    <div data-testid="timeline-memories" data-variant={variant}>
      Timeline memories
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ refresh: vi.fn() }),
}));

const activeSpace = {
  active_members: [
    { avatar_url: "https://example.com/leo.jpg", display_name: "Leo" },
    { avatar_url: null, display_name: "Annie" },
  ],
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  invite_code: null,
  invite_code_expires_at: null,
  member_names: ["Leo", "Annie"],
  name: "Forever Us",
  onboarding_completed_at: "2026-07-15T00:00:00.000Z",
  start_date: "2023-03-26",
};

const renderDashboardPage = async () => {
  const page = await DashboardPage();
  const queryClient = new QueryClient();

  render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);
};

const flushReactQuery = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-03-28T12:00:00Z"));
    getUserMock.mockResolvedValue({ data: { user: {} } });
    getActiveSpaceForCurrentUserMock.mockResolvedValue(activeSpace);
    axiosPostMock.mockResolvedValue({
      data: {
        invite_code: "newcode",
        invite_code_expires_at: "2023-03-29T12:00:00.000Z",
      },
    });
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders active-space members with avatar fallbacks and truthful empty states", async () => {
    await renderDashboardPage();

    expect(screen.getByRole("heading", { name: "Forever Us" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back, Leo & Annie")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3 days together" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Leo's avatar" })).not.toHaveLength(0);
    expect(screen.getAllByRole("img", { name: "Annie's avatar" })).not.toHaveLength(0);
    expect(screen.getByText("Timeline memories")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-memories")).toHaveAttribute("data-variant", "recent");
    expect(screen.queryByRole("link", { name: "Add a memory" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No rated places yet" })).toBeInTheDocument();
    expect(screen.queryByText("Autumn in Paris")).not.toBeInTheDocument();
    expect(screen.queryByText("Casa Luna")).not.toBeInTheDocument();
  });

  it("renders route content inside the persistent app shell", async () => {
    const page = await DashboardPage({ activeSection: "timeline", children: <p>Route content</p> });
    const queryClient = new QueryClient();
    render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);

    expect(screen.getByText("Route content")).toBeInTheDocument();
    for (const dashboardLink of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(dashboardLink).toHaveAttribute("href", "/");
    }
    for (const timelineLink of screen.getAllByRole("link", { name: "Timeline" })) {
      expect(timelineLink).toHaveAttribute("href", "/timeline");
      expect(timelineLink).toHaveAttribute("aria-current", "page");
    }
    for (const newEntryLink of screen.getAllByRole("link", { name: "New Entry" })) {
      expect(newEntryLink).toHaveAttribute("href", "/timeline/new");
    }
    for (const placeholder of ["Places", "Vault", "Settings"]) {
      for (const placeholderButton of screen.getAllByRole("button", { name: placeholder })) {
        expect(placeholderButton).toBeDisabled();
      }
    }
  });

  it("renders an invitation state for a one-member space", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      invite_code: "twofw3k3",
      invite_code_expires_at: "2023-03-29T12:00:00.000Z",
      member_names: ["Leo"],
    });

    await renderDashboardPage();

    expect(screen.getByRole("heading", { name: "Waiting for your person" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3 days together" })).toBeInTheDocument();
    expect(screen.getByText("TWO-FW3K3")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Leo's avatar" })).not.toHaveLength(0);
  });

  it("automatically creates an invite when the one-member invite is missing", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      member_names: ["Leo"],
    });

    await renderDashboardPage();

    await flushReactQuery();

    expect(screen.getByText("NEW-CODE")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create a new invite" })).not.toBeInTheDocument();
  });

  it("automatically regenerates an expired invite", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      invite_code: "twofw3k3",
      invite_code_expires_at: "2023-03-28T12:00:00.000Z",
      member_names: ["Leo"],
    });

    await renderDashboardPage();
    await flushReactQuery();

    expect(screen.getByText("NEW-CODE")).toBeInTheDocument();
    expect(axiosPostMock).toHaveBeenCalledOnce();
    expect(axiosPostMock).toHaveBeenCalledWith("/api/spaces/invite/regenerate");
    expect(screen.queryByRole("button", { name: "Create a new invite" })).not.toBeInTheDocument();
  });

  it("automatically regenerates an invite when it expires while displayed", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      invite_code: "twofw3k3",
      invite_code_expires_at: "2023-03-28T12:00:01.000Z",
      member_names: ["Leo"],
    });

    await renderDashboardPage();

    expect(screen.getByText("TWO-FW3K3")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await flushReactQuery();

    expect(screen.getByText("NEW-CODE")).toBeInTheDocument();
    expect(axiosPostMock).toHaveBeenCalledOnce();
  });

  it("keeps retrying automatic invite creation after a network failure", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      member_names: ["Leo"],
    });
    axiosIsAxiosErrorMock.mockReturnValue(true);
    axiosPostMock.mockRejectedValueOnce(new Error("network failed")).mockResolvedValueOnce({
      data: {
        invite_code: "newcode",
        invite_code_expires_at: "2023-03-29T12:00:00.000Z",
      },
    });

    await renderDashboardPage();

    await flushReactQuery();

    expect(axiosPostMock).toHaveBeenCalledOnce();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await flushReactQuery();

    expect(screen.getByText("NEW-CODE")).toBeInTheDocument();
    expect(axiosPostMock).toHaveBeenCalledTimes(2);
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

  it("renders an active space even when legacy onboarding state is incomplete", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      onboarding_completed_at: null,
    });

    await renderDashboardPage();

    expect(screen.getByRole("heading", { name: "Forever Us" })).toBeInTheDocument();
  });

  it("uses only the authenticated active-space response", async () => {
    await renderDashboardPage();

    expect(getActiveSpaceForCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Another Space")).not.toBeInTheDocument();
  });

  it("omits derived date copy and shows recovery when the date is unavailable", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      start_date: "2023-02-30",
    });

    await renderDashboardPage();

    expect(screen.queryByText(/^Since /)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Day count unavailable" })).toBeInTheDocument();
    expect(screen.queryByText(/days together/i)).not.toBeInTheDocument();
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
    expect(screen.queryByText("Opening your shared space")).not.toBeInTheDocument();
  });
});
