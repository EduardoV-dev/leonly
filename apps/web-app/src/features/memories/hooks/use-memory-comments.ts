import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
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
  const response = await fetch(`/api/memories/${memoryId}/comments${query}`);
  const payload = (await response.json().catch(() => null)) as
    | { code?: "failed" | "unavailable"; error?: string }
    | MemoryCommentPage
    | null;

  if (!response.ok) {
    const errorPayload = payload && "error" in payload ? payload : null;
    throw new MemoryCommentsError(
      errorPayload?.code ?? (response.status === 404 ? "unavailable" : "failed"),
      errorPayload?.error ?? "failed",
    );
  }

  return payload as MemoryCommentPage;
}

export function flattenCommentPages(data: MemoryCommentsData | undefined): MemoryComment[] {
  const seen = new Set<string>();
  const comments: MemoryComment[] = [];

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
