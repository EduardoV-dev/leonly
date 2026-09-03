import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryCommentPage } from "../types/comment";
import { getCommentDraftState, useCommentComposer } from "./use-comment-composer";
import {
  flattenCommentPages,
  type MemoryCommentsData,
  replaceCommentInData,
  selectCommentPages,
  useMemoryComments,
} from "./use-memory-comments";

const MEMORY_ID = "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0";
const FIRST_ID = "64d44f34-c5fe-482a-b65b-f91d0173b7fe";
const SECOND_ID = "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452";

const comment = {
  authorAvatarUrl: null,
  authorDisplayName: "Sarah",
  body: "A note from the garden",
  createdAt: "2026-08-23T10:00:00.000Z",
  id: FIRST_ID,
  isAuthor: true,
  memoryId: MEMORY_ID,
  updatedAt: "2026-08-23T10:00:00.000Z",
  version: 1,
};

function page(comments: (typeof comment)[], nextCursor: string | null = null): MemoryCommentPage {
  return { comments, cursorReset: false, nextCursor };
}

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("comment state hooks", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "11111111-1111-4111-8111-111111111111") });
  });

  it("validates trimmed Unicode drafts and preserves the full over-limit count", () => {
    expect(getCommentDraftState("  \n\t")).toMatchObject({
      count: 4,
      error: "required",
      isValid: false,
    });
    expect(getCommentDraftState("🌷".repeat(1000)).isValid).toBe(true);
    expect(getCommentDraftState("🌷".repeat(1001))).toMatchObject({
      count: 1001,
      error: "overLimit",
      remaining: -1,
      isValid: false,
    });
  });

  it("deduplicates flattened pages and replaces every page after a cursor reset", () => {
    const resetPage = { ...page([comment]), cursorReset: true };
    const data: MemoryCommentsData = {
      pageParams: [null, "next"],
      pages: [page([comment], "next"), page([{ ...comment, id: SECOND_ID }])],
    };

    expect(flattenCommentPages(data).map(({ id }) => id)).toEqual([FIRST_ID, SECOND_ID]);
    expect(selectCommentPages({ ...data, pages: [data.pages[0], resetPage] })).toEqual({
      pageParams: [null],
      pages: [resetPage],
    });
  });

  it("replaces an updated comment in every loaded page by its identity", () => {
    const data: MemoryCommentsData = {
      pageParams: [null, "next"],
      pages: [page([comment], "next"), page([{ ...comment, id: SECOND_ID }, comment])],
    };
    const updated = {
      ...comment,
      body: "Updated note",
      updatedAt: "2026-08-23T11:00:00.000Z",
      version: 2,
    };

    expect(flattenCommentPages(replaceCommentInData(data, updated))).toEqual([
      updated,
      { ...comment, id: SECOND_ID },
    ]);
  });

  it("freezes a pending request and ignores double activation", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCommentComposer(MEMORY_ID), {
      wrapper: wrapperFor(queryClient),
    });

    act(() => result.current.updateDraft("  Keep this draft  "));
    let firstSubmission: Promise<unknown> | undefined;
    await act(async () => {
      firstSubmission = result.current.submit();
      await Promise.resolve();
    });
    expect(result.current.isSubmitting).toBe(true);
    await expect(result.current.submit()).resolves.toBe("ignored");

    await act(async () => {
      resolveRequest(jsonResponse({ comment }));
      await firstSubmission;
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(result.current.draft).toBe("");
  });

  it("reconciles a successful comment once and invalidates the scoped history", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<MemoryCommentsData>(memoryQueryKeys.comments(MEMORY_ID), {
      pageParams: [null],
      pages: [page([comment])],
    });
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ comment }));
    const { result } = renderHook(() => useCommentComposer(MEMORY_ID), {
      wrapper: wrapperFor(queryClient),
    });

    act(() => result.current.updateDraft("A note from the garden"));
    await act(async () => {
      await result.current.submit();
    });

    const cached = queryClient.getQueryData<MemoryCommentsData>(
      memoryQueryKeys.comments(MEMORY_ID),
    );
    expect(flattenCommentPages(cached)).toEqual([comment]);
    expect(result.current.draft).toBe("");
    expect(result.current.lastOutcome).toBe("success");
    expect(fetch).toHaveBeenCalledWith(
      `/api/memories/${MEMORY_ID}/comments`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps the failed draft and key for retry, then creates a new key after editing", async () => {
    const randomUUIDMock = vi
      .fn()
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");
    vi.stubGlobal("crypto", { randomUUID: randomUUIDMock });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ code: "failed" }, 500))
      .mockResolvedValueOnce(jsonResponse({ comment }))
      .mockResolvedValueOnce(jsonResponse({ comment: { ...comment, id: SECOND_ID } }));
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCommentComposer(MEMORY_ID), {
      wrapper: wrapperFor(queryClient),
    });

    act(() => result.current.updateDraft("Try again"));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.draft).toBe("Try again");
    expect(result.current.submitError).toBeTruthy();
    const firstOptions = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const firstKey = (firstOptions.headers as Record<string, string>)["Idempotency-Key"];

    await act(async () => {
      await result.current.submit();
    });
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "Idempotency-Key": firstKey }),
    });

    act(() => result.current.updateDraft("A new logical note"));
    await act(async () => {
      await result.current.submit();
    });
    expect(vi.mocked(fetch).mock.calls[2]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        "Idempotency-Key": "22222222-2222-4222-8222-222222222222",
      }),
    });
  });

  it("removes history and reports an unavailable memory", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(memoryQueryKeys.comments(MEMORY_ID), { stale: true });
    const onUnavailable = vi.fn();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ code: "unavailable" }, 404));
    const { result } = renderHook(() => useCommentComposer(MEMORY_ID, onUnavailable), {
      wrapper: wrapperFor(queryClient),
    });

    act(() => result.current.updateDraft("A note"));
    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
    expect(queryClient.getQueryData(memoryQueryKeys.comments(MEMORY_ID))).toBeUndefined();
  });

  it("replaces query pages with the current first page after a reset response", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ ...page([comment], "next"), cursorReset: false }))
      .mockResolvedValueOnce(
        jsonResponse({
          comments: [{ ...comment, id: SECOND_ID }],
          cursorReset: true,
          nextCursor: null,
        }),
      );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMemoryComments(MEMORY_ID), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.cursorReset).toBe(true));
    expect(result.current.comments.map(({ id }) => id)).toEqual([SECOND_ID]);
  });
});
