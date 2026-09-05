import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import type { SettingsReadModel } from "../../server/get-settings-for-current-user";
import { SettingsError } from "./error";
import { SettingsPage } from "./index";
import { SettingsLoading } from "./loading";

vi.mock("../../server/sign-out-current-session", () => ({
  signOutCurrentSession: vi.fn(),
}));

const oneMemberSettings: SettingsReadModel = {
  account: { email: "leo@example.com", providerLabel: "Google" },
  activeMembers: [
    {
      avatarUrl: null,
      displayName: "Leo Vance",
      id: "7d8e8d54-e7a7-490c-805f-a342d407523f",
      isCurrentMember: true,
      joinedAt: "2025-04-27T10:00:00.000Z",
      role: "owner",
    },
  ],
  invite: {
    code: "twofw3k3",
    expiresAt: "2026-09-05T12:00:00.000Z",
    isAvailable: true,
  },
  membershipState: "one-member",
  space: { name: "Leo's Sanctuary", startDate: "2025-04-27" },
};

const twoMemberSettings: SettingsReadModel = {
  ...oneMemberSettings,
  activeMembers: [
    oneMemberSettings.activeMembers[0],
    {
      avatarUrl: null,
      displayName: "Annie Chen",
      id: "4f62149f-680c-43af-aef1-23f89972b771",
      isCurrentMember: false,
      joinedAt: "2025-05-01T12:30:00.000Z",
      role: "partner",
    },
  ],
  invite: { code: null, expiresAt: null, isAvailable: false },
  membershipState: "two-member",
};

describe("SettingsPage", () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("presents one-member shared, personal, account, and Vault settings without exposing the code", () => {
    render(<SettingsPage settings={oneMemberSettings} />);

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shared space" })).toBeInTheDocument();
    expect(screen.getByText("April 27, 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Partner invitation is active" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("twofw3k3")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Leo Vance's avatar" })[0]).toHaveTextContent("LV");
    expect(screen.getByText("Only for you")).toBeInTheDocument();
    expect(screen.getByText("leo@example.com")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore Private Vault/i })).toHaveAttribute(
      "href",
      "/vault",
    );
    expect(screen.getByText(/visible to both active members/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out of Leonly" })).toBeEnabled();
  });

  it("presents two active members, joined status, and avatar fallbacks without invite actions", () => {
    render(<SettingsPage settings={twoMemberSettings} />);

    expect(screen.getByRole("heading", { name: "You are both here" })).toBeInTheDocument();
    expect(screen.getAllByText("Leo Vance")).not.toHaveLength(0);
    expect(screen.getByText("Annie Chen")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(screen.getAllByText("Active")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
  });

  it("replaces an unavailable remote avatar with the member initials", () => {
    render(
      <SettingsPage
        settings={{
          ...oneMemberSettings,
          activeMembers: [
            {
              ...oneMemberSettings.activeMembers[0],
              avatarUrl: "https://example.com/unavailable-avatar.jpg",
            },
          ],
        }}
      />,
    );

    const avatars = screen.getAllByRole("img", { name: "Leo Vance's avatar" });
    expect(avatars[0].tagName).toBe("IMG");
    fireEvent.error(avatars[0]);

    expect(screen.getAllByRole("img", { name: "Leo Vance's avatar" })[0]).toHaveTextContent("LV");
  });

  it("keeps missing optional account and invite values understandable", () => {
    render(
      <SettingsPage
        settings={{
          ...oneMemberSettings,
          account: { email: null, providerLabel: null },
          invite: { code: null, expiresAt: null, isAvailable: false },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Partner invitation is unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Members" })).toBeInTheDocument();
  });

  it("uses translated headings and accessible action names in Spanish", async () => {
    await act(() => i18n.changeLanguage("es"));
    render(<SettingsPage settings={twoMemberSettings} />);

    expect(screen.getByRole("heading", { level: 1, name: "Configuración" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Espacio compartido" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explorar la bóveda privada/i })).toHaveAttribute(
      "href",
      "/vault",
    );
    expect(screen.getByRole("button", { name: "Cerrar sesión en Leonly" })).toBeEnabled();
  });

  it("provides labelled loading and keyboard-accessible recovery states", () => {
    const onRetry = vi.fn();
    const { unmount } = render(<SettingsLoading />);

    expect(screen.getByRole("status", { name: "Loading Settings" })).toBeInTheDocument();

    unmount();
    render(<SettingsError onRetry={onRetry} />);
    const retryButton = screen.getByRole("button", { name: "Try again" });
    retryButton.focus();
    expect(retryButton).toHaveFocus();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
