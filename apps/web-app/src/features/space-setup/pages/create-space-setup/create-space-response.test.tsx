import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import { i18n } from "@/lib/i18n";
import { CREATE_SPACE_STORAGE_KEY } from "../../constants/local-storage";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import { SpaceCreateSetupPage } from ".";
import "../setup-api-tests";

const fetchMock = vi.hoisted(() => vi.fn());
const locationMock = vi.hoisted(() => ({ assign: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}));

describe("create-space API response", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    locationMock.assign.mockReset();
    vi.stubGlobal("location", locationMock);
    sessionStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    sessionStorage.setItem(
      CREATE_SPACE_STORAGE_KEY,
      JSON.stringify({
        completedSteps: [SPACE_SETUP_STEPS.CREATE_START, SPACE_SETUP_STEPS.CREATE_NAME],
        values: { displayName: "Leo", firstDay: "2023-03-26", spaceName: "Forever Us" },
      }),
    );
  });

  it("routes a successfully created space to the invite interstitial", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ ok: true, data: { space_id: "space-id" }, error: [], message: "OK" }),
      ok: true,
    });
    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_DATE} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start Our Story" }));

    await waitFor(() => {
      expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/spaces",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      display_name: "Leo",
      space_name: "Forever Us",
      start_date: "2023-03-26",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(sessionStorage.getItem(CREATE_SPACE_STORAGE_KEY)).toBeNull();
  });

  it("keeps create state and shows the API field error", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        ok: false,
        data: null,
        error: [{ code: "VALIDATION_ERROR", field: "start_date", message: "Invalid date." }],
        message: "Request failed.",
      }),
      ok: false,
    });
    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_DATE} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start Our Story" }));

    expect(await screen.findByText("Invalid date.")).toBeInTheDocument();
    expect(sessionStorage.getItem(CREATE_SPACE_STORAGE_KEY)).not.toBeNull();
    expect(locationMock.assign).not.toHaveBeenCalled();
  });

  it.each([
    [401, APP_ROUTES.AUTH],
    [409, APP_ROUTES.HOME],
  ])("redirects after a %i response", async (status, route) => {
    fetchMock.mockResolvedValue({
      json: async () => ({ ok: false, error: [], message: "Request failed." }),
      ok: false,
      status,
    });
    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_DATE} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start Our Story" }));

    await waitFor(() => expect(locationMock.assign).toHaveBeenCalledWith(route));
    expect(sessionStorage.getItem(CREATE_SPACE_STORAGE_KEY)).not.toBeNull();
  });

  it("preserves form values after a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("Network unavailable."));
    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_DATE} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start Our Story" }));

    expect(await screen.findByText("Network unavailable.")).toBeInTheDocument();
    expect(sessionStorage.getItem(CREATE_SPACE_STORAGE_KEY)).not.toBeNull();
    expect(locationMock.assign).not.toHaveBeenCalled();
  });

  it("continues when the persisted invite is unavailable", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    render(<SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_INVITE} inviteCode={null} />);

    expect(await screen.findByText("This invite is invalid or unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy Code" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to dashboard" }));
    await waitFor(() => expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.HOME));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/spaces/memberships/onboarding",
      {
        credentials: "include",
        headers: { accept: "application/json" },
        method: "POST",
      },
    );
  });
});
