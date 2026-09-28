import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import { i18n } from "@/lib/i18n";
import { CREATE_SPACE_STORAGE_KEY } from "../../constants/local-storage";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import { SpaceCreateSetupPage } from ".";

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
      "/api/spaces",
      expect.objectContaining({ method: "POST" }),
    );
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
});
