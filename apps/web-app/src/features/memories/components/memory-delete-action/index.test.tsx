import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosResponse } from "axios";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { memoryQueryKeys } from "../../constants/query-keys";
import { MemoryDetailActions } from "../memory-detail-actions";

import { MemoryDeleteAction } from ".";

vi.mock("../../server/revalidate-placement-views", () => ({ revalidatePlacementViews: vi.fn() }));

const { deleteMock, getMock, pushMock, refreshMock, successMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  getMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  successMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/lib/axios/api", () => ({
  api: { delete: deleteMock, get: getMock },
  isAxiosError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "response" in error),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: successMock } }));

const memory = {
  memoryId: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  version: "2026-08-23T10:00:00.000Z",
  visibility: "timeline" as const,
};

function deletedResponse(): Pick<AxiosResponse, "status" | "data"> {
  return { data: { ok: true, data: null, error: [], message: "OK" }, status: 200 };
}

function unavailableResponse(): Pick<AxiosResponse, "status" | "data"> {
  return {
    data: { ok: false, data: null, error: [{ code: "404", message: "Not found" }], message: "NO" },
    status: 404,
  };
}

function detailResponse(status: number): Pick<AxiosResponse, "status" | "data"> {
  return {
    data:
      status === 200
        ? { ok: true, data: {}, error: [], message: "OK" }
        : { ok: false, data: null, error: [{ code: "404", message: "Not found" }], message: "NO" },
    status,
  };
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
    deleteMock.mockReset().mockResolvedValue(deletedResponse());
    getMock.mockReset().mockResolvedValue(detailResponse(404));
    await i18n.changeLanguage("en");
  });

  it("explains shared disappearance and cancels without a request while restoring focus", async () => {
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    const trigger = openConfirmation();
    expect(screen.getByRole("heading", { name: "Remove this memory?" })).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "no longer be part of your shared story",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "neither of you will be able to see it",
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep this memory" }));

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("dismisses with Escape without a request and restores the invoking control", async () => {
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    const trigger = openConfirmation();
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("is keyboard-operable, single-flight, and disables conflicting detail actions", async () => {
    const user = userEvent.setup();
    let settle: (response: Pick<AxiosResponse, "status" | "data">) => void = () => {};
    deleteMock.mockImplementation(
      () =>
        new Promise<Pick<AxiosResponse, "status" | "data">>((resolve) => {
          settle = resolve;
        }),
    );
    renderWithQueryClient(<MemoryDetailActions {...memory} />);

    const trigger = screen.getByRole("button", { name: "Remove memory" });
    const placementAction = screen.getByRole("button", { name: "Move to Private Vault" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const confirm = getConfirmButton();
    confirm.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(deleteMock).toHaveBeenCalledOnce());
    await user.keyboard("{Enter}");

    expect(deleteMock).toHaveBeenCalledOnce();
    expect(deleteMock.mock.calls[0]).toEqual([
      `/memories/${memory.memoryId}`,
      { validateStatus: expect.any(Function) },
    ]);
    await waitFor(() => expect(placementAction).toBeDisabled());
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Removing this memory from your shared story",
    );

    await act(async () => settle(deletedResponse()));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/timeline"));
  });

  it.each([
    ["timeline", "/timeline"],
    ["vault", "/vault"],
  ] as const)(
    "clears every memory projection and routes %s deletion to %s",
    async (visibility, route) => {
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
      expect(refreshMock).toHaveBeenCalledOnce();
      expect(successMock).toHaveBeenCalledWith("Memory removed from your shared story.");
      expect(pushMock.mock.calls[0]?.[0]).not.toContain("?");
    },
  );

  it("uses the generic unavailable boundary without treating a reliable 404 as success", async () => {
    deleteMock.mockResolvedValue(unavailableResponse());
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
    expect(successMock).not.toHaveBeenCalled();
  });

  it("reauthorizes a 401 response without claiming deletion", async () => {
    deleteMock.mockResolvedValue({
      data: {
        ok: false,
        data: null,
        error: [{ code: "401", message: "Unauthorized" }],
        message: "NO",
      },
      status: 401,
    });
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    openConfirmation();
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/auth"));
    expect(successMock).not.toHaveBeenCalled();
    expect(getMock).not.toHaveBeenCalled();
  });

  it("reconciles an uncertain request through both detail routes and reports unavailable when the memory is gone", async () => {
    deleteMock.mockRejectedValue(new TypeError("network lost"));
    getMock.mockResolvedValue(detailResponse(404));
    renderWithQueryClient(<MemoryDeleteAction {...memory} />);

    openConfirmation();
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getMock.mock.calls[0]).toEqual([
      `/memories/timeline/${memory.memoryId}`,
      { validateStatus: expect.any(Function) },
    ]);
    expect(getMock.mock.calls[1]).toEqual([
      `/memories/vault/${memory.memoryId}`,
      { validateStatus: expect.any(Function) },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("no longer here");
    expect(successMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("preserves an available memory after uncertainty and supports a successful retry", async () => {
    deleteMock
      .mockRejectedValueOnce(new TypeError("network lost"))
      .mockResolvedValueOnce(deletedResponse());
    getMock.mockImplementation(async (_url: string) => detailResponse(200));
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
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });
});
