import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoriesTimeline } from ".";

const memory = {
  coverPhotoUrl: null,
  createdAt: "2026-08-23T10:00:00.000Z",
  description: null,
  id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
  location: null,
  memoryDate: "2026-08-20",
  title: "Our picnic",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("MemoriesTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows slow feedback, then an empty state when the first page settles", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<MemoriesTimeline />);
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
  });

  it("retains cards after a load-more failure and replaces them after a cursor reset", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ cursorReset: false, memories: [memory], nextCursor: "next" }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          cursorReset: true,
          memories: [
            { ...memory, id: "4ca93820-5a95-4bae-b4f5-bab500550ef3", title: "Fresh page" },
          ],
          nextCursor: null,
        }),
      );

    render(<MemoriesTimeline />);
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

  it("offers a retry after an initial error", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network failed"))
      .mockResolvedValueOnce(jsonResponse({ cursorReset: false, memories: [], nextCursor: null }));

    render(<MemoriesTimeline />);
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
  });

  it("renders server-provided cover URLs and summary fields, then falls back when the preview fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
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

    render(<MemoriesTimeline />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const cover = screen.getByRole("img", { name: "Cover for Our picnic" });
    expect(cover).toHaveAttribute("src", "https://storage.example/signed-cover");
    expect(screen.getByText("A sunny afternoon together")).toBeInTheDocument();
    expect(screen.getByText("The park")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-extension-region]")).toHaveLength(3);

    fireEvent.error(cover);
    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
    expect(screen.queryByText("private-space")).not.toBeInTheDocument();
  });

  it("renders an accessible fallback when the server omits a cover URL", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ cursorReset: false, memories: [memory], nextCursor: null }),
    );

    render(<MemoriesTimeline />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("img", { name: "No cover photo available" })).toBeInTheDocument();
  });
});
