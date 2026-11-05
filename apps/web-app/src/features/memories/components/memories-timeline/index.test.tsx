import type { ApiResponse, MemoryListItem, MemoryListPage } from "@leonly/utils/contracts";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AxiosHeaders, type AxiosResponse } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/axios/api";
import { i18n } from "@/lib/i18n";
import { MemoriesTimeline } from ".";

vi.mock("@/lib/axios/api", () => ({ api: { get: vi.fn() } }));

const memory = {
  coverPhotoUrl: null,
  createdAt: "2026-08-23T10:00:00.000Z",
  description: null,
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: null,
  memoryDate: "2026-08-20",
  title: "Our picnic",
};

function jsonResponse(body: {
  cursorReset: boolean;
  memories: MemoryListItem[];
  nextCursor: string | null;
}): AxiosResponse<ApiResponse<MemoryListPage>> {
  return {
    data: {
      ok: true,
      data: {
        data: body.memories,
        meta: { cursorReset: body.cursorReset, nextCursor: body.nextCursor },
      },
      error: [],
      message: "OK",
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function renderTimeline(
  timeline: ReactNode = <MemoriesTimeline />,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{timeline}</QueryClientProvider>),
  };
}

describe("MemoriesTimeline", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.useFakeTimers();
    vi.mocked(api.get).mockReset();
    notifyManager.setScheduler((callback) => callback());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    notifyManager.setScheduler((callback) => window.setTimeout(callback, 0));
  });

  it("shows slow feedback, then an empty state when the first page settles", async () => {
    let resolveRequest: (response: AxiosResponse<ApiResponse<MemoryListPage>>) => void = () =>
      undefined;
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise<AxiosResponse<ApiResponse<MemoryListPage>>>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderTimeline();
    expect(screen.getByRole("status", { name: "Loading memories" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    expect(screen.getByText("This is taking a little longer than usual.")).toBeInTheDocument();

    await act(async () => {
      resolveRequest(jsonResponse({ cursorReset: false, memories: [], nextCursor: null }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "No memories yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preserve your first memory" })).toHaveAttribute(
      "href",
      "/memories/new",
    );
  });

  it("retains cards after a load-more failure and replaces them after a cursor reset", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(
        jsonResponse({ cursorReset: false, memories: [memory], nextCursor: "next" }),
      )
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(
        jsonResponse({
          cursorReset: true,
          memories: [
            { ...memory, id: "4ca93820-5a95-4bae-b4f5-bab500550ef3", title: "Fresh page" },
          ],
          nextCursor: null,
        }),
      );

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "Our picnic" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Load more" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load more memories.");
    expect(screen.getByRole("heading", { name: "Our picnic" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try loading more" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "Fresh page" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Our picnic" })).not.toBeInTheDocument();
  });

  it("updates month headings when the language changes", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: [memory], nextCursor: null }),
    );

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage("es");
    });
    expect(screen.getByRole("heading", { name: "Agosto de 2026" })).toBeInTheDocument();
  });

  it("offers a retry after an initial error", async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error("network failed"))
      .mockResolvedValueOnce(jsonResponse({ cursorReset: false, memories: [], nextCursor: null }));

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your memories.");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "No memories yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preserve your first memory" })).toHaveAttribute(
      "href",
      "/memories/new",
    );
  });

  it("renders server-provided cover URLs and summary fields, then falls back when the preview fails", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({
        cursorReset: false,
        memories: [
          {
            ...memory,
            coverPhotoUrl: "https://storage.example/signed-cover",
            description: "A sunny afternoon together",
            location: "The park",
          },
        ],
        nextCursor: null,
      }),
    );

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const cover = screen.getByRole("img", { name: "Cover for Our picnic" });
    expect(cover).toHaveAttribute("src", "https://storage.example/signed-cover");
    expect(screen.getByText("A sunny afternoon together")).toBeInTheDocument();
    expect(screen.getByText("The park")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ comments?/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /react/i })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll("[data-extension-region]")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Open Our picnic" })).toHaveAttribute(
      "href",
      `/memories/${memory.id}`,
    );
    expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();

    fireEvent.error(cover);
    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
    expect(screen.queryByText("private-space")).not.toBeInTheDocument();
  });

  it("renders an accessible fallback when the server omits a cover URL", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: [memory], nextCursor: null }),
    );

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
  });

  it("renders a cover and details panel for every full timeline memory", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({
        cursorReset: false,
        memories: [
          {
            ...memory,
            coverPhotoUrl: "https://storage.example/first-cover",
            description: "First memory description",
            location: "First place",
            title: "First memory",
          },
          {
            ...memory,
            coverPhotoUrl: "https://storage.example/second-cover",
            description: "Second memory description",
            id: "4ca93820-5a95-4bae-b4f5-bab500550ef3",
            location: "Second place",
            title: "Second memory",
          },
        ],
        nextCursor: null,
      }),
    );

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("img", { name: "Cover for First memory" })).toHaveAttribute(
      "src",
      "https://storage.example/first-cover",
    );
    expect(screen.getByRole("img", { name: "Cover for Second memory" })).toHaveAttribute(
      "src",
      "https://storage.example/second-cover",
    );
    expect(screen.getByText("First memory description")).toBeInTheDocument();
    expect(screen.getByText("Second memory description")).toBeInTheDocument();
    expect(screen.getByText("First place")).toBeInTheDocument();
    expect(screen.getByText("Second place")).toBeInTheDocument();
  });

  it("groups memories into editorial month sections in newest-first order", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({
        cursorReset: false,
        memories: [
          { ...memory, memoryDate: "2026-10-12", title: "October feature" },
          {
            ...memory,
            id: "4ca93820-5a95-4bae-b4f5-bab500550ef3",
            memoryDate: "2026-10-03",
            title: "October note",
          },
          {
            ...memory,
            id: "1f8cf0f4-b763-4ac8-9493-786856c92e03",
            memoryDate: "2026-09-21",
            title: "September feature",
          },
        ],
        nextCursor: null,
      }),
    );

    renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const monthHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(monthHeadings.map((heading) => heading.textContent)).toEqual([
      "October 2026",
      "September 2026",
    ]);
    expect(screen.getByRole("heading", { name: "October feature" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "October note" })).toBeInTheDocument();
  });

  it("renders only four recent cards with their cover images", async () => {
    const recentMemories = Array.from({ length: 5 }, (_, index) => ({
      ...memory,
      coverPhotoUrl: `https://storage.example/cover-${index}`,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      title: `Recent memory ${index + 1}`,
    }));
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: recentMemories, nextCursor: "next" }),
    );

    renderTimeline(<MemoriesTimeline variant="recent" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.get).toHaveBeenCalledWith("/memories/timeline", {
      params: { cursor: undefined, sort: "newest", limit: 4 },
    });
    expect(screen.getAllByRole("img", { name: /Cover for Recent memory/i })).toHaveLength(4);
    expect(screen.queryByRole("heading", { name: "Recent memory 5" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("shows a retry instead of fabricated recent memories after a failed request", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("network failed"));
    renderTimeline(<MemoriesTimeline variant="recent" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your memories.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Our picnic" })).not.toBeInTheDocument();
  });

  it("requests a separate oldest-first chronology", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: [memory], nextCursor: null }),
    );

    renderTimeline(<MemoriesTimeline sort="oldest" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.get).toHaveBeenCalledWith("/memories/timeline", {
      params: { cursor: undefined, sort: "oldest", limit: undefined },
    });
  });

  it("reuses cached timeline data when remounted", async () => {
    vi.mocked(api.get).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: [memory], nextCursor: null }),
    );

    const firstRender = renderTimeline();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    firstRender.unmount();

    renderTimeline(<MemoriesTimeline />, firstRender.queryClient);
    await act(async () => {
      await Promise.resolve();
    });

    expect(api.get).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Our picnic" })).toBeInTheDocument();
  });
});
