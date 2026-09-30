import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import { i18n } from "@/lib/i18n";
import { SPACE_SETUP_STEPS } from "../constants/welcome-steps";
import { SpaceJoinSetupPage } from "./join-space-setup";
import "./setup-web-app-api-tests";

const { navigation, fetchMock, locationMock } = vi.hoisted(() => ({
  navigation: { push: vi.fn(), replace: vi.fn() },
  fetchMock: vi.fn(),
  locationMock: { assign: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("join invite code input", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    sessionStorage.clear();
    localStorage.clear();
    navigation.push.mockReset();
    navigation.replace.mockReset();
    locationMock.assign.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { valid: true }, error: [], message: "OK" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", locationMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["lny7kmp2", "  LNY-7KMP2\t", "\u00a0lny7kmp2\u00a0"])(
    "preserves the complete pasted code %s through the validation request",
    async (value) => {
      const user = userEvent.setup();
      render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);

      const input = await screen.findByLabelText("Invite code");
      await user.click(input);
      await user.paste(value);
      expect(input).toHaveValue("LNY-7KMP2");

      await user.click(screen.getByRole("button", { name: /join space/i }));

      await waitFor(() => {
        expect(navigation.push).toHaveBeenCalledWith(APP_ROUTES.WELCOME_JOIN_STEP("name"));
      });
      expect(fetchMock).toHaveBeenCalledWith("/api/spaces/invite-validations", {
        body: JSON.stringify({ invite_code: "LNY-7KMP2" }),
        headers: { accept: "application/json", "content-type": "application/json" },
        method: "POST",
      });
    },
  );

  it("redirects to authentication when invite validation reports an expired session", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, data: null, error: [], message: "Unauthorized" }),
    });
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Invite code"), "lny7kmp2");
    await user.click(screen.getByRole("button", { name: /join space/i }));

    await waitFor(() => expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.AUTH));
  });

  it("routes to dashboard when invite validation finds existing membership", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ ok: false, data: null, error: [], message: "Unavailable" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { id: "space-id" }, error: [], message: "OK" }),
      });
    render(<SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Invite code"), "lny7kmp2");
    await user.click(screen.getByRole("button", { name: /join space/i }));

    await waitFor(() => expect(locationMock.assign).toHaveBeenCalledWith(APP_ROUTES.HOME));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/users/me/space",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
