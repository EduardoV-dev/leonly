import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import { i18n } from "@/lib/i18n";
import { SPACE_SETUP_STEPS } from "../constants/welcome-steps";
import { SpaceJoinSetupPage } from "./join-space-setup";

const { navigation, fetchMock } = vi.hoisted(() => ({
  navigation: { push: vi.fn(), replace: vi.fn() },
  fetchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("join invite code input", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    sessionStorage.clear();
    localStorage.clear();
    navigation.push.mockReset();
    navigation.replace.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { valid: true }, error: [], message: "OK" }),
    });
    vi.stubGlobal("fetch", fetchMock);
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
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    },
  );
});
