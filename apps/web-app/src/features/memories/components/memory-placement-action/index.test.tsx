import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryPlacementAction } from ".";

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  get: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  revalidate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/axios/api", () => ({ api: { patch: mocks.patch, get: mocks.get } }));
vi.mock("../../server/revalidate-placement-views", () => ({
  revalidatePlacementViews: mocks.revalidate,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

function renderAction(visibility: "timeline" | "vault" = "timeline") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryPlacementAction
        memoryId="memory-id"
        version="2026-09-05T16:00:00.123456Z"
        visibility={visibility}
      />
    </QueryClientProvider>,
  );
}

describe("memory placement action", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage("en");
  });

  it.each([
    ["timeline", "Move to Private Vault", "vault", "/vault/memory-id"],
    ["vault", "Move to Timeline", "timeline", "/memories/memory-id"],
  ] as const)(
    "submits %s once and navigates after success",
    async (visibility, label, destination, path) => {
      let resolve!: (value: object) => void;
      mocks.patch.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      renderAction(visibility);
      const button = screen.getByRole("button", { name: label });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(mocks.patch).toHaveBeenCalledTimes(1);
      expect(mocks.patch).toHaveBeenCalledWith(
        "/memories/memory-id/placement",
        {
          visibility: destination,
          lastKnownUpdatedAt: "2026-09-05T16:00:00.123456Z",
        },
        expect.anything(),
      );
      resolve({
        status: 200,
        data: { ok: true, data: { id: "memory-id", visibility: destination } },
      });
      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(path));
      expect(mocks.revalidate).toHaveBeenCalledWith({
        memoryId: "memory-id",
        visibility: destination,
      });
      expect(mocks.success).toHaveBeenCalledOnce();
    },
  );

  it("reconciles a conflict before allowing a retry with the new version", async () => {
    mocks.patch
      .mockResolvedValueOnce({ status: 409, data: { ok: false } })
      .mockReturnValueOnce(new Promise(() => {}));
    mocks.get.mockResolvedValueOnce({
      status: 200,
      data: { ok: true, data: { updatedAt: "2026-09-05T16:00:00.123457Z" } },
    });
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "Move to Private Vault" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "This memory changed. Reloading the current version.",
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Move to Private Vault" }));
    expect(mocks.patch.mock.calls[1][1].lastKnownUpdatedAt).toBe("2026-09-05T16:00:00.123457Z");
  });

  it("does not retry an unknown outcome until an authoritative refresh succeeds", async () => {
    mocks.patch.mockRejectedValueOnce(new Error("network"));
    mocks.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      status: 200,
      data: { ok: true, data: { updatedAt: "2026-09-05T16:00:00.123457Z" } },
    });
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "Move to Private Vault" }));
    const refresh = await screen.findByRole("button", { name: "Refresh memory" });
    expect(screen.getByRole("button", { name: "Move to Private Vault" })).toBeDisabled();
    expect(mocks.patch).toHaveBeenCalledTimes(1);
    fireEvent.click(refresh);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Move to Private Vault" })).toBeEnabled(),
    );
  });

  it("redirects to sign-in when the session expires", async () => {
    mocks.patch.mockResolvedValueOnce({ status: 401, data: { ok: false } });
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "Move to Private Vault" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/auth"));
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("refreshes the unavailable view without retrying the move", async () => {
    mocks.patch.mockResolvedValueOnce({ status: 404, data: { ok: false } });
    mocks.get.mockResolvedValueOnce({ status: 404, data: { ok: false } });
    renderAction();
    fireEvent.click(screen.getByRole("button", { name: "Move to Private Vault" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.patch).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
