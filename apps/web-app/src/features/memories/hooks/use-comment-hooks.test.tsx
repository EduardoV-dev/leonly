import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/axios/api";
import { getCommentDraftState, useCommentComposer } from "./use-comment-composer";
import { useCommentDeletion } from "./use-comment-deletion";
import { useMemoryComments } from "./use-memory-comments";

vi.mock("@/lib/axios/api", () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const memoryId = "01900000-0000-7000-8000-000000000004";
const comment = {
  deletedAt: null,
  id: "01900000-0000-7000-8000-000000000005",
  memoryId,
  parentCommentId: null,
  replyCount: 0,
  body: "Hello",
  createdAt: "2026-09-05T16:00:00.123456Z",
  updatedAt: "2026-09-05T16:00:00.123456Z",
  authorDisplayName: "Leo",
  authorAvatarUrl: null,
  isAuthor: true,
};
const success = (data: unknown) => ({
  status: 200,
  data: { ok: true, data, error: [], message: "" },
});

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("comment state hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates normalized Unicode drafts", () => {
    expect(getCommentDraftState("  ").error).toBe("required");
    expect(getCommentDraftState("🌷".repeat(1001)).error).toBe("overLimit");
  });

  it("loads the current API envelope", async () => {
    vi.mocked(api.get).mockResolvedValue(
      success({ data: [comment], meta: { nextCursor: null, resetCursor: false } }),
    );
    const { result } = renderHook(() => useMemoryComments(memoryId), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.comments).toEqual([comment]));
    expect(api.get).toHaveBeenCalledWith(`/memories/${memoryId}/comments`, expect.any(Object));
  });

  it("discards stale pages and restarts without a cursor", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(
        success({ data: [comment], meta: { nextCursor: "next", resetCursor: false } }),
      )
      .mockResolvedValueOnce(success({ data: [], meta: { nextCursor: null, resetCursor: true } }))
      .mockResolvedValueOnce(
        success({
          data: [{ ...comment, id: "01900000-0000-7000-8000-000000000006" }],
          meta: { nextCursor: null, resetCursor: false },
        }),
      );
    const { result } = renderHook(() => useMemoryComments(memoryId), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() =>
      expect(result.current.comments.map(({ id }) => id)).toEqual([
        "01900000-0000-7000-8000-000000000006",
      ]),
    );
    expect(vi.mocked(api.get).mock.calls[2][0]).toBe(`/memories/${memoryId}/comments`);
  });

  it("preserves the draft on a retry without sending an idempotency key", async () => {
    vi.mocked(api.post)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(success(comment));
    const { result } = renderHook(() => useCommentComposer({ memoryId }), {
      wrapper: createWrapper(),
    });
    act(() => result.current.updateDraft("Hello"));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.draft).toBe("Hello");
    await act(async () => {
      await result.current.submit();
    });
    const first = vi.mocked(api.post).mock.calls[0][1];
    const second = vi.mocked(api.post).mock.calls[1][1];
    expect(first).toEqual(second);
    expect(first).toEqual({ body: "Hello", parentCommentId: undefined });
    expect(result.current.draft).toBe("");
  });

  it("uses the full revision for deletion", async () => {
    vi.mocked(api.delete).mockResolvedValue(success({ deletedCommentId: comment.id }));
    const { result } = renderHook(() => useCommentDeletion({ comment }), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.remove();
    });
    expect(api.delete).toHaveBeenCalledWith(
      `/memories/${memoryId}/comments/${comment.id}`,
      expect.objectContaining({ data: { lastKnownUpdatedAt: comment.updatedAt } }),
    );
    expect(result.current.outcome).toBe("success");
  });

  it("offers retry when an uncertain deletion cannot be reconciled", async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error("connection lost"));
    const { result } = renderHook(() => useCommentDeletion({ comment }), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.remove();
    });
    expect(result.current.outcome).toBe("failed");
  });
});
