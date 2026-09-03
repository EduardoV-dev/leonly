import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { memoryQueryKeys } from "../../constants/query-keys";
import type { MemoryReactionSummary } from "../../types/memory-reaction";
import { MemoryReactions } from ".";

const refreshMock = vi.fn();
const commentQuery = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

function CommentQueryProbe() {
  useQuery({
    queryFn: commentQuery,
    queryKey: memoryQueryKeys.comments(memoryId),
  });
  return null;
}

function renderReactions(
  reaction: MemoryReactionSummary = {
    counts: { cry: 0, heart: 1, laugh: 0, star: 0 },
    currentReaction: "heart" as const,
    members: { cry: [], heart: ["Alex", "Sam"], laugh: [], star: [] },
  },
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryReactions memoryId={memoryId} reaction={reaction} />
      <CommentQueryProbe />
    </QueryClientProvider>,
  );
}

describe("MemoryReactions", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    refreshMock.mockReset();
    commentQuery.mockReset().mockResolvedValue({ comments: [] });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("opens an icon-only picker and reconciles the optimistic reaction", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          reaction: {
            counts: { cry: 0, heart: 0, laugh: 0, star: 1 },
            currentReaction: "star",
            members: { cry: [], heart: [], laugh: [], star: ["Alex", "Sam"] },
          },
        }),
      ),
    );
    renderReactions();

    fireEvent.click(screen.getByRole("button", { name: /React to this memory/ }));
    const star = screen.getByRole("menuitemradio", { name: "React with Star" });
    fireEvent.click(star);

    await waitFor(() =>
      expect(screen.getByRole("group", { name: "1 reactions" })).toHaveTextContent("⭐"),
    );
    expect(fetch).toHaveBeenCalledWith(`/api/memories/${memoryId}/reactions`, {
      body: JSON.stringify({ reactionType: "star" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(screen.queryByText("Reaction updated.")).not.toBeInTheDocument();
    expect(screen.getByTitle("Alex, Sam")).toBeInTheDocument();
  });

  it("disables choices while pending and restores the confirmed state after failure", async () => {
    let rejectRequest: (reason?: unknown) => void = () => {};
    vi.mocked(fetch).mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );
    renderReactions();

    fireEvent.click(screen.getByRole("button", { name: /React to this memory/ }));
    const laugh = screen.getByRole("menuitemradio", { name: "React with Laugh" });
    fireEvent.click(laugh);

    expect(laugh).toBeDisabled();
    expect(screen.getByRole("button", { name: /React to this memory/ })).toBeDisabled();

    rejectRequest(new Error("network unavailable"));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "We couldn't update your reaction. Try again.",
      ),
    );
    expect(screen.getByRole("menuitemradio", { name: "React with Love" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(laugh).toHaveAttribute("aria-checked", "false");
  });

  it("updates the count optimistically without rendering an unconfirmed reaction", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    renderReactions({
      counts: { cry: 0, heart: 0, laugh: 0, star: 0 },
      currentReaction: null,
      members: { cry: [], heart: [], laugh: [], star: [] },
    });

    fireEvent.click(screen.getByRole("button", { name: "React to this memory" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "React with Star" }));

    const summary = screen.getByRole("group", { name: "1 reactions" });
    expect(summary).toHaveTextContent("1");
    expect(within(summary).queryByText("⭐")).not.toBeInTheDocument();
  });

  it("does not refetch comments after updating a reaction", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          reaction: {
            counts: { cry: 0, heart: 0, laugh: 0, star: 1 },
            currentReaction: "star",
            members: { cry: [], heart: [], laugh: [], star: ["Alex"] },
          },
        }),
      ),
    );
    renderReactions();
    await waitFor(() => expect(commentQuery).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /React to this memory/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "React with Star" }));

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(commentQuery).toHaveBeenCalledTimes(1);
  });
});
