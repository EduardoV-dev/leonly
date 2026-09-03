import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryReactions } from ".";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const memoryId = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";

function renderReactions() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryReactions
        memoryId={memoryId}
        reaction={{
          counts: { cry: 0, heart: 1, laugh: 0, star: 0 },
          currentReaction: "heart",
          members: { cry: [], heart: ["Alex", "Sam"], laugh: [], star: [] },
        }}
      />
    </QueryClientProvider>,
  );
}

describe("MemoryReactions", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    refreshMock.mockReset();
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
});
