import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import type { SettingsReadModel } from "../../server/get-settings-for-current-user";
import { SettingsError } from "./error";
import { SettingsPage } from "./index";
import { SettingsLoading } from "./loading";

vi.mock("../../server/sign-out-current-session", () => ({
  signOutCurrentSession: vi.fn(),
}));

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

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
      updatedAt: "2026-09-05T16:00:00.000Z",
    },
  ],
  invite: {
    code: "twofw3k3",
    expiresAt: "2099-09-05T12:00:00.000Z",
    isAvailable: true,
  },
  membershipState: "one-member",
  space: {
    name: "Leo's Sanctuary",
    startDate: "2025-04-27",
    updatedAt: "2026-09-05T16:00:00.000Z",
  },
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
      updatedAt: "2026-09-05T16:00:30.000Z",
    },
  ],
  invite: { code: null, expiresAt: null, isAvailable: false },
  membershipState: "two-member",
};

describe("SettingsPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(() => i18n.changeLanguage("en"));
  });

  it("presents actionable one-member invite management with shared, personal, account, and Vault settings", () => {
    render(<SettingsPage settings={oneMemberSettings} />);

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shared space" })).toBeInTheDocument();
    expect(screen.getByText("April 27, 2025")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Invite your partner" })).toBeInTheDocument();
    expect(screen.getByLabelText("Partner invitation code")).toHaveValue("TWO-FW3K3");
    expect(screen.getByRole("button", { name: "Copy code" })).toBeEnabled();
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

    expect(screen.getByRole("heading", { name: "Invite your partner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create a new invitation" })).toBeEnabled();
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
    expect(screen.getByRole("button", { name: "Editar nombre visible" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cerrar sesión en Leonly" })).toBeEnabled();
    expect(screen.getByText("Tú")).toBeInTheDocument();
  });

  it("changes the browser-local interface language with native keyboard controls", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("leonly.locale");
    document.documentElement.lang = "en";
    render(<SettingsPage settings={oneMemberSettings} />);

    const english = screen.getByRole("radio", { name: "English" });
    const spanish = screen.getByRole("radio", { name: "Spanish" });
    expect(english).toBeChecked();
    expect(spanish).not.toBeChecked();

    english.focus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() => expect(spanish).toBeChecked());
    expect(spanish).toHaveFocus();
    expect(window.localStorage.getItem("leonly.locale")).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(screen.getByText("El idioma de la interfaz cambió a Español.")).toBeInTheDocument();

    await act(() => i18n.changeLanguage("en"));
    window.localStorage.removeItem("leonly.locale");
    document.documentElement.lang = "en";
  });

  it("edits the shared name with labelled controls, validation, and an authoritative refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ name: "Our archive", updatedAt: "2026-09-05T16:01:00.000Z" }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsPage settings={twoMemberSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit name" }));
    const input = screen.getByRole("textbox", { name: "Space name" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a name between 2 and 100 characters.",
    );

    fireEvent.change(input, { target: { value: "Our archive" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(screen.getByText("Space name saved.")).toBeInTheDocument());
    expect(screen.getAllByText("Our archive")).toHaveLength(2);
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("offers a self-only display-name editor and keeps the partner read-only", () => {
    render(<SettingsPage settings={twoMemberSettings} />);

    expect(screen.getAllByRole("button", { name: "Edit display name" })).toHaveLength(1);
    expect(screen.getByText("Annie Chen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Annie Chen/i })).not.toBeInTheDocument();
  });

  it("supports focused, associated validation and keyboard form submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        displayName: "Leo Vance",
        updatedAt: "2026-09-05T16:01:00.000Z",
      }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsPage settings={twoMemberSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
    const input = screen.getByRole("textbox", { name: "Display name" });
    expect(input).toHaveFocus();
    expect(input).toHaveAccessibleDescription("Used to identify you throughout your shared space.");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Enter a display name between 2 and 100 characters.");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(alert.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "Leo Vance" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    await waitFor(() => expect(screen.getByText("Display name saved.")).toBeInTheDocument());
  });

  it("disables editing controls while pending and updates every current-member occurrence", async () => {
    let resolveRequest!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsPage settings={twoMemberSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
    const input = screen.getByRole("textbox", { name: "Display name" });
    fireEvent.change(input, { target: { value: "Leo Hart" } });
    fireEvent.click(screen.getByRole("button", { name: "Save display name" }));

    await waitFor(() => expect(screen.getByText("Saving…", { selector: "p" })).toBeInTheDocument());
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();

    resolveRequest({
      json: async () => ({
        displayName: "Leo Hart",
        updatedAt: "2026-09-05T16:01:00.000Z",
      }),
      ok: true,
      status: 200,
    });
    await waitFor(() => expect(screen.getAllByText("Leo Hart")).toHaveLength(2));
    expect(screen.getAllByRole("img", { name: "Leo Hart's avatar" })).toHaveLength(2);
    expect(screen.getByText("Annie Chen")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("cancels without a request and restores focus to the edit action", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsPage settings={twoMemberSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), {
      target: { value: "Discard me" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Edit display name" })).toHaveFocus();
    expect(screen.getAllByText("Leo Vance")).not.toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves conflict input and supports accepting the canonical name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          code: "conflict",
          displayName: "Leo Current",
          updatedAt: "2026-09-05T16:01:00.000Z",
        }),
        ok: false,
        status: 409,
      }),
    );
    render(<SettingsPage settings={twoMemberSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
    const input = screen.getByRole("textbox", { name: "Display name" });
    fireEvent.change(input, { target: { value: "Leo Attempt" } });
    fireEvent.click(screen.getByRole("button", { name: "Save display name" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your current display name is now Leo Current.",
      ),
    );
    expect(input).toHaveValue("Leo Attempt");
    expect(screen.getByRole("button", { name: "Retry your name" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Use current name" }));
    expect(screen.getAllByText("Leo Current")).toHaveLength(2);
  });

  it("announces failure, preserves input, and retries successfully", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        json: async () => ({
          displayName: "Leo Retry",
          updatedAt: "2026-09-05T16:01:00.000Z",
        }),
        ok: true,
        status: 200,
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsPage settings={twoMemberSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit display name" }));
    const input = screen.getByRole("textbox", { name: "Display name" });
    fireEvent.change(input, { target: { value: "Leo Retry" } });
    fireEvent.click(screen.getByRole("button", { name: "Save display name" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not save your display name. Try again.",
      ),
    );
    expect(input).toHaveValue("Leo Retry");

    fireEvent.click(screen.getByRole("button", { name: "Save display name" }));
    await waitFor(() => expect(screen.getByText("Display name saved.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("offers both members an accessible start-date editor that can be cancelled", () => {
    render(<SettingsPage settings={twoMemberSettings} />);

    const editDate = screen.getByRole("button", { name: "Edit start date" });
    fireEvent.click(editDate);
    expect(screen.getByRole("button", { name: "Our story began" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Edit start date" })).toHaveFocus();
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
