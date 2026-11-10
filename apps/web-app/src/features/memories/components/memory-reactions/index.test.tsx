import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryReactions } from ".";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/lib/axios/api", () => ({
  api: { get: mocks.get, post: mocks.post },
  isAxiosError: () => false,
}));

const summary = {
  counts: { heart: 1, laugh: 0, cry: 0, star: 0 },
  currentReaction: "heart" as const,
  members: { heart: ["Alex"], laugh: [], cry: [], star: [] },
};
const empty = {
  counts: { heart: 0, laugh: 0, cry: 0, star: 0 },
  currentReaction: null,
  members: { heart: [], laugh: [], cry: [], star: [] },
};

describe("MemoryReactions", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage("en");
    mocks.post.mockResolvedValue({ data: { ok: true, data: empty } });
    mocks.get.mockResolvedValue({ data: { ok: true, data: empty } });
  });

  it("shows initial selection and names, then reconciles removal", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryReactions memoryId="memory" reaction={summary} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /react to this memory/i }));
    const heart = screen.getByRole("button", { name: "React with Love" });
    expect(heart).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(heart);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Reaction updated."));
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledWith("/memories/memory/reactions", {
      reactionType: "heart",
    });
    expect(mocks.get).toHaveBeenCalledOnce();
  });

  it("supports keyboard escape and disables choices while a toggle is pending", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.post.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryReactions memoryId="memory" reaction={empty} />
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole("button", { name: /react to this memory/i });
    trigger.focus();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "React with Love" })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "React with Love" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "React with Love" })).toBeDisabled(),
    );
    finish({ data: { ok: true, data: summary } });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Reaction updated."));
  });

  it("adds and changes the selected reaction using authoritative summaries", async () => {
    const laugh = {
      counts: { ...empty.counts, laugh: 1 },
      currentReaction: "laugh",
      members: { ...empty.members, laugh: ["Alex"] },
    };
    mocks.post
      .mockResolvedValueOnce({ data: { ok: true, data: summary } })
      .mockResolvedValueOnce({ data: { ok: true, data: laugh } });
    mocks.get
      .mockResolvedValueOnce({ data: { ok: true, data: summary } })
      .mockResolvedValueOnce({ data: { ok: true, data: laugh } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryReactions memoryId="memory" reaction={empty} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /react to this memory/i }));
    fireEvent.click(screen.getByRole("button", { name: "React with Love" }));
    await waitFor(() => expect(screen.getByText("Alex")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /react to this memory/i }));
    fireEvent.click(screen.getByRole("button", { name: "React with Laugh" }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: /react to this memory/i }));
    expect(screen.getByRole("button", { name: "React with Laugh" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps the confirmed selection while reconciliation is pending", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.post.mockResolvedValue({ data: { ok: true, data: summary } });
    mocks.get.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryReactions memoryId="memory" reaction={empty} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /react to this memory/i }));
    fireEvent.click(screen.getByRole("button", { name: "React with Love" }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "React with Love" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    finish({ data: { ok: true, data: summary } });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Reaction updated."));
  });

  it("restores the confirmed selection when an update and refresh fail", async () => {
    mocks.post.mockRejectedValue(new Error("offline"));
    mocks.get.mockRejectedValue(new Error("offline"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryReactions memoryId="memory" reaction={summary} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /react to this memory/i }));
    fireEvent.click(screen.getByRole("button", { name: "React with Laugh" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("We couldn't update your reaction"),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "React with Love" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "React with Laugh" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});
