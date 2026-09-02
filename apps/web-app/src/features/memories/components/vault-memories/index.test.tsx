import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { VaultMemories } from ".";

const memory = {
  coverPhotoUrl: null,
  createdAt: "2026-08-23T10:00:00.000Z",
  description: null,
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: null,
  memoryDate: "2026-08-20",
  title: "Our hidden picnic",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderVault(
  content: ReactNode = <VaultMemories />,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{content}</QueryClientProvider>),
  };
}

async function flushRequest(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("VaultMemories", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
    notifyManager.setScheduler((callback) => callback());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    notifyManager.setScheduler((callback) => window.setTimeout(callback, 0));
  });

  it("shows slow feedback and a truthful shared empty state with a create path", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderVault();
    expect(screen.getByRole("status", { name: "Loading Private Vault" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    expect(screen.getByText("This is taking a little longer than usual.")).toBeInTheDocument();

    await act(async () => {
      resolveRequest(jsonResponse({ cursorReset: false, memories: [], nextCursor: null }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: "Your shared Vault is waiting" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preserve a memory" })).toHaveAttribute(
      "href",
      "/memories/new",
    );
  });

  it("renders authorized summaries and fallbacks without unshipped actions", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        cursorReset: false,
        memories: [
          {
            ...memory,
            coverPhotoUrl: "https://storage.example/vault-cover",
            description: "A quiet afternoon together",
            location: "The park",
          },
          {
            ...memory,
            id: "4ca93820-5a95-4bae-b4f5-bab500550ef3",
            title: "Memory without a cover",
          },
        ],
        nextCursor: null,
      }),
    );

    renderVault();
    await flushRequest();

    expect(fetch).toHaveBeenCalledWith("/api/memories/vault");
    expect(screen.getByRole("img", { name: "Cover for Our hidden picnic" })).toHaveAttribute(
      "src",
      "https://storage.example/vault-cover",
    );
    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
    expect(screen.getByText("A quiet afternoon together")).toBeInTheDocument();
    expect(screen.getByText("The park")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Our hidden picnic" })).toHaveAttribute(
      "href",
      `/vault/${memory.id}`,
    );
    expect(document.querySelectorAll("[data-extension-region]")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /restore|edit|delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("offers a retry after an initial read failure", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network failed"))
      .mockResolvedValueOnce(jsonResponse({ cursorReset: false, memories: [], nextCursor: null }));

    renderVault();
    await flushRequest();
    expect(screen.getByRole("alert")).toHaveTextContent("We could not open the Private Vault");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: "Your shared Vault is waiting" }),
    ).toBeInTheDocument();
  });

  it("retains cards after load-more failure and replaces them after cursor reset", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ cursorReset: false, memories: [memory], nextCursor: "next" }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          cursorReset: true,
          memories: [
            { ...memory, id: "4ca93820-5a95-4bae-b4f5-bab500550ef3", title: "Fresh Vault page" },
          ],
          nextCursor: null,
        }),
      );

    renderVault();
    await flushRequest();
    fireEvent.click(screen.getByRole("button", { name: "Load Earlier Memories" }));
    await flushRequest();

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load more Vault memories.");
    expect(screen.getByRole("heading", { name: "Our hidden picnic" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try loading more" }));
    await flushRequest();
    expect(fetch).toHaveBeenLastCalledWith("/api/memories/vault?cursor=next");
    expect(screen.getByRole("heading", { name: "Fresh Vault page" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Our hidden picnic" })).not.toBeInTheDocument();
  });

  it("starts again from the first page after navigation return", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: [memory], nextCursor: null }),
    );
    const firstRender = renderVault();
    await flushRequest();
    firstRender.unmount();

    renderVault(<VaultMemories />, firstRender.queryClient);
    await flushRequest();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/memories/vault");
  });
});
