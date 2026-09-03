import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { memoryQueryKeys } from "../../constants/query-keys";
import { MemoryDetailActions } from "../memory-detail-actions";
import { MemoryDeleteAction } from ".";

const { pushMock, refreshMock, successMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  successMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: successMock } }));

const memory = {
  memoryId: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  version: "MjAyNi0wOC0yM1QxMDowMDowMC4wMDBa",
  visibility: "timeline" as const,
};

function deferredResponse() {
  let resolve = (_response: Response) => {};
  const promise = new Promise<Response>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function renderWithQueryClient(content: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const cancelQueries = vi.spyOn(queryClient, "cancelQueries");
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const removeQueries = vi.spyOn(queryClient, "removeQueries");
  render(<QueryClientProvider client={queryClient}>{content}</QueryClientProvider>);
  return { cancelQueries, invalidateQueries, queryClient, removeQueries };
}

function openConfirmation() {
  const trigger = screen.getByRole("button", { name: "Remove memory" });
  fireEvent.click(trigger);
  return trigger;
}

function getConfirmButton() {
  return screen.getByRole("button", { name: "Remove memory" });
}

describe("MemoryDeleteAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("explains shared disappearance and cancels without a request while restoring focus", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    const trigger = openConfirmation();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "no longer be part of your shared story",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "neither of you will be able to see it",
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep this memory" }));

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dismisses with Escape without a request and restores the invoking control", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    const trigger = openConfirmation();
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is keyboard-operable, single-flight, and disables conflicting detail actions", async () => {
    const user = userEvent.setup();
    const pending = deferredResponse();
    const fetchMock = vi.fn(() => pending.promise);
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(<MemoryDetailActions {...memory} />);

    const trigger = screen.getByRole("button", { name: "Remove memory" });
    const placementAction = screen.getByRole("button", { name: "Move to Private Vault" });
    const editAction = screen.getByRole("link", { name: "Edit" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const confirm = getConfirmButton();
    confirm.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await user.keyboard("{Enter}");

    expect(fetchMock).toHaveBeenCalledOnce();
    await waitFor(() => expect(placementAction).toBeDisabled());
    expect(editAction).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Removing this memory from your shared story",
    );

    await act(async () => pending.resolve(new Response(null, { status: 204 })));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/timeline"));
  });

  it.each([
    ["timeline", "/timeline"],
    ["vault", "/vault"],
  ] as const)(
    "clears every memory projection and routes %s deletion to %s",
    async (visibility, route) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
      const { cancelQueries, invalidateQueries, removeQueries } = renderWithQueryClient(
        <MemoryDeleteAction {...memory} visibility={visibility} />,
      );

      openConfirmation();
      fireEvent.click(getConfirmButton());

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith(route));
      expect(cancelQueries).toHaveBeenCalledWith({ queryKey: memoryQueryKeys.all });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: memoryQueryKeys.all,
        refetchType: "none",
      });
      expect(removeQueries).toHaveBeenCalledWith({ queryKey: memoryQueryKeys.all });
      expect(successMock).toHaveBeenCalledWith("Memory removed from your shared story.");
      expect(pushMock.mock.calls[0]?.[0]).not.toContain("?");
    },
  );

  it("refreshes a conflict without claiming deletion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ code: "conflict" }, { status: 409 })),
    );
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    openConfirmation();
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("This memory changed");
    expect(pushMock).not.toHaveBeenCalled();
    expect(successMock).not.toHaveBeenCalled();
  });

  it("uses the generic unavailable boundary without treating a reliable 404 as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ code: "unavailable" }, { status: 404 })),
    );
    const { removeQueries } = renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    openConfirmation();
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: memoryQueryKeys.comments(memory.memoryId),
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: memoryQueryKeys.reactions(memory.memoryId),
    });
    expect(screen.getByRole("status")).toHaveTextContent("no longer here");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("reauthorizes an uncertain request and completes only when detail is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network lost"))
      .mockResolvedValueOnce(Response.json({ code: "unavailable" }, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    openConfirmation();
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/timeline"));
    expect(fetchMock.mock.calls[1]).toEqual([
      `/api/memories/${memory.memoryId}`,
      { cache: "no-store", method: "GET" },
    ]);
  });

  it("preserves an available memory after uncertainty and supports a successful retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: "uncertain" }, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithQueryClient(
      <section>
        <p>Among the flowers</p>
        <MemoryDeleteAction {...memory} />
      </section>,
    );

    openConfirmation();
    fireEvent.click(getConfirmButton());

    await screen.findByText(
      "We could not remove this memory. It is still here, so you can try again.",
    );
    expect(screen.getByText("Among the flowers")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try removing it again" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/timeline"));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
