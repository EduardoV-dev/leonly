import type { ApiResponse, CommentPage, RootComment } from "@leonly/utils/contracts";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/axios/api";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryComment, MemoryCommentPage } from "../types/comment";

export type MemoryCommentsData = InfiniteData<MemoryCommentPage, string | null>;
type CommentQueryKey = ReturnType<typeof memoryQueryKeys.comments>;

export class MemoryCommentsError extends Error {
  constructor(
    readonly code: "failed" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

async function fetchCommentPage(
  memoryId: string,
  cursor: string | null,
): Promise<MemoryCommentPage> {
  const searchParams = new URLSearchParams();
  if (cursor) searchParams.set("cursor", cursor);

  const query = searchParams.size > 0 ? `?${searchParams}` : "";
  const response = await api.get<ApiResponse<CommentPage<RootComment>>>(
    `/memories/${memoryId}/comments${query}`,
    { validateStatus: () => true },
  );
  if (!response.data.ok) {
    const code = response.status === 404 ? "unavailable" : "failed";
    throw new MemoryCommentsError(code, code);
  }
  let page = response.data.data;
  const cursorReset = page.meta.resetCursor;
  if (cursorReset) {
    const restarted = await api.get<ApiResponse<CommentPage<RootComment>>>(
      `/memories/${memoryId}/comments`,
      { validateStatus: () => true },
    );
    if (!restarted.data.ok) throw new MemoryCommentsError("failed", "failed");
    page = restarted.data.data;
  }
  return { comments: page.data, cursorReset, nextCursor: page.meta.nextCursor };
}

export function flattenCommentPages(data: MemoryCommentsData | undefined): RootComment[] {
  const seen = new Set<string>();
  const comments: RootComment[] = [];

  for (const page of data?.pages ?? []) {
    for (const comment of page.comments) {
      if (seen.has(comment.id)) continue;
      seen.add(comment.id);
      comments.push(comment);
    }
  }

  return comments;
}

export function selectCommentPages(data: MemoryCommentsData): MemoryCommentsData {
  let resetIndex = -1;
  data.pages.forEach((page, index) => {
    if (page.cursorReset) resetIndex = index;
  });
  if (resetIndex < 0) return data;

  return {
    pageParams: [null, ...data.pageParams.slice(resetIndex + 1)],
    pages: data.pages.slice(resetIndex),
  };
}

export function prependCommentToData(
  data: MemoryCommentsData | undefined,
  comment: MemoryComment,
): MemoryCommentsData {
  if (!data) {
    return {
      pageParams: [null],
      pages: [{ comments: [comment], cursorReset: false, nextCursor: null }],
    };
  }

  return {
    pageParams: data.pageParams,
    pages: data.pages.map((page, index) => ({
      ...page,
      comments:
        index === 0
          ? [comment, ...page.comments.filter((entry) => entry.id !== comment.id)]
          : page.comments.filter((entry) => entry.id !== comment.id),
    })),
  };
}

export function replaceCommentInData(
  data: MemoryCommentsData | undefined,
  comment: MemoryComment,
): MemoryCommentsData | undefined {
  return (
    data && {
      pageParams: data.pageParams,
      pages: data.pages.map((page) => ({
        ...page,
        comments: page.comments.map((entry) => (entry.id === comment.id ? comment : entry)),
      })),
    }
  );
}

export function removeCommentFromData(
  data: MemoryCommentsData | undefined,
  commentId: string,
): MemoryCommentsData | undefined {
  return (
    data && {
      pageParams: data.pageParams,
      pages: data.pages.map((page) => ({
        ...page,
        comments: page.comments.filter((comment) => comment.id !== commentId),
      })),
    }
  );
}

export function useMemoryComments(memoryId: string, onUnavailable?: () => void) {
  const query = useInfiniteQuery<
    MemoryCommentPage,
    Error,
    MemoryCommentsData,
    CommentQueryKey,
    string | null
  >({
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchCommentPage(memoryId, pageParam),
    queryKey: memoryQueryKeys.comments(memoryId),
    retry: false,
    select: selectCommentPages,
    staleTime: 0,
  });

  useEffect(() => {
    if (query.error instanceof MemoryCommentsError && query.error.code === "unavailable") {
      onUnavailable?.();
    }
  }, [onUnavailable, query.error]);

  return {
    ...query,
    comments: flattenCommentPages(query.data),
    cursorReset: query.data?.pages[0]?.cursorReset ?? false,
    loadedPageCount: query.data?.pages.length ?? 0,
  };
}
