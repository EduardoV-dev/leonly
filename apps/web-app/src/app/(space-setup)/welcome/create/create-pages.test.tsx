import { describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "@/constants/routes";
import CreateDatePage from "./date/page";
import CreateInvitePage from "./invite/page";
import CreateNamePage from "./name/page";

const { getActiveSpace, redirect } = vi.hoisted(() => ({
  getActiveSpace: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/features/space-setup", () => ({
  SPACE_SETUP_STEPS: {
    CREATE_NAME: "create-name",
    CREATE_DATE: "create-date",
    CREATE_INVITE: "create-invite",
  },
  SpaceCreateSetupPage: ({
    screen,
    inviteCode,
  }: {
    screen: string;
    inviteCode?: string | null;
  }) => <div data-invite-code={inviteCode ?? "unavailable"}>{screen}</div>,
}));
vi.mock("@/features/space-setup/server/get-active-space-or-redirect", () => ({
  getActiveSpaceOrRedirectToAuth: getActiveSpace,
}));

describe("create-space route guards", () => {
  it("allows name and date steps when no active space exists", async () => {
    getActiveSpace.mockResolvedValue(null);
    expect(await CreateNamePage()).toHaveProperty("props.screen", "create-name");
    expect(await CreateDatePage()).toHaveProperty("props.screen", "create-date");
  });

  it("routes existing members to the dashboard", async () => {
    getActiveSpace.mockResolvedValue({ id: "space-id" });
    redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });

    await expect(CreateNamePage()).rejects.toThrow(`NEXT_REDIRECT:${APP_ROUTES.HOME}`);
    await expect(CreateDatePage()).rejects.toThrow(`NEXT_REDIRECT:${APP_ROUTES.HOME}`);
  });

  it("routes expired invites to an unavailable state while keeping dashboard continuation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T00:00:00.000Z"));
    getActiveSpace.mockResolvedValue({
      id: "space-id",
      invite_code: "leoabc23",
      invite_code_expires_at: "2026-09-27T00:00:00.000Z",
    });

    const page = await CreateInvitePage();
    expect(page).toHaveProperty("props.inviteCode", null);
    expect(page).toHaveProperty("props.screen", "create-invite");
    vi.useRealTimers();
  });

  it("renders the current unexpired invite returned by the active-space lookup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T00:00:00.000Z"));
    getActiveSpace.mockResolvedValue({
      id: "space-id",
      invite_code: "leoabc23",
      invite_code_expires_at: "2026-09-29T00:00:00.000Z",
    });

    const page = await CreateInvitePage();
    expect(page).toHaveProperty("props.inviteCode", "LEO-ABC23");
    expect(page).toHaveProperty("props.screen", "create-invite");
    vi.useRealTimers();
  });

  it("preserves active-space service failures", async () => {
    getActiveSpace.mockRejectedValue(new Error("Active-space service unavailable."));
    await expect(CreateNamePage()).rejects.toThrow("Active-space service unavailable.");
  });
});
