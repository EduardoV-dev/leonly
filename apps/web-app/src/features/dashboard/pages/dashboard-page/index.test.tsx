import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { DashboardContent } from "./dashboard-content";
import { DashboardShell } from "./dashboard-shell";
import { DashboardError } from "./error";
import { DashboardPage } from "./index";
import { DashboardLoading } from "./loading";

const getActiveSpaceForCurrentUserMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const axiosPostMock = vi.hoisted(() => vi.fn());
const axiosIsAxiosErrorMock = vi.hoisted(() => vi.fn());
const pathnameMock = vi.hoisted(() => vi.fn());

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
  usePathname: pathnameMock,
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

describe("DashboardPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-03-28T12:00:00Z"));
    await act(() => i18n.changeLanguage("en"));
    getUserMock.mockResolvedValue({ data: { user: {} } });
    getActiveSpaceForCurrentUserMock.mockResolvedValue(activeSpace);
    pathnameMock.mockReturnValue("/");
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
    expect(screen.getByTitle("Forever Us")).toBeInTheDocument();
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
    const page = await DashboardPage({
      activeSection: "dashboard",
      children: <DashboardContent />,
    });
    const queryClient = new QueryClient();
    render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);

    expect(screen.getByText("Welcome back, Leo & Annie")).toBeInTheDocument();
    for (const dashboardLink of screen.getAllByRole("link", { name: "Dashboard" })) {
      expect(dashboardLink).toHaveAttribute("href", "/");
      expect(dashboardLink).toHaveAttribute("aria-current", "page");
    }
    for (const timelineLink of screen.getAllByRole("link", { name: "Timeline" })) {
      expect(timelineLink).toHaveAttribute("href", "/timeline");
      expect(timelineLink).not.toHaveAttribute("aria-current");
    }
    for (const vaultLink of screen.getAllByRole("link", { name: "Vault" })) {
      expect(vaultLink).toHaveAttribute("href", "/vault");
      expect(vaultLink).not.toHaveAttribute("aria-current");
    }
    for (const settingsLink of screen.getAllByRole("link", { name: "Settings" })) {
      expect(settingsLink).toHaveAttribute("href", "/settings");
      expect(settingsLink).not.toHaveAttribute("aria-current");
    }
    for (const newEntryLink of screen.getAllByRole("link", { name: "New Entry" })) {
      expect(newEntryLink).toHaveAttribute("href", "/memories/new");
    }
    for (const placesButton of screen.getAllByRole("button", { name: "Places" })) {
      expect(placesButton).toBeDisabled();
    }
  });

  it("renders the refreshed canonical name in dashboard, desktop navigation, and mobile navigation", () => {
    const { rerender } = render(
      <DashboardShell activeSpace={activeSpace} activeSection="dashboard">
        <DashboardContent />
      </DashboardShell>,
    );

    rerender(
      <DashboardShell
        activeSpace={{ ...activeSpace, name: "Our archive" }}
        activeSection="dashboard"
      >
        <DashboardContent />
      </DashboardShell>,
    );

    expect(screen.getByRole("heading", { name: "Our archive" })).toBeInTheDocument();
    expect(screen.getByTitle("Our archive")).toBeInTheDocument();
    expect(screen.getByText("Sharing Our archive together.")).toBeInTheDocument();
  });

  it("marks Vault as current in desktop and mobile navigation", async () => {
    pathnameMock.mockReturnValue("/vault");
    const page = await DashboardPage({ children: <div>Vault route</div> });
    render(page);

    expect(screen.getByText("Vault route")).toBeInTheDocument();
    for (const vaultLink of screen.getAllByRole("link", { name: "Vault" })) {
      expect(vaultLink).toHaveAttribute("aria-current", "page");
    }
    for (const timelineLink of screen.getAllByRole("link", { name: "Timeline" })) {
      expect(timelineLink).not.toHaveAttribute("aria-current");
    }
  });

  it("marks Settings as current in desktop and mobile navigation", async () => {
    pathnameMock.mockReturnValue("/settings");
    const page = await DashboardPage({ children: <div>Settings route</div> });
    render(page);

    expect(screen.getByText("Settings route")).toBeInTheDocument();
    for (const settingsLink of screen.getAllByRole("link", { name: "Settings" })) {
      expect(settingsLink).toHaveAttribute("href", "/settings");
      expect(settingsLink).toHaveAttribute("aria-current", "page");
    }
    for (const timelineLink of screen.getAllByRole("link", { name: "Timeline" })) {
      expect(timelineLink).not.toHaveAttribute("aria-current");
    }
  });

  it("collapses and expands the desktop sidebar navigation", async () => {
    await renderDashboardPage();

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
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
    expect(screen.getByLabelText("Partner invitation code")).toHaveValue("TWO-FW3K3");
    expect(screen.getByRole("button", { name: "Copy code" })).toBeEnabled();
    expect(screen.getAllByRole("img", { name: "Leo's avatar" })).not.toHaveLength(0);
  });

  it("places an unavailable invitation before dashboard summaries without an automatic mutation", async () => {
    getActiveSpaceForCurrentUserMock.mockResolvedValue({
      ...activeSpace,
      active_members: [{ avatar_url: null, display_name: "Leo" }],
      member_names: ["Leo"],
    });

    await renderDashboardPage();

    const invitation = screen.getByRole("heading", { name: "Invite your partner" });
    const recentMemories = screen.getByRole("heading", { name: "Recent Memories" });

    expect(invitation.compareDocumentPosition(recentMemories)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole("button", { name: "Create a new invitation" })).toBeEnabled();
    expect(axiosPostMock).not.toHaveBeenCalled();
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
