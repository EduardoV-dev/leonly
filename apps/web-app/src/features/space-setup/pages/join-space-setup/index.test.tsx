import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import { i18n } from "@/lib/i18n";
import { JOIN_SPACE_STORAGE_KEY } from "../../constants/local-storage";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import { SpaceJoinSetupPage } from ".";

const { fetchMock, locationMock, navigation } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  locationMock: { assign: vi.fn() },
  navigation: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe.each([
  {
    step: SPACE_SETUP_STEPS.JOIN_CODE,
    action: /join space/i,
    errorKey: "errors.validateInviteCode",
  },
  { step: SPACE_SETUP_STEPS.JOIN_NAME, action: "Start Our Story", errorKey: "errors.joinSpace" },
])("membership recovery from $step", ({ step, action, errorKey }) => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", locationMock);
    sessionStorage.clear();
    localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    sessionStorage.setItem(
      JOIN_SPACE_STORAGE_KEY,
      JSON.stringify({
        completedSteps: [SPACE_SETUP_STEPS.JOIN_CODE],
        values: { displayName: "Leo", inviteCode: "LNY-7KMP2" },
      }),
    );
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, data: null, error: [], message: "Unavailable" }),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(["network", "json"])("shows retry guidance after a %s failure", async (failure) => {
    fetchMock.mockReset();
    const failureMessage = "Unexpected request detail";
    if (failure === "network") {
      fetchMock.mockRejectedValueOnce(new TypeError(failureMessage));
    }
    if (failure === "json") {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError(failureMessage);
        },
      });
    }
    render(<SpaceJoinSetupPage screen={step} />);

    const button = await screen.findByRole("button", { name: action });
    fireEvent.click(button);

    const t = i18n.getFixedT("en", "spaceSetup");
    expect(await screen.findByText(t(errorKey))).toBeInTheDocument();
    expect(screen.queryByText(failureMessage)).not.toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(sessionStorage.getItem(JOIN_SPACE_STORAGE_KEY)).not.toBeNull();
    expect(locationMock.assign).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("shows a retryable lookup error and preserves the form when membership lookup fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<SpaceJoinSetupPage screen={step} />);

    const button = await screen.findByRole("button", { name: action });
    fireEvent.click(button);

    const t = i18n.getFixedT("en", "spaceSetup");
    expect(await screen.findByText(t(errorKey))).toBeInTheDocument();
    expect(screen.queryByText(t("errors.inviteUnavailable"))).not.toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(sessionStorage.getItem(JOIN_SPACE_STORAGE_KEY)).not.toBeNull();
    expect(locationMock.assign).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("redirects to authentication when membership lookup reports an expired session", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    render(<SpaceJoinSetupPage screen={step} />);

    fireEvent.click(await screen.findByRole("button", { name: action }));

    await waitFor(() => expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.AUTH));
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("keeps unavailable-invite feedback when the membership lookup succeeds without a space", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: null, error: [], message: "OK" }),
    });
    render(<SpaceJoinSetupPage screen={step} />);

    fireEvent.click(await screen.findByRole("button", { name: action }));

    const t = i18n.getFixedT("en", "spaceSetup");
    expect(await screen.findByText(t("errors.inviteUnavailable"))).toBeInTheDocument();
    expect(locationMock.assign).not.toHaveBeenCalled();
  });

  it("routes existing members to the dashboard", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { id: "space-id" }, error: [], message: "OK" }),
    });
    render(<SpaceJoinSetupPage screen={step} />);

    fireEvent.click(await screen.findByRole("button", { name: action }));

    await waitFor(() => expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.HOME));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/users/me/space");
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
