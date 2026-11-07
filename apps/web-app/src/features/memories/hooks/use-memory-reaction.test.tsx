import type { MemoryReactionSummary } from "@leonly/utils/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMemoryReaction } from "./use-memory-reaction";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/lib/axios/api", () => ({
  api: { get: mocks.get, post: mocks.post },
  isAxiosError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "response" in error),
}));

const empty: MemoryReactionSummary = {
  counts: { heart: 0, laugh: 0, cry: 0, star: 0 },
  currentReaction: null,
  members: { heart: [], laugh: [], cry: [], star: [] },
};
const heart = {
  counts: { ...empty.counts, heart: 1 },
  currentReaction: "heart" as const,
  members: { ...empty.members, heart: ["Alex"] },
};
const envelope = (data: unknown) => ({ data: { ok: true, data, error: [], message: "OK" } });

describe("useMemoryReaction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.get.mockResolvedValue(envelope(heart));
    mocks.post.mockResolvedValue(envelope(heart));
  });

  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderHook(({ initial }) => useMemoryReaction("memory", initial), {
      initialProps: { initial: empty as MemoryReactionSummary },
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
  }

  it("seeds detail without a GET and confirms a toggle before refreshing", async () => {
    const { result } = setup();
    expect(result.current.summary).toEqual(empty);
    expect(mocks.get).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.react("heart");
    });
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith("/memories/memory/reactions", {
      reactionType: "heart",
    });
    expect(mocks.get).toHaveBeenCalledWith("/memories/memory/reactions");
    expect(result.current.summary).toEqual(heart);
  });

  it("reconciles a lost POST response with GET without retrying", async () => {
    mocks.post.mockRejectedValue(new Error("network"));
    const { result } = setup();
    await act(async () => {
      await result.current.react("heart");
    });
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.get).toHaveBeenCalledOnce();
    expect(result.current.summary).toEqual(heart);
    expect(result.current.failed).toBe(true);
  });

  it("handles unavailable memory and failed refresh without inventing data", async () => {
    mocks.post.mockRejectedValue({ response: { status: 404 } });
    mocks.get.mockRejectedValue(new Error("offline"));
    const { result } = setup();
    await act(async () => {
      await result.current.react("heart");
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(result.current.summary).toEqual(empty);
    expect(result.current.failed).toBe(true);
    expect(result.current.unavailable).toBe(true);
  });

  it("routes expired sessions to authentication", async () => {
    mocks.post.mockRejectedValue({ response: { status: 401 } });
    const { result } = setup();
    await act(async () => {
      await result.current.react("heart");
    });
    expect(mocks.push).toHaveBeenCalledWith("/auth");
    expect(mocks.post).toHaveBeenCalledOnce();
  });

  it("accepts a later detail summary", async () => {
    const { result, rerender } = setup();
    rerender({ initial: heart });
    await waitFor(() => expect(result.current.summary).toEqual(heart));
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("does not overwrite a confirmed summary when a control remounts with older data", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = renderHook(() => useMemoryReaction("memory", empty), { wrapper });
    await act(async () => {
      await first.result.current.react("heart");
    });
    first.unmount();
    const second = renderHook(() => useMemoryReaction("memory", empty), { wrapper });
    expect(second.result.current.summary).toEqual(heart);
  });
});
